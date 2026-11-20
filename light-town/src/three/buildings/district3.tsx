import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { WARM, CANDY, ArchedDoor, ArchedWindow, PortholeWindow, SquareWindow } from './parts';
import type { BuildingBodyProps } from './parts';

/** 月湾港三座建筑（BUILDINGS 9-11）。 */

/** 扫过海面的灯束：两道对称的光锥绕塔顶旋转（满灯后出现；reduce-motion 静止常亮）。 */
function LightBeam({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !g.current) return;
    g.current.rotation.y += delta * 0.55;
  });
  return (
    <group ref={g} position={position}>
      {[0, 1].map((i) => (
        <mesh key={i} position={[2.6, 0, 0]} rotation-z={Math.PI / 2}>
          <coneGeometry args={[0.55, 5.2, 12, 1, true]} />
          <meshBasicMaterial color={WARM.light} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

export function Lighthouse({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  const lantern = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (!lantern.current) return;
    const target = stage >= 6 ? 3.2 : 0.5;
    lantern.current.emissiveIntensity += (target - lantern.current.emissiveIntensity) * (reducedMotion ? 1 : 0.12);
  });
  return (
    <group>
      {/* 糖果条纹收细塔身：5 段奶油/珊瑚相间 */}
      {[0, 1, 2, 3, 4].map((i) => {
        const rTop = 0.85 - (i + 1) * 0.062;
        const rBottom = 0.85 - i * 0.062;
        return (
          <mesh key={i} position={[0, 0.31 + i * 0.62, 0]}>
            <cylinderGeometry args={[rTop, rBottom, 0.62, 18]} />
            <meshStandardMaterial color={i % 2 === 0 ? CANDY.cream : CANDY.coral} roughness={0.95} />
          </mesh>
        );
      })}
      {/* 观景平台 + 栏杆 */}
      <mesh position={[0, 3.12, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.1, 18]} />
        <meshStandardMaterial color={CANDY.teal} roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.52, 3.32, Math.cos(a) * 0.52]}>
            <cylinderGeometry args={[0.018, 0.018, 0.28, 6]} />
            <meshStandardMaterial color="#93A6DC" roughness={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0, 3.46, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.52, 0.025, 6, 20]} />
        <meshStandardMaterial color="#93A6DC" roughness={0.7} />
      </mesh>
      {/* 灯室：玻璃罩 + 光核 + 顶帽 */}
      <mesh position={[0, 3.72, 0]}>
        <cylinderGeometry args={[0.4, 0.42, 0.5, 14]} />
        <meshStandardMaterial color={CANDY.mint} roughness={0.15} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 3.72, 0]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial ref={lantern} color={highlighted ? '#FFF0C2' : WARM.core} emissive={WARM.light} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 4.18, 0]}>
        <coneGeometry args={[0.5, 0.42, 14]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.46, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.3} />
      </mesh>
      {stage >= 6 && <LightBeam position={[0, 3.72, 0]} reducedMotion={reducedMotion} />}
      {/* 6 个舷窗：正面 2 列 × 3 行（随塔身收细内移） */}
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => {
          const x = col === 0 ? -0.24 : 0.24;
          const y = 0.75 + row * 0.62;
          const r = 0.85 - (y / 3.1) * 0.31 + 0.025;
          const z = Math.sqrt(Math.max(0.01, r * r - x * x)) + 0.02;
          return (
            <group key={`${row}${col}`} position={[x, y, z]}>
              <PortholeWindow lit={litCount(row * 2 + col)} reducedMotion={reducedMotion} />
            </group>
          );
        }),
      )}
      <ArchedDoor width={0.56} height={0.6} color={CANDY.teal} position={[0, 0.01, 0.88]} />
      {/* 塔基礁石 */}
      {[[-0.95, 0.35, 0.42], [0.9, 0.28, 0.3], [0.1, 0.22, -0.95]].map(([x, s, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} scale={[s, s * 0.55, s]}>
          <sphereGeometry args={[0.55, 10, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#8D87A8' : '#7C7699'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** 浮动的小船：船身 + 小舱，随波轻轻起伏（reduce-motion 静止）。 */
function LittleBoat({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const t = state.clock.elapsedTime;
    g.current.position.y = position[1] + Math.sin(t * 1.4) * 0.05;
    g.current.rotation.z = Math.sin(t * 1.1) * 0.06;
    g.current.rotation.x = Math.sin(t * 0.9 + 1) * 0.04;
  });
  return (
    <group ref={g} position={position}>
      <mesh scale={[1.15, 0.5, 0.55]}>
        <sphereGeometry args={[0.5, 14, 12]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      {/* 舱顶 */}
      <mesh position={[0.08, 0.28, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.42]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.5, 0]}>
        <boxGeometry args={[0.56, 0.06, 0.48]} />
        <meshStandardMaterial color={CANDY.teal} roughness={0.85} />
      </mesh>
      {/* 桅杆 + 小旗 */}
      <mesh position={[-0.15, 0.55, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
        <meshStandardMaterial color={CANDY.wood} roughness={0.9} />
      </mesh>
      <mesh position={[-0.05, 0.82, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.09, 0.18, 3]} />
        <meshStandardMaterial color={CANDY.butter} roughness={0.75} side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  );
}

export function Boathouse({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
    <group rotation-z={-0.02}>
      {/* 高脚桩 + 屋身 + 桶形顶 */}
      {[[-0.95, -0.7], [0.95, -0.7], [-0.95, 0.7], [0.95, 0.7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <cylinderGeometry args={[0.07, 0.09, 0.7, 8]} />
          <meshStandardMaterial color={CANDY.wood} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[2.55, 0.14, 2.05]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.4, 1.25, 1.9]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.mint} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.98, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.62, 0.62, 2.5, 18]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.96, 0.95]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.6, 0.05, 8, 22]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.85} />
      </mesh>
      {/* 窗：正面方窗 3 + 山墙舷窗 2 + 阁楼圆窗 1（共 6） */}
      {[-0.9, -0.4, 0.05].map((x, i) => (
        <group key={i} position={[x, 1.25, 0.97]}>
          <SquareWindow lit={litCount(i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={`s${i}`} position={[(i === 0 ? -1 : 1) * 1.21, 1.3, 0.25]} rotation-y={(i === 0 ? -1 : 1) * Math.PI / 2}>
          <PortholeWindow lit={litCount(3 + i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      <group position={[-0.55, 1.78, 0.95]}>
        <PortholeWindow lit={litCount(5)} reducedMotion={reducedMotion} />
      </group>
      <ArchedDoor width={0.6} height={0.6} color={CANDY.teal} position={[0.88, 0.81, 0.97]} />
      {/* 门前码头：跳板 ×3 + 系船柱 + 救生圈 */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.55, 0.42, 1.35 + i * 0.55]}>
          <boxGeometry args={[1.3, 0.06, 0.42]} />
          <meshStandardMaterial color={CANDY.wood} roughness={0.95} />
        </mesh>
      ))}
      {[1.9, 2.9].map((z) => (
        <mesh key={z} position={[1.35, 0.28, z]}>
          <cylinderGeometry args={[0.05, 0.06, 0.35, 8]} />
          <meshStandardMaterial color={CANDY.wood} roughness={0.95} />
        </mesh>
      ))}
      <group position={[1.35, 0.62, 2.9]}>
        <mesh>
          <torusGeometry args={[0.14, 0.045, 8, 18]} />
          <meshStandardMaterial color={CANDY.cream} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation-y={0}>
          <boxGeometry args={[0.04, 0.3, 0.03]} />
          <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
        </mesh>
      </group>
      {/* 泊在码头旁的小船 */}
      <LittleBoat position={[2.0, 0.12, 3.1]} reducedMotion={reducedMotion} />
    </group>
  );
}

/** 檐口灯链：拱形垂弧线上挂一排小灯泡，按灯档逐个亮。 */
function StringLights({ from, to, height, litCount, reducedMotion }: {
  from: [number, number];
  to: [number, number];
  height: number;
  litCount: (i: number) => boolean;
  reducedMotion?: boolean;
}) {
  const curve = useRef<THREE.QuadraticBezierCurve3 | null>(null);
  const bulbs = useRef<(THREE.Mesh | null)[]>([]);
  const pts = useRef<[number, number, number][]>([]);
  if (!curve.current) {
    const midY = height - 0.3;
    curve.current = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from[0], height, from[1]),
      new THREE.Vector3((from[0] + to[0]) / 2, midY, (from[1] + to[1]) / 2),
      new THREE.Vector3(to[0], height, to[1]),
    );
    pts.current = curve.current.getPoints(9).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }
  useFrame(() => {
    if (reducedMotion) return;
    bulbs.current.forEach((b, i) => {
      const m = b?.material as THREE.MeshStandardMaterial | undefined;
      if (!m) return;
      const target = litCount(i) ? 2.2 + Math.sin(i * 1.7 + performance.now() / 650) * 0.35 : 0;
      m.emissiveIntensity += (target - m.emissiveIntensity) * 0.18;
    });
  });
  return (
    <group>
      <Line points={pts.current} color="#F5E7C8" lineWidth={1} />
      {pts.current.map((p, i) => (
        <mesh key={i} position={p} ref={(el) => { bulbs.current[i] = el; }}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#FFF7E0" emissive={WARM.light} emissiveIntensity={0} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** 满灯后的庆祝星芒：屋顶上空几颗小星星轻轻闪。 */
function CelebrationStars({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const t = state.clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      c.scale.setScalar(0.8 + Math.sin(t * 2.4 + i * 1.1) * 0.35);
    });
  });
  const spots: [number, number, number][] = [[-1.1, 0.2, 0.3], [0, 0.5, -0.2], [1.0, 0.25, 0.25], [-0.4, 0.65, 0.1], [0.6, 0.75, -0.1]];
  return (
    <group ref={g} position={position}>
      {spots.map((p, i) => (
        <mesh key={i} position={p} rotation-y={i * 0.7}>
          <octahedronGeometry args={[0.07]} />
          <meshStandardMaterial color={WARM.core} emissive={WARM.light} emissiveIntensity={1.6} />
        </mesh>
      ))}
    </group>
  );
}

export function FestivalHall({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
    <group>
      {/* 宽阔大厅 + 底裙 */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[3.8, 0.2, 2.6]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[3.6, 1.7, 2.4]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.coral} roughness={0.95} />
      </mesh>
      {/* 桶形大顶 + 中央小圆亭 + 洋葱顶 */}
      <mesh position={[0, 1.9, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.95, 0.95, 3.75, 20]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.88, 1.2]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.93, 0.055, 8, 24]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.85, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.5, 14]} />
        <meshStandardMaterial color={CANDY.lilac} roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.52, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={CANDY.butter} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 3.62, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.3} />
      </mesh>
      {/* 两角小圆塔 */}
      {[1.82, -1.82].map((x) => (
        <group key={x} position={[x, 0, 1.0]}>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.32, 0.36, 2.3, 12]} />
            <meshStandardMaterial color={CANDY.cream} roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <coneGeometry args={[0.42, 0.55, 12]} />
            <meshStandardMaterial color={CANDY.teal} roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.9, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.0} />
          </mesh>
        </group>
      ))}
      {/* 6 个拱窗一排 + 大门 */}
      {[-1.45, -0.87, -0.42, 0.42, 0.87, 1.45].map((x, i) => (
        <group key={x} position={[x, 1.05, 1.22]}>
          <ArchedWindow lit={litCount(i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      <ArchedDoor width={0.6} height={0.66} color={CANDY.wood} position={[0, 0.01, 1.22]} />
      {/* 檐口灯链：随灯档逐个点亮 */}
      <StringLights from={[-1.82, 1.0]} to={[1.82, 1.0]} height={2.75} litCount={litCount} reducedMotion={reducedMotion} />
      {stage >= 6 && <CelebrationStars position={[0, 3.9, 0]} reducedMotion={reducedMotion} />}
    </group>
  );
}
