import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME_LIGHTS, UNLIT } from '../art/palette';

/** 暖灯巷三座建筑的小样变体（对应 BUILDINGS 0-2）。 */
export type GreyboxVariant = 'lamp-house' | 'bakery' | 'post-office';

export interface GreyboxBuildingProps {
  variant: GreyboxVariant;
  /** 已点亮窗数 0..6（STAGES_PER_BUILDING）。 */
  stage: number;
  highlighted?: boolean;
  reducedMotion?: boolean;
  position: [number, number, number];
  rotationY?: number;
  onPick?: () => void;
}

const WARM = THEME_LIGHTS.warm;

/** 糖果夜色盘：奶油墙 + 糖果色屋顶，靠暖光保持夜晚温馨。 */
const CANDY = {
  cream: '#F5E7C8',
  coral: '#FF8E7A',
  pink: '#FF9FC6',
  mint: '#A8EFE2',
  lilac: '#BFC9F2',
  teal: '#46D3B0',
  butter: '#FFD56B',
  wood: '#8A5A50',
} as const;

/** 点亮渐变：所有窗体共用同一段 emissive 缓动。 */
function useGlow(lit: boolean, reducedMotion: boolean | undefined, peak: number) {
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
function PortholeWindow({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
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
function ArchedWindow({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
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

/** 方窗：邮局 annex 用，带横竖窗棂。 */
function SquareWindow({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
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
function OnionDome({ radius, height, color, tipColor }: { radius: number; height: number; color: string; tipColor?: string }) {
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
function BentConeHat({ radius, height, color }: { radius: number; height: number; color: string }) {
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
function SwirlSign({ reducedMotion }: { reducedMotion?: boolean }) {
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
function CrookedChimney({ position, color }: { position: [number, number, number]; color: string }) {
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
function TopStar({ reducedMotion, position }: { reducedMotion?: boolean; position: [number, number, number] }) {
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

/** 拱门：方门身 + 半圆门楣。 */
function ArchedDoor({ width, height, color, position }: { width: number; height: number; color: string; position: [number, number, number] }) {
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

export function GreyboxBuilding({ variant, stage, highlighted, reducedMotion, position, rotationY = 0, onPick }: GreyboxBuildingProps) {
  function pick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onPick?.();
  }

  const litCount = (i: number) => i < stage;

  return (
    <group
      position={position}
      rotation-y={rotationY}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
      onClick={pick}
    >
      {variant === 'lamp-house' && (
        <group rotation-z={0.04}>
          {/* 圆塔主体 */}
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[1.05, 1.15, 1.9, 20]} />
            <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.cream} roughness={0.95} />
          </mesh>
          {/* 底座环 + 檐口环 */}
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[1.13, 0.07, 8, 28]} />
            <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.88, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.06, 0.07, 8, 28]} />
            <meshStandardMaterial color={CANDY.coral} roughness={0.9} />
          </mesh>
          {/* 洋葱穹顶 */}
          <group position={[0, 1.92, 0]}>
            <OnionDome radius={1.18} height={1.35} color={CANDY.coral} />
          </group>
          <TopStar reducedMotion={reducedMotion} position={[0, 3.55, 0]} />
          <CrookedChimney position={[0.85, 2.35, 0.5]} color={CANDY.cream} />
          {/* 6 个舷窗：2 列 × 3 行（圆塔正面，避开檐口环） */}
          {[0, 1, 2].map((row) => (
            [0, 1].map((col) => {
              const x = col === 0 ? -0.48 : 0.48;
              const y = 0.55 + row * 0.45;
              const z = Math.sqrt(Math.max(0.01, 1.1 * 1.1 - x * x)) + 0.02;
              const idx = row * 2 + col;
              return (
                <group key={idx} position={[x, y, z]}>
                  <PortholeWindow lit={litCount(idx)} reducedMotion={reducedMotion} />
                </group>
              );
            })
          ))}
          <ArchedDoor width={0.62} height={0.62} color={CANDY.wood} position={[0, 0.01, 1.14]} />
        </group>
      )}

      {variant === 'bakery' && (
        <group rotation-z={-0.03}>
          {/* 主体 */}
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[3.0, 1.6, 2.3]} />
            <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.mint} roughness={0.95} />
          </mesh>
          {/* 桶形屋顶 */}
          <mesh position={[0, 1.6, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 1]}>
            <cylinderGeometry args={[0.78, 0.78, 3.25, 20]} />
            <meshStandardMaterial color={CANDY.pink} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.58, 1.12]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.76, 0.06, 8, 24]} />
            <meshStandardMaterial color={CANDY.cream} roughness={0.85} />
          </mesh>
          <CrookedChimney position={[-1.0, 2.1, -0.5]} color={CANDY.cream} />
          {/* 糖果条纹雨棚 */}
          <group position={[0.45, 0.95, 1.24]} rotation-x={-0.42}>
            {[-2, -1, 0, 1, 2].map((i) => (
              <mesh key={i} position={[i * 0.34, 0, 0]}>
                <boxGeometry args={[0.32, 0.05, 0.72]} />
                <meshStandardMaterial color={i % 2 === 0 ? CANDY.coral : CANDY.cream} roughness={0.85} />
              </mesh>
            ))}
          </group>
          {/* 6 个拱窗：上 3 下 2 + 门旁 1（上排压低避开桶顶） */}
          {[0, 1, 2].map((i) => (
            <group key={`t${i}`} position={[-0.85 + i * 0.85, 1.02, 1.16]}>
              <ArchedWindow lit={litCount(i)} reducedMotion={reducedMotion} />
            </group>
          ))}
          {[0, 1].map((i) => (
            <group key={`b${i}`} position={[-1.05 + i * 1.0, 0.42, 1.16]}>
              <ArchedWindow lit={litCount(3 + i)} reducedMotion={reducedMotion} />
            </group>
          ))}
          <group position={[1.42, 0.42, 1.16]}>
            <ArchedWindow lit={litCount(5)} reducedMotion={reducedMotion} />
          </group>
          <ArchedDoor width={0.6} height={0.6} color={CANDY.coral} position={[-0.02, 0.01, 1.16]} />
          {/* 摇摆招牌：墙面横支架 + 吊绳 + 招牌 */}
          <mesh position={[1.5, 1.35, 1.16]}>
            <boxGeometry args={[0.42, 0.035, 0.035]} />
            <meshStandardMaterial color="#93A6DC" roughness={0.7} />
          </mesh>
          <mesh position={[1.68, 1.18, 1.16]}>
            <cylinderGeometry args={[0.012, 0.012, 0.34, 6]} />
            <meshStandardMaterial color="#F5E7C8" />
          </mesh>
          <group position={[1.68, 0.96, 1.16]}>
            <SwirlSign reducedMotion={reducedMotion} />
          </group>
        </group>
      )}

      {variant === 'post-office' && (
        <group>
          {/* 主圆塔 */}
          <mesh position={[-0.55, 1.3, 0]}>
            <cylinderGeometry args={[0.92, 1.0, 2.6, 18]} />
            <meshStandardMaterial color={highlighted ? '#FFF0C2' : CANDY.lilac} roughness={0.95} />
          </mesh>
          <group position={[-0.55, 2.6, 0]}>
            <BentConeHat radius={1.05} height={1.5} color={CANDY.teal} />
          </group>
          {/* 侧翼 annex */}
          <mesh position={[1.0, 0.75, 0.35]}>
            <boxGeometry args={[1.6, 1.5, 1.7]} />
            <meshStandardMaterial color={CANDY.cream} roughness={0.95} />
          </mesh>
          <mesh position={[1.0, 1.5, 0.35]}>
            <boxGeometry args={[1.75, 0.12, 1.85]} />
            <meshStandardMaterial color={CANDY.teal} roughness={0.9} />
          </mesh>
          {/* 钟面（贴塔身表面） */}
          <group position={[-0.55, 2.25, 0.96]}>
            <mesh>
              <circleGeometry args={[0.34, 24]} />
              <meshStandardMaterial color="#FFF7E0" emissive="#FFF3C4" emissiveIntensity={0.25} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.012]}>
              <torusGeometry args={[0.34, 0.045, 8, 24]} />
              <meshStandardMaterial color={CANDY.butter} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.08, 0.02]}>
              <boxGeometry args={[0.035, 0.16, 0.01]} />
              <meshStandardMaterial color="#53436A" />
            </mesh>
            <mesh position={[0.08, 0, 0.02]} rotation-z={-Math.PI / 3}>
              <boxGeometry args={[0.03, 0.13, 0.01]} />
              <meshStandardMaterial color="#53436A" />
            </mesh>
          </group>
          {/* 塔 + 侧翼共 6 个窗：塔舷窗 2、侧翼方窗 4 */}
          {[0, 1].map((i) => (
            <group key={`tw${i}`} position={[-0.55, 0.75 + i * 0.95, Math.sqrt(Math.max(0.01, 0.96 * 0.96 - 0.35 * 0.35)) + 0.02]}>
              <group position={[0, 0, 0]}>
                <PortholeWindow lit={litCount(i)} reducedMotion={reducedMotion} />
              </group>
            </group>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <group key={`aw${i}`} position={[0.55 + (i % 2) * 0.85, 0.5 + Math.floor(i / 2) * 0.75, 1.22]}>
              <SquareWindow lit={litCount(2 + i)} reducedMotion={reducedMotion} />
            </group>
          ))}
          <ArchedDoor width={0.58} height={0.58} color={CANDY.teal} position={[0.7, 0.01, 1.22]} />
        </group>
      )}

      {/* 窗光外洒：点亮的窗越多，门前越亮（对应 2D 版的 spill）。 */}
      {stage > 0 && (
        <pointLight
          position={[0, 1.2, 2.2]}
          color={WARM.glow}
          intensity={stage * 2.4}
          distance={8}
          decay={2}
        />
      )}
    </group>
  );
}
