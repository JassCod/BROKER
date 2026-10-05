import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, Float, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Holographic low-poly prime mover towing two trailers (a B-double).
function Box({ args, position, color = '#22d3ee', opacity = 0.12 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} transparent opacity={opacity} emissive={color} emissiveIntensity={0.4} />
      <Edges color={color} toneMapped={false} />
    </mesh>
  );
}

function Wheel({ position }) {
  const ref = useRef();
  useFrame((_, dt) => (ref.current.rotation.y += dt * 6));
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.22, 0.22, 0.16, 18]} />
      <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      <Edges color="#ff8a3d" toneMapped={false} />
    </mesh>
  );
}

function BDouble() {
  const group = useRef();
  useFrame(({ clock }) => {
    group.current.rotation.y = -0.6 + Math.sin(clock.elapsedTime * 0.35) * 0.5;
  });
  const wheels = (xs) =>
    xs.flatMap((x) => [
      <Wheel key={`${x}l`} position={[x, 0.22, 0.55]} />,
      <Wheel key={`${x}r`} position={[x, 0.22, -0.55]} />,
    ]);
  return (
    <group ref={group} position={[0.6, -0.6, 0]} scale={0.62}>
      {/* prime mover */}
      <Box args={[1.1, 1.3, 1.2]} position={[3.6, 1.15, 0]} color="#ff8a3d" opacity={0.2} />
      <Box args={[0.6, 0.7, 1.15]} position={[4.45, 0.8, 0]} color="#ff8a3d" opacity={0.16} />
      <Box args={[0.15, 1.2, 0.15]} position={[3.05, 2.2, 0.45]} color="#ffd166" opacity={0.4} />
      {/* lead trailer */}
      <Box args={[3.0, 1.5, 1.25]} position={[1.4, 1.35, 0]} />
      {/* rear trailer */}
      <Box args={[3.8, 1.5, 1.25]} position={[-2.15, 1.35, 0]} color="#a78bfa" />
      {wheels([4.4, 3.4, 3.0, 0.8, 0.4, -0.9, -3.0, -3.4, -3.8])}
    </group>
  );
}

export default function TruckScene() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.4, 6.2], fov: 42 }}>
      <color attach="background" args={['#050b1a']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 3]} intensity={20} color="#22d3ee" />
      <pointLight position={[-4, 2, -2]} intensity={14} color="#ff8a3d" />
      <Float speed={1.4} rotationIntensity={0.1} floatIntensity={0.4}>
        <BDouble />
      </Float>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
        <planeGeometry args={[30, 30]} />
        <MeshReflectorMaterial blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={18} roughness={0.9} depthScale={1} color="#050b1a" metalness={0.6} mirror={0.6} />
      </mesh>
      <gridHelper args={[30, 60, '#1e3a8a', '#0f1d3d']} position={[0, -0.6, 0]} />
      <EffectComposer>
        <Bloom intensity={1.3} luminanceThreshold={0.2} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
