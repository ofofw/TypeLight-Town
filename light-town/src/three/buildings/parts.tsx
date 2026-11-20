import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME_LIGHTS, UNLIT } from '../../art/palette';

export const WARM = THEME_LIGHTS.warm;

/** 糖果夜色盘：奶油墙 + 糖果色屋顶，靠暖光保持夜晚温馨。 */
export const CANDY = {
  cream: '#F5E7C8',
  coral: '#FF8E7A',
  pink: '#FF9FC6',
  mint: '#A8EFE2',
  lilac: '#BFC9F2',
  teal: '#46D3B0',
  butter: '#FFD56B',
  wood: '#8A5A50',
} as const;

/** 各建筑主体共用的输入（位置/拾取由派发器统一处理）。 */
export interface BuildingBodyProps {
  stage: number;
  highlighted?: boolean;
  reducedMotion?: boolean;
}

/** 点亮渐变：所有窗体共用同一段 emissive 缓动。 */
export function useGlow(lit: boolean, reducedMotion: boolean | undefined, peak: number) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const target = lit ? peak : 0;
    m.emissiveIntensity += (target - m.emissiveIntensity) * (reducedMotion ? 1 : 0.14);
  });
  return mat;
}

/** 圆舷窗：圆片 + 圆环框，最童话的窗型。 */
export function PortholeWindow({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
  const mat = useGlow(lit, reducedMotion, 3.0);
  return (
    <group>
      <mesh position={[0, 0, -0.015]}>
        <torusGeometry args={[0.3, 0.06, 10, 24]} />
        <meshStandardMaterial color="#8FA3DC" roughness={0.85} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.29, 24]} />
        <meshStandardMaterial ref={mat} color={UNLIT.windowFill} emissive={WARM.light} emissiveIntensity={0} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 拱形窗：方身 + 半圆顶。 */
export function ArchedWindow({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
  const mat = useGlow(lit, reducedMotion, 3.0);
  return (
    <group>
      <mesh position={[0, 0.22, -0.015]}>
        <torusGeometry args={[0.19, 0.045, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#8FA3DC" roughness={0.85} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.38, 0.44, 0.05]} />
        <meshStandardMaterial ref={mat} color={UNLIT.windowFill} emissive={WARM.light} emissiveIntensity={0} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <circleGeometry args={[0.19, 20, 0, Math.PI]} />
        <meshStandardMaterial color={UNLIT.windowFill} emissive={WARM.light} emissiveIntensity={0} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 方窗：带横竖窗棂。 */
export function SquareWindow({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
  const mat = useGlow(lit, reducedMotion, 3.0);
  return (
    <group>
      <mesh position={[0, 0, -0.015]}>
        <boxGeometry args={[0.5, 0.56, 0.05]} />
        <meshStandardMaterial color="#8FA3DC" roughness={0.9} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.4, 0.46, 0.06]} />
        <meshStandardMaterial ref={mat} color={UNLIT.windowFill} emissive={WARM.light} emissiveIntensity={0} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[0.04, 0.46, 0.02]} />
        <meshStandardMaterial color="#8FA3DC" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** 洋葱穹顶：迪士尼城堡式圆顶尖顶。 */
export function OnionDome({ radius, height, color, tipColor }: { radius: number; height: number; color: string; tipColor?: string }) {
  const points = useMemo(() => {
    const profile: [number, number][] = [
      [0.001, 0], [radius * 0.72, 0.02], [radius, height * 0.3],
      [radius * 0.62, height * 0.72], [radius * 0.28, height * 0.92], [0.001, height],
    ];
    return profile.map(([x, y]) => new THREE.Vector2(x, y));
  }, [radius, height]);
  return (
    <group>
      <mesh>
        <latheGeometry args={[points, 24]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, height + 0.1, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={tipColor ?? CANDY.butter} emissive={tipColor ?? CANDY.butter} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

/** 歪尖帽：两段圆锥错位叠出「弯掉的帽子」。 */
export function BentConeHat({ radius, height, color }: { radius: number; height: number; color: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.32, 0]}>
        <coneGeometry args={[radius, height * 0.72, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[radius * 0.22, height * 0.78, 0]} rotation-z={-0.35}>
        <coneGeometry args={[radius * 0.5, height * 0.42, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[radius * 0.42, height * 0.98, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

/** 摇摆招牌：挂在小支架上轻轻晃（reduce-motion 时静止）。 */
export function SwirlSign({ reducedMotion }: { reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    g.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.6) * 0.09;
  });
  return (
    <group ref={g}>
      {/* 招牌板 */}
      <mesh>
        <boxGeometry args={[0.66, 0.44, 0.05]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.8} />
      </mesh>
      {/* 糖果漩涡：一串渐小的球沿弧线 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.2 + i * 0.1, 0.08 - 0.035 * i * (i - 2), 0.035]}>
          <sphereGeometry args={[0.075 - i * 0.011, 10, 10]} />
          <meshStandardMaterial color={i % 2 === 0 ? CANDY.cream : CANDY.pink} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** 弯脖子烟囱：歪着的胖烟囱 + 冒暖光。 */
export function CrookedChimney({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position} rotation-z={0.22}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.28, 0.85, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.24, 0.05, 8, 18]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** 顶端小星星：小灯屋的标志，慢慢转。 */
export function TopStar({ reducedMotion, position }: { reducedMotion?: boolean; position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    g.current.rotation.y = state.clock.elapsedTime * 0.8;
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <octahedronGeometry args={[0.16]} />
        <meshStandardMaterial color={WARM.core} emissive={WARM.light} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

/** 飘动小旗：细杆 + 三角旗轻轻摆（reduce-motion 静止）。 */
export function WavingFlag({ position, color, reducedMotion }: { position: [number, number, number]; color: string; reducedMotion?: boolean }) {
  const flag = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (reducedMotion || !flag.current) return;
    flag.current.rotation.y = Math.sin(state.clock.elapsedTime * 3.2) * 0.35;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.56, 6]} />
        <meshStandardMaterial color="#93A6DC" roughness={0.7} />
      </mesh>
      <mesh ref={flag} position={[0.13, 0.48, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.12, 0.24, 3]} />
        <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh position={[0, 0.57, 0]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/** 拱门：方门身 + 半圆门楣。 */
export function ArchedDoor({ width, height, color, position }: { width: number; height: number; color: string; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <cylinderGeometry args={[width / 2, width / 2, 0.06, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, height + width * 0.28, 0.005]}>
        <torusGeometry args={[width * 0.24, 0.035, 8, 16]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={0.8} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 钟面：表盘 + 表圈 + 时分针（贴墙面用）。 */
export function ClockFace({ radius, lit }: { radius: number; lit: boolean }) {
  const mat = useGlow(lit, true, 0.9);
  return (
    <group>
      <mesh>
        <circleGeometry args={[radius, 24]} />
        <meshStandardMaterial ref={mat} color="#FFF7E0" emissive={WARM.light} emissiveIntensity={0.25} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <torusGeometry args={[radius, radius * 0.13, 8, 24]} />
        <meshStandardMaterial color={CANDY.butter} roughness={0.6} />
      </mesh>
      <mesh position={[0, radius * 0.24, 0.02]}>
        <boxGeometry args={[radius * 0.1, radius * 0.48, 0.01]} />
        <meshStandardMaterial color="#53436A" />
      </mesh>
      <mesh position={[radius * 0.24, 0, 0.02]} rotation-z={-Math.PI / 3}>
        <boxGeometry args={[radius * 0.09, radius * 0.4, 0.01]} />
        <meshStandardMaterial color="#53436A" />
      </mesh>
    </group>
  );
}

/** 窗下花箱：小盒子 + 三颗小圆花。 */
export function FlowerBox({ colors }: { colors: readonly string[] }) {
  return (
    <group>
      <mesh position={[0, -0.4, 0.06]}>
        <boxGeometry args={[0.46, 0.13, 0.18]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} />
      </mesh>
      {[-0.13, 0, 0.13].map((fx, i) => (
        <mesh key={fx} position={[fx, -0.28, 0.06]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
