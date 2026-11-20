import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CANDY,
  WARM,
  ArchedDoor,
  ArchedWindow,
  ClockFace,
  FlowerBox,
  PortholeWindow,
  SquareWindow,
} from './parts';
import type { BuildingBodyProps } from './parts';

/** 溪桥街三座建筑（BUILDINGS 3-5）。 */

/** 温室里舒展的小花：细杆 + 圆花头，轻轻开合（reduce-motion 静止）。 */
function GreenhouseFlower({ position, color, phase, reducedMotion }: {
  position: [number, number, number];
  color: string;
  phase: number;
  reducedMotion?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 1.2 + phase) * 0.09;
    g.current.scale.set(s, s, s);
  });
  return (
    <group ref={g} position={position}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.32, 5]} />
        <meshStandardMaterial color="#3E7D6C" />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  );
}

export function FlowerHouse({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
    <group rotation-z={0.03}>
      {/* 底裙 + 奶油主体 */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[2.85, 0.18, 2.25]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.99, 0]}>
        <boxGeometry args={[2.6, 1.45, 2.0]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.cream} roughness={0.95} />
      </mesh>
      {/* 玻璃温室桶顶（半透明薄荷）+ 两端珊瑚端环 + 中段奶油拱肋 */}
      <mesh position={[0, 1.75, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.8, 0.8, 2.75, 20]} />
        <meshStandardMaterial color="#6FD6C0" roughness={0.15} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {[1.375, -1.375].map((x) => (
        <group key={x} position={[x, 1.75, 0]} rotation-y={(x > 0 ? 1 : -1) * Math.PI / 2}>
          <mesh>
            <torusGeometry args={[0.8, 0.05, 8, 24]} />
            <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
          </mesh>
          <PortholeWindow lit={litCount(x > 0 ? 4 : 5)} reducedMotion={reducedMotion} />
        </group>
      ))}
      {[-0.9, 0, 0.9].map((x) => (
        <mesh key={x} position={[x, 1.75, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.81, 0.03, 8, 24]} />
          <meshStandardMaterial color={CANDY.cream} roughness={0.85} />
        </mesh>
      ))}
      {/* 温室里的花（透过玻璃能看到，慢慢舒展） */}
      <GreenhouseFlower position={[-0.55, 1.75, 0]} color={CANDY.pink} phase={0} reducedMotion={reducedMotion} />
      <GreenhouseFlower position={[0.05, 1.75, 0.18]} color={CANDY.butter} phase={2.1} reducedMotion={reducedMotion} />
      <GreenhouseFlower position={[0.6, 1.75, -0.12]} color={CANDY.coral} phase={4.2} reducedMotion={reducedMotion} />
      {/* 正面：拱窗 ×2（带花箱）+ 门；两侧山墙方窗 ×2 */}
      {[0, 1].map((i) => (
        <group key={i} position={[-0.85 + i * 0.6, 0.82, 1.01]}>
          <ArchedWindow lit={litCount(i)} reducedMotion={reducedMotion} />
          <FlowerBox colors={[CANDY.pink, CANDY.butter, CANDY.cream]} />
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={`s${i}`} position={[(i === 0 ? -1 : 1) * 1.31, 0.95, 0.2]} rotation-y={(i === 0 ? -1 : 1) * Math.PI / 2}>
          <SquareWindow lit={litCount(2 + i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      <ArchedDoor width={0.64} height={0.68} color={CANDY.wood} position={[0.85, 0.01, 1.01]} />
      {/* 门口两个花盆 */}
      {[1.45, 1.7].map((z, i) => (
        <group key={z} position={[0.45 + i * 0.5, 0, z]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.11, 0.14, 0.24, 10]} />
            <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color={[CANDY.pink, CANDY.butter][i]} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 摆动的钟摆（钟楼的招牌演出）。 */
function Pendulum({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    g.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.6) * 0.28;
  });
  return (
    <group position={position}>
      <group ref={g}>
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.9, 6]} />
          <meshStandardMaterial color={CANDY.coral} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.95, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.19, 0.19, 0.06, 16]} />
          <meshStandardMaterial color={CANDY.butter} emissive={WARM.light} emissiveIntensity={1.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.95, 0.04]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.19, 0.026, 6, 18]} />
          <meshStandardMaterial color={CANDY.coral} roughness={0.8} />
        </mesh>
      </group>
      <mesh position={[0, -1.08, 0.02]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.23, 0.024, 6, 18]} />
        <meshStandardMaterial color="#53436A" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function ClockTower({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
    <group>
      {/* 底裙 + 塔身（微微收窄错觉靠分段饰带） */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.95, 0.3, 1.95]} />
        <meshStandardMaterial color={CANDY.lilac} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[1.7, 3.3, 1.7]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.cream} roughness={0.95} />
      </mesh>
      {[0.85, 1.75, 2.65].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.78, 0.1, 1.78]} />
          <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
        </mesh>
      ))}
      {/* 四坡尖顶（四棱锥）+ 顶球 */}
      <mesh position={[0, 3.95, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[1.32, 1.2, 4]} />
        <meshStandardMaterial color={CANDY.teal} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 4.66, 0]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.2} />
      </mesh>
      {/* 钟面（贴塔身正面，第 5 盏灯起亮起）+ 钟摆 */}
      <group position={[0, 3.02, 0.87]}>
        <ClockFace radius={0.52} lit={stage >= 5} />
      </group>
      <Pendulum position={[0, 2.4, 0.89]} reducedMotion={reducedMotion} />
      {/* 6 个窗：正面拱窗 2×2 + 两侧舷窗各 1 */}
      {[0, 1].map((row) =>
        [0, 1].map((col) => (
          <group key={`${row}${col}`} position={[(col === 0 ? -0.42 : 0.42), 0.85 + row * 0.75, 0.86]}>
            <ArchedWindow lit={litCount(row * 2 + col)} reducedMotion={reducedMotion} />
          </group>
        )),
      )}
      {[0, 1].map((i) => (
        <group key={`p${i}`} position={[(i === 0 ? -1 : 1) * 0.86, 1.3, 0.4]} rotation-y={(i === 0 ? -1 : 1) * Math.PI / 2}>
          <PortholeWindow lit={litCount(4 + i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      <ArchedDoor width={0.64} height={0.68} color={CANDY.teal} position={[0, 0.01, 0.86]} />
    </group>
  );
}

/** 翻页的书：展开放在门口小书架上，一页轻轻翻动（reduce-motion 静止）。 */
function BookStand({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const page = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (reducedMotion || !page.current) return;
    page.current.rotation.x = Math.sin(state.clock.elapsedTime * 2.0) * 0.5 - 0.25;
  });
  return (
    <group position={position}>
      {/* 书架腿 + 摊开的书（两页纸呈浅 V 形） */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.36, 8]} />
        <meshStandardMaterial color={CANDY.wood} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.38, 0]} rotation-z={0.28}>
        <boxGeometry args={[0.34, 0.02, 0.26]} />
        <meshStandardMaterial color="#FFF7E0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.38, 0]} rotation-z={-0.28}>
        <boxGeometry args={[0.34, 0.02, 0.26]} />
        <meshStandardMaterial color="#FFF7E0" roughness={0.9} />
      </mesh>
      {/* 正在翻的那一页：绕书脊摆动 */}
      <mesh ref={page} position={[0, 0.4, 0]}>
        <boxGeometry args={[0.17, 0.015, 0.24]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={0.4} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function Library({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
    <group rotation-z={-0.02}>
      {/* 底裙 + 宽敞大厅 */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[3.4, 0.2, 2.3]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[3.2, 1.5, 2.1]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : '#AEB9EA'} roughness={0.95} />
      </mesh>
      {/* 金字塔屋顶（微出檐）+ 檐口饰带 + 顶球 */}
      <mesh position={[0, 1.73, 0]}>
        <boxGeometry args={[3.34, 0.08, 2.24]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.15, 0]} rotation-y={Math.PI / 4} scale={[1.02, 1, 0.72]}>
        <coneGeometry args={[2.26, 0.9, 4]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 2.64, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={0.9} />
      </mesh>
      {/* 4 个高拱窗 + 大门；山墙两端舷窗 ×2 */}
      {([-1.3, -0.75, 0.75, 1.3] as const).map((x, i) => (
        <group key={i} position={[x, 0.82, 1.07]}>
          <ArchedWindow lit={litCount(i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={`g${i}`} position={[(i === 0 ? -1 : 1) * 1.61, 1.45, 0]} rotation-y={(i === 0 ? -1 : 1) * Math.PI / 2}>
          <PortholeWindow lit={litCount(4 + i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      <ArchedDoor width={0.72} height={0.72} color={CANDY.coral} position={[0, 0.01, 1.07]} />
      {/* 门边一摞歪书 + 会翻页的书架 */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.65, 0.14 + i * 0.13, 1.3]} rotation-y={0.3 - i * 0.25}>
          <boxGeometry args={[0.4 - i * 0.04, 0.12, 0.3]} />
          <meshStandardMaterial color={[CANDY.coral, CANDY.butter, CANDY.mint][i]} roughness={0.85} />
        </mesh>
      ))}
      <BookStand position={[-1.75, 0, 1.45]} reducedMotion={reducedMotion} />
    </group>
  );
}
