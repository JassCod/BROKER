import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useSpring } from 'framer-motion';

// 3D tilt card with a moving specular glare.
export function Tilt({ children, className = '', max = 10, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const onLeave = () => {
    ref.current.style.transform = 'perspective(900px) rotateX(0) rotateY(0)';
  };
  return (
    <Tag ref={ref} className={`glass tilt ${className}`} onMouseMove={onMove} onMouseLeave={onLeave} {...rest}>
      <span className="glare" />
      {children}
    </Tag>
  );
}

// Button that leans toward the cursor.
export function Magnetic({ children, strength = 0.3 }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    ref.current.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };
  const onLeave = () => (ref.current.style.transform = 'translate(0,0)');
  return (
    <span ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: 'inline-flex', transition: 'transform .25s ease-out' }}>
      {children}
    </span>
  );
}

export function Reveal({ children, delay = 0, y = 40, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, rotateX: 12, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Splits a heading into words that rise in one after another.
export function SplitText({ text, className, delay = 0 }) {
  return (
    <span className={className} aria-label={text} style={{ display: 'inline' }}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '110%', rotate: 6 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Counter({ to, suffix = '', prefix = '', duration = 1600 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  const shown = to % 1 ? n.toFixed(1) : Math.round(n).toLocaleString('en-AU');
  return (
    <span ref={ref}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div className="progress-bar" style={{ scaleX }} />;
}

// Background layers: drifting aurora, film grain, and a cursor spotlight.
export function Ambient() {
  useEffect(() => {
    const onMove = (e) => {
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return (
    <>
      <div className="aurora">
        <span />
        <span />
        <span />
      </div>
      <div className="grain" />
      <div className="spotlight" />
    </>
  );
}

export const Stars = ({ value }) => (
  <span className="stars" aria-label={`${value} out of 5`}>
    {'★★★★★'.slice(0, Math.round(value))}
    <span style={{ opacity: 0.25 }}>{'★★★★★'.slice(Math.round(value))}</span>
  </span>
);
