import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * 3D interpretation of the ADVANCE triangular symbol: the 16 triangles of the
 * logo's pyramid (rows of 1, 3, 5, 7) as polished metal frames.
 * They assemble when the hero becomes active, follow the pointer, and drift
 * apart as the visitor scrolls.
 */
const S = 1.3; // triangle side
const H = (S * Math.sqrt(3)) / 2;
const ROWS = 4;
const TOP = (ROWS * H) / 2;

interface Tri {
  pos: THREE.Vector3;
  up: boolean;
  scatter: THREE.Vector3;
  spin: THREE.Euler;
  delay: number;
  phase: number;
}

function buildTriangles(): Tri[] {
  const tris: Tri[] = [];
  const rnd = mulberry32(7);
  for (let r = 0; r < ROWS; r++) {
    const yTop = TOP - r * H;
    for (let j = 0; j <= r; j++) {
      const cx = (j - r / 2) * S;
      tris.push(make(cx, yTop - (2 * H) / 3, true));
    }
    for (let j = 0; j < r; j++) {
      const cx = (j - (r - 1) / 2) * S;
      tris.push(make(cx, yTop - H / 3, false));
    }
  }
  function make(x: number, y: number, up: boolean): Tri {
    const dir = new THREE.Vector3(x, y, 0).normalize();
    return {
      pos: new THREE.Vector3(x, y, 0),
      up,
      scatter: new THREE.Vector3(dir.x * 6 + (rnd() - 0.5) * 6, dir.y * 6 + (rnd() - 0.5) * 6, -4 + rnd() * 10),
      spin: new THREE.Euler((rnd() - 0.5) * 6, (rnd() - 0.5) * 6, (rnd() - 0.5) * 4),
      delay: 0.04 * Math.hypot(x, y - TOP) + rnd() * 0.25,
      phase: rnd() * Math.PI * 2,
    };
  }
  return tris;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frameGeometry(up: boolean) {
  const outer = 0.94; // gap between neighbouring triangles, like the logo
  const inner = 0.66; // stroke thickness
  const pts = (k: number) => {
    const s = S * k;
    const h = (s * Math.sqrt(3)) / 2;
    // centred on centroid
    return up
      ? [new THREE.Vector2(0, (2 * h) / 3), new THREE.Vector2(-s / 2, -h / 3), new THREE.Vector2(s / 2, -h / 3)]
      : [new THREE.Vector2(0, (-2 * h) / 3), new THREE.Vector2(s / 2, h / 3), new THREE.Vector2(-s / 2, h / 3)];
  };
  const shape = new THREE.Shape(pts(outer));
  const hole = new THREE.Path(pts(inner).reverse());
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 3, curveSegments: 1 });
  g.translate(0, 0, -0.08);
  return g;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

function Pyramid({ active, reduced, dark }: { active: boolean; reduced: boolean; dark: boolean }) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const tris = useMemo(buildTriangles, []);
  const geoUp = useMemo(() => frameGeometry(true), []);
  const geoDown = useMemo(() => frameGeometry(false), []);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, color: '#e9e9ee', envMapIntensity: 1.25 }),
    [],
  );
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    material.color.set(dark ? '#e9e9ee' : '#3b3b41');
    material.roughness = dark ? 0.16 : 0.22;
  }, [dark, material]);

  useEffect(() => () => {
    geoUp.dispose();
    geoDown.dispose();
    material.dispose();
  }, [geoUp, geoDown, material]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (active && startedAt.current === null) startedAt.current = t;
    const since = startedAt.current === null ? 0 : t - startedAt.current;
    const scroll = Math.min(1.5, window.scrollY / Math.max(1, window.innerHeight));

    tris.forEach((tri, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const p = reduced ? 1 : easeOut(Math.min(1, Math.max(0, (since - tri.delay) / 1.8)));
      const inv = 1 - p;
      const float = reduced ? 0 : Math.sin(t * 0.8 + tri.phase) * 0.05;
      const explode = scroll * 1.6;
      m.position.set(
        tri.pos.x + tri.scatter.x * inv + tri.pos.x * explode * 0.5,
        tri.pos.y + tri.scatter.y * inv + tri.pos.y * explode * 0.35 + float,
        tri.scatter.z * inv + Math.sin(tri.phase) * explode * 1.4,
      );
      m.rotation.set(tri.spin.x * inv + explode * 0.4 * Math.sin(tri.phase), tri.spin.y * inv + explode * 0.6 * Math.cos(tri.phase), tri.spin.z * inv);
      const sc = 0.4 + 0.6 * p;
      m.scale.setScalar(sc);
    });

    if (group.current && !reduced) {
      const targetY = state.pointer.x * 0.35 + Math.sin(t * 0.25) * 0.12 + scroll * 0.6;
      const targetX = -state.pointer.y * 0.2 + scroll * 0.25;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 3, delta);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, delta);
    }
  });

  return (
    <group ref={group} position={[0, 0.1, 0]}>
      {tris.map((tri, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} geometry={tri.up ? geoUp : geoDown} material={material} />
      ))}
    </group>
  );
}

export default function PyramidScene({ active, dark }: { active: boolean; dark: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const mobile = useMemo(() => window.matchMedia('(max-width: 768px)').matches, []);

  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="h-full w-full" aria-hidden="true">
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 1.75]}
        camera={{ position: [0, 0, 9.5], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={reduced ? 'demand' : visible ? 'always' : 'never'}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[4, 6, 6]} intensity={1.2} />
        <Pyramid active={active} reduced={reduced} dark={dark} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 6]} scale={[12, 2, 1]} />
          <Lightformer form="rect" intensity={2} position={[-6, 0, 3]} rotation-y={Math.PI / 2.5} scale={[8, 1.2, 1]} />
          <Lightformer form="rect" intensity={2} position={[6, -1, 3]} rotation-y={-Math.PI / 2.5} scale={[8, 1.2, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, -4, -6]} scale={6} />
          <Lightformer form="rect" intensity={0.8} position={[0, 0, -8]} scale={[20, 20, 1]} color="#8a8a90" />
        </Environment>
      </Canvas>
    </div>
  );
}
