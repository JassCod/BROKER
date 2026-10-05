import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Sparkles, Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MAINLAND, TASMANIA, project, pointInPolygon } from './geo.js';
import { CITIES, cityByName } from '../lib/au.js';

const DEPTH = 0.12;
const TOP = DEPTH + 0.02;

const DEFAULT_ROUTES = [
  ['Sydney', 'Melbourne'], ['Melbourne', 'Adelaide'], ['Adelaide', 'Perth'], ['Brisbane', 'Sydney'],
  ['Brisbane', 'Townsville'], ['Townsville', 'Cairns'], ['Darwin', 'Alice Springs'], ['Alice Springs', 'Port Augusta'],
  ['Perth', 'Port Hedland'], ['Melbourne', 'Hobart'], ['Mount Isa', 'Townsville'], ['Perth', 'Kalgoorlie'],
  ['Sydney', 'Dubbo'], ['Darwin', 'Broome'],
].map(([a, b], i) => ({ from: a, to: b, color: i % 3 === 0 ? '#ff8a3d' : i % 3 === 1 ? '#22d3ee' : '#a78bfa' }));

const toV2 = (poly) => poly.map(([lon, lat]) => new THREE.Vector2(...project(lon, lat)));
const cityPos = (c, z = TOP) => {
  const [x, y] = project(c.lon, c.lat);
  return new THREE.Vector3(x, y, z);
};

function makeCurve(a, b) {
  const p0 = cityPos(a);
  const p2 = cityPos(b);
  const mid = p0.clone().lerp(p2, 0.5);
  mid.z = TOP + 0.25 + p0.distanceTo(p2) * 0.22;
  return new THREE.QuadraticBezierCurve3(p0, mid, p2);
}

function Land() {
  const geometry = useMemo(() => {
    const shapes = [MAINLAND, TASMANIA].map((p) => new THREE.Shape(toV2(p)));
    return new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  }, []);
  const outlines = useMemo(
    () => [MAINLAND, TASMANIA].map((p) => [...toV2(p), toV2(p)[0]].map((v) => [v.x, v.y, TOP + 0.002])),
    [],
  );
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#0a1530" emissive="#07102a" metalness={0.55} roughness={0.35} />
      </mesh>
      {outlines.map((pts, i) => (
        <Line key={i} points={pts} color="#38e1ff" lineWidth={1.6} toneMapped={false} />
      ))}
      {outlines.map((pts, i) => (
        <Line key={`b${i}`} points={pts.map(([x, y]) => [x, y, -0.02])} color="#ff7a18" lineWidth={1} transparent opacity={0.55} toneMapped={false} />
      ))}
    </group>
  );
}

// Dot-matrix surface with a radial pulse travelling out from the centre.
function DotField() {
  const ref = useRef();
  const geometry = useMemo(() => {
    const polys = [MAINLAND, TASMANIA].map((p) => p.map(([lon, lat]) => project(lon, lat)));
    const pts = [];
    const step = 0.065;
    for (let x = -3.2; x <= 3.2; x += step) {
      for (let y = -2.6; y <= 2.6; y += step) {
        if (polys.some((poly) => pointInPolygon([x, y], poly))) pts.push(x, y, TOP + 0.004);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
        vertexShader: `
          uniform float uTime; uniform float uPixel; varying float vGlow;
          void main(){
            float d = length(position.xy);
            vGlow = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(d * 5.0 - uTime * 2.2), 6.0);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.2 + vGlow * 2.6) * uPixel * (6.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying float vGlow;
          void main(){
            float r = length(gl_PointCoord - 0.5);
            if (r > 0.5) discard;
            vec3 col = mix(vec3(0.15,0.35,0.9), vec3(0.3,0.95,1.0), vGlow);
            gl_FragColor = vec4(col * (0.6 + vGlow), (1.0 - r * 2.0) * (0.35 + vGlow * 0.65));
          }`,
      }),
    [],
  );
  useFrame((_, dt) => (material.uniforms.uTime.value += dt));
  return <points ref={ref} geometry={geometry} material={material} />;
}

function CityBeacon({ city, highlight }) {
  const ring = useRef();
  const pos = cityPos(city);
  const h = highlight ? 0.75 : city.hub ? 0.45 : 0.16;
  const color = highlight ? '#ff8a3d' : city.hub ? '#5eead4' : '#60a5fa';
  const offset = useMemo(() => Math.random() * 2, []);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = (clock.elapsedTime * 0.6 + offset) % 1;
    ring.current.scale.setScalar(0.4 + t * 2.4);
    ring.current.material.opacity = (1 - t) * 0.8;
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0, h / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.016, h, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, h]}>
        <sphereGeometry args={[highlight ? 0.045 : 0.026, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {(city.hub || highlight) && (
        <mesh ref={ring} position={[0, 0, 0.005]}>
          <ringGeometry args={[0.05, 0.065, 40]} />
          <meshBasicMaterial color={color} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Packet({ curve, color, speed, offset }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * speed + offset) % 1;
    ref.current.position.copy(curve.getPointAt(t));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.022, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Route({ route }) {
  const a = cityByName(route.from);
  const b = cityByName(route.to);
  const curve = useMemo(() => (a && b ? makeCurve(a, b) : null), [a, b]);
  const offsets = useMemo(() => [Math.random(), Math.random()], []);
  if (!curve) return null;
  const pts = curve.getPoints(64);
  return (
    <group>
      <Line points={pts} color={route.color} lineWidth={1.4} transparent opacity={0.55} toneMapped={false} />
      <Packet curve={curve} color={route.color} speed={0.12} offset={offsets[0]} />
      <Packet curve={curve} color="#ffffff" speed={0.09} offset={offsets[1]} />
    </group>
  );
}

// A single tracked shipment: travelled leg glows, remaining leg is dashed.
function TrackedRoute({ from, to, progress }) {
  const a = cityByName(from);
  const b = cityByName(to);
  const curve = useMemo(() => makeCurve(a, b), [a, b]);
  const truck = useRef();
  const shown = useRef(0);
  const all = curve.getPoints(120);
  useFrame(({ clock }) => {
    shown.current += (progress - shown.current) * 0.05;
    const p = curve.getPointAt(Math.max(0.001, Math.min(1, shown.current)));
    truck.current.position.copy(p);
    truck.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.15);
  });
  const doneIdx = Math.max(2, Math.round(progress * 120));
  return (
    <group>
      <Line points={all} color="#64748b" lineWidth={1.2} dashed dashSize={0.06} gapSize={0.04} transparent opacity={0.6} />
      <Line points={all.slice(0, doneIdx + 1)} color="#ff8a3d" lineWidth={3} toneMapped={false} />
      <group ref={truck}>
        <mesh>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshBasicMaterial color="#ffd166" toneMapped={false} />
        </mesh>
        <pointLight color="#ff8a3d" intensity={3} distance={1.5} />
      </group>
    </group>
  );
}

function Rig({ interactive }) {
  const { camera, pointer } = useThree();
  const base = useMemo(() => camera.position.clone(), [camera]);
  useFrame(() => {
    if (interactive) return;
    camera.position.x += (base.x + pointer.x * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (base.y + pointer.y * 0.5 - camera.position.y) * 0.04;
    camera.lookAt(0, -0.2, 0);
  });
  return null;
}

function Continent({ children, spin }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (spin) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.15) * 0.12;
  });
  return (
    <group rotation={[-1.0, 0, 0]}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

export default function AustraliaScene({ mode = 'hero', track, highlight = [] }) {
  const isTrack = mode === 'track';
  const routes = isTrack ? [] : DEFAULT_ROUTES;
  const hl = new Set(isTrack && track ? [track.from, track.to] : highlight);
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, -0.4, isTrack ? 6.2 : 6.6], fov: 45 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 7, 16]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#9bd8ff" />
      <pointLight position={[-4, -2, 3]} intensity={6} color="#ff7a18" distance={12} />
      <Stars radius={60} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
      <Sparkles count={60} scale={[9, 6, 3]} size={2} speed={0.3} color="#7dd3fc" opacity={0.6} />
      <Continent spin={!isTrack}>
        <Land />
        <DotField />
        {CITIES.filter((c) => c.hub || hl.has(c.name) || !isTrack).map((c) => (
          <CityBeacon key={c.name} city={c} highlight={hl.has(c.name)} />
        ))}
        {routes.map((r) => (
          <Route key={`${r.from}-${r.to}`} route={r} />
        ))}
        {isTrack && track && <TrackedRoute {...track} />}
      </Continent>
      <Rig interactive={isTrack} />
      {isTrack && <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={0.6} maxPolarAngle={1.6} rotateSpeed={0.5} />}
      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.15} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
