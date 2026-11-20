import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { WARM, CANDY, ArchedDoor, PortholeWindow, SquareWindow } from './parts';
import type { BuildingBodyProps } from './parts';

/** 星光坡三座建筑（BUILDINGS 6-8）。 */

/** 上浮的音符：小圆头 + 音符杆，循环升起再淡出（reduce-motion 静止）。 */
function FloatingNote({ offset, phase, reducedMotion }: { offset: [number, number, number]; phase: number; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const t = state.clock.elapsedTime;
    const cycle = (t * 0.32 + phase) % 1;
    g.current.position.y = offset[1] + cycle * 1.5;
    g.current.position.x = offset[0] + Math.sin(t * 1.1 + phase) * 0.12;
    const s = cycle < 0.75 ? 1 : 1 - (cycle - 0.75) / 0.25;
    g.current.scale.setScalar(s);
  });
  return (
    <group ref={g} position={offset}>
      <mesh>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={WARM.light} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0.055, 0.14, 0]}>
        <boxGeometry args={[0.02, 0.26, 0.02]} />
        <meshStandardMaterial color={CANDY.butter} emissive={WARM.light} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0.075, 0.24, 0]}>
        <boxGeometry args={[0.09, 0.05, 0.02]} />
        <meshStandardMaterial color={CANDY.butter} emissive={WARM.light} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

export function MusicHouse({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  // 圆亭窗位：底层一圈 4 个（避开正门）+ 上层鼓座 2 个。
  const ringAngles = [40, 140, 220, 320];
  return (
    <group rotation-z={0.05}>
      {/* 底层圆鼓 + 饰环 */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.15, 1.22, 1.1, 20]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.cream} roughness={0.95} />
      </mesh>
      {[0.08, 1.08].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[y < 0.5 ? 1.22 : 1.15, 0.06, 8, 28]} />
          <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
        </mesh>
      ))}
      {/* 上层小鼓 + 糖果圆篷顶 */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.85, 0.92, 0.85, 18]} />
        <meshStandardMaterial color={CANDY.mint} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.93, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.86, 0.05, 8, 24]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <coneGeometry args={[1.08, 0.8, 18]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.78, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.2} />
      </mesh>
      {/* 窗：底层环列舷窗 4 + 上层正面 2 */}
      {ringAngles.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const r = 1.19;
        return (
          <group key={deg} position={[Math.sin(a) * r, 0.6, Math.cos(a) * r]} rotation-y={a}>
            <PortholeWindow lit={litCount(i)} reducedMotion={reducedMotion} />
          </group>
        );
      })}
      {[0, 1].map((i) => {
        const a = ((i === 0 ? -25 : 25) * Math.PI) / 180;
        return (
          <group key={`u${i}`} position={[Math.sin(a) * 0.88, 1.5, Math.cos(a) * 0.88]} rotation-y={a}>
            <PortholeWindow lit={litCount(4 + i)} reducedMotion={reducedMotion} />
          </group>
        );
      })}
      <ArchedDoor width={0.6} height={0.62} color={CANDY.teal} position={[0, 0.01, 1.19]} />
      {/* 屋顶上升起的音符 */}
      <FloatingNote offset={[-0.35, 2.9, 0.1]} phase={0} reducedMotion={reducedMotion} />
      <FloatingNote offset={[0.15, 2.9, -0.15]} phase={0.37} reducedMotion={reducedMotion} />
      <FloatingNote offset={[0.5, 2.9, 0.25]} phase={0.71} reducedMotion={reducedMotion} />
    </group>
  );
}

/** 穹顶星图：几个小星连成「小勺子」，在观星台上方轻轻闪。 */
function Constellation({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const { points, stars } = useMemo(() => {
    const pts: readonly [number, number, number][] = [
      [-0.42, 0.1, 0], [-0.14, 0.26, 0.06], [0.16, 0.18, -0.04],
      [0.34, -0.02, 0.05], [0.18, -0.26, 0], [-0.08, -0.3, -0.05],
    ];
    return { points: pts, stars: pts };
  }, []);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const t = state.clock.elapsedTime;
    g.current.children.forEach((child, i) => {
      if (i === 0) return;
      const s = 0.8 + Math.sin(t * 2.1 + i * 1.3) * 0.3;
      child.scale.setScalar(s);
    });
  });
  return (
    <group ref={g} position={position}>
      <Line points={points} color="#C9B8FF" lineWidth={1} transparent opacity={0.5} />
      {stars.map((p, i) => (
        <mesh key={i} position={p}>
          <octahedronGeometry args={[0.045]} />
          <meshStandardMaterial color={WARM.core} emissive={WARM.light} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

export function Observatory({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  const dome = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !dome.current) return;
    dome.current.rotation.y += delta * 0.12;
  });
  return (
    <group>
      {/* 底裙（带门与方窗）+ 观测塔 */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[2.2, 0.56, 2.0]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <boxGeometry args={[2.3, 0.07, 2.1]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.92, 0.98, 2.3, 20]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.lilac} roughness={0.95} />
      </mesh>
      {/* 观景环廊 */}
      <mesh position={[0, 1.62, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.05, 0.05, 8, 28]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        return (
          <mesh key={i} position={[Math.sin(a) * 1.02, 1.76, Math.cos(a) * 1.02]}>
            <cylinderGeometry args={[0.02, 0.02, 0.26, 6]} />
            <meshStandardMaterial color="#93A6DC" roughness={0.7} />
          </mesh>
        );
      })}
      {/* 会转的穹顶（望远镜从开口探出，朝前上方） */}
      <group ref={dome} position={[0, 2.9, 0]}>
        <mesh>
          <sphereGeometry args={[0.98, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={CANDY.cream} roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 0.62, 0.8]} rotation-x={0.5}>
          <torusGeometry args={[0.14, 0.04, 8, 16]} />
          <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.8, 0.98]} rotation-x={0.5}>
          <cylinderGeometry args={[0.075, 0.1, 0.92, 12]} />
          <meshStandardMaterial color={CANDY.cream} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.19, 1.19]}>
          <sphereGeometry args={[0.085, 10, 10]} />
          <meshStandardMaterial color={CANDY.butter} emissive={WARM.light} emissiveIntensity={1.4} />
        </mesh>
      </group>
      {/* 塔身舷窗 2×2 + 底裙方窗 2（共 6） */}
      {[0, 1].map((row) =>
        [0, 1].map((col) => {
          const x = col === 0 ? -0.34 : 0.34;
          const y = 0.95 + row * 0.55;
          const r = 0.975 - (y - 0.6) / 2.3 * 0.06;
          const z = Math.sqrt(Math.max(0.01, r * r - x * x)) + 0.02;
          return (
            <group key={`${row}${col}`} position={[x, y, z]}>
              <PortholeWindow lit={litCount(row * 2 + col)} reducedMotion={reducedMotion} />
            </group>
          );
        }),
      )}
      {[0, 1].map((i) => (
        <group key={`b${i}`} position={[-0.6 + i * 1.2, 0.32, 1.03]}>
          <SquareWindow lit={litCount(4 + i)} reducedMotion={reducedMotion} />
        </group>
      ))}
      <ArchedDoor width={0.62} height={0.56} color={CANDY.teal} position={[0, 0.01, 1.03]} />
      <Constellation position={[0.1, 4.35, 0]} reducedMotion={reducedMotion} />
    </group>
  );
}

/** 风车叶片：木框 + 三道珊瑚色帆桁，四片绕轴转（reduce-motion 静止）。 */
function WindmillBlades({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !g.current) return;
    g.current.rotation.z += delta * 0.4;
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={CANDY.wood} roughness={0.9} />
      </mesh>
      <group ref={g}>
        {[0, 1, 2, 3].map((k) => (
          <group key={k} rotation-z={(k * Math.PI) / 2}>
            <mesh position={[0, 0.68, 0]}>
              <boxGeometry args={[0.13, 1.35, 0.035]} />
              <meshStandardMaterial color={CANDY.cream} roughness={0.85} />
            </mesh>
            {[0.32, 0.68, 1.02].map((y) => (
              <mesh key={y} position={[0.22, y, 0]}>
                <boxGeometry args={[0.38, 0.11, 0.02]} />
                <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

export function Windmill({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
    <group rotation-z={0.04}>
      {/* 收细的塔身 + 底座/顶口饰环 */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.06, 1.14, 0.24, 18]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.62, 0.9, 2.4, 18]} />
        <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.cream} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.62, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.64, 0.05, 8, 24]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      {/* 洋葱小帽 */}
      <group position={[0, 2.66, 0]}>
        <OnionDomeSmall color={CANDY.coral} />
      </group>
      {/* 叶片：短轮轴从塔身探出，叶片挂在轴端 */}
      <mesh position={[0, 2.48, 0.66]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
        <meshStandardMaterial color={CANDY.wood} roughness={0.9} />
      </mesh>
      <WindmillBlades position={[0, 2.48, 0.84]} reducedMotion={reducedMotion} />
      {/* 窗：正面 2（门旁）+ 左右各 2（共 6） */}
      {[0, 1].map((i) => {
        const x = i === 0 ? -0.36 : 0.36;
        const z = Math.sqrt(Math.max(0.01, 0.84 * 0.84 - x * x)) + 0.02;
        return (
          <group key={i} position={[x, 0.72, z]}>
            <PortholeWindow lit={litCount(i)} reducedMotion={reducedMotion} />
          </group>
        );
      })}
      {[0, 1].map((side) =>
        [0, 1].map((row) => {
          const r = row === 0 ? 0.88 : 0.76;
          const dir = side === 0 ? -1 : 1;
          return (
            <group key={`${side}${row}`} position={[dir * (r + 0.02), 0.75 + row * 0.85, 0]} rotation-y={dir * Math.PI / 2}>
              <PortholeWindow lit={litCount(2 + side * 2 + row)} reducedMotion={reducedMotion} />
            </group>
          );
        }),
      )}
      <ArchedDoor width={0.58} height={0.6} color={CANDY.wood} position={[0, 0.01, 0.86]} />
      {/* 门口面粉袋 */}
      <mesh position={[0.62, 0.14, 0.98]} rotation-z={0.12}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.95} />
      </mesh>
      <mesh position={[0.62, 0.26, 0.98]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
        <meshStandardMaterial color={CANDY.butter} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** 小号洋葱顶（风车帽）。 */
function OnionDomeSmall({ color }: { color: string }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.66, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}
