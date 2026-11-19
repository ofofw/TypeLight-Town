import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { DISTRICT_GROUND, SKY, THEME_LIGHTS } from '../art/palette';
import { DISTRICT_SLOTS } from '../art/buildings/districts';
import { GreyboxBuilding } from './GreyboxBuilding';
import type { GreyboxVariant } from './GreyboxBuilding';

export interface TownBuildingSpec {
  variant: GreyboxVariant;
  name: string;
  stage: number;
  highlighted?: boolean;
}

export interface TownSceneProps {
  buildings: readonly TownBuildingSpec[];
  reducedMotion?: boolean;
  /** 点选建筑（射线拾取）回调，参数为建筑下标。 */
  onPick?: (index: number) => void;
}

/** DISTRICT_SLOTS 的 1200x720 等距屏坐标 → 3D 地面坐标。 */
function slotToWorld(district: number, slot: number, scale: number): [number, number, number] {
  const s = DISTRICT_SLOTS[district][slot];
  return [(s.x - 600) / 60 * (scale / 1.4), 0, (s.y - 430) / 60 * (scale / 1.4)];
}

const BUILDING_ROTATIONS = [-0.12, 0.05, 0.18] as const;
const GROUND = DISTRICT_GROUND[0];
const WARM = THEME_LIGHTS.warm;

const CANDY = {
  cream: '#F5E7C8',
  coral: '#FF8E7A',
  pink: '#FF9FC6',
  mint: '#A8EFE2',
  lilac: '#BFC9F2',
  butter: '#FFD56B',
  grass: '#4E927E',
  grassDeep: '#3E7D6C',
} as const;

/** 糖果路灯：条纹灯杆 + 发光圆球灯罩 + 往地面洒暖光。 */
function CandyLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.3 + i * 0.6, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.6, 10]} />
          <meshStandardMaterial color={i % 2 === 0 ? CANDY.cream : CANDY.coral} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 2.62, 0]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color={WARM.light} emissive={WARM.light} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 2.88, 0]}>
        <coneGeometry args={[0.3, 0.24, 10]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[0.22, 0.04, 8, 20]} />
        <meshStandardMaterial color={CANDY.butter} roughness={0.7} />
      </mesh>
      <pointLight position={[0, 2.6, 0]} color={WARM.light} intensity={2.6} distance={5.5} decay={2} />
    </group>
  );
}

/** 彩旗串：两端杆之间挂一串三角小旗（下垂弧线）。 */
function Bunting({ from, to, height = 2.7 }: { from: [number, number]; to: [number, number]; height?: number }) {
  const { points, flags } = useMemo(() => {
    const mid: [number, number, number] = [(from[0] + to[0]) / 2, height - 0.55, (from[1] + to[1]) / 2];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from[0], height, from[1]),
      new THREE.Vector3(mid[0], mid[1] * 1.0, mid[2]),
      new THREE.Vector3(to[0], height, to[1]),
    );
    const pts = curve.getPoints(24).map((p) => [p.x, p.y, p.z] as [number, number, number]);
    const fl = curve.getPoints(9).map((p, i) => ({ pos: [p.x, p.y, p.z] as [number, number, number], i }));
    return { points: pts, flags: fl };
  }, [from, to, height]);
  const colors = [CANDY.coral, CANDY.butter, CANDY.mint, CANDY.pink, CANDY.lilac];
  return (
    <group>
      <Line points={points} color="#F5E7C8" lineWidth={1.5} />
      {flags.map(({ pos, i }) => (
        <mesh key={i} position={pos} rotation-x={Math.PI}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.8} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** 气球束：五颗糖果色气球轻轻上下漂（reduce-motion 静止）。 */
function Balloons({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    g.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.9) * 0.08;
    g.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
  });
  const balloons: { offset: [number, number, number]; color: string }[] = [
    { offset: [0, 0, 0], color: CANDY.coral },
    { offset: [0.42, 0.18, 0.1], color: CANDY.butter },
    { offset: [-0.38, 0.24, -0.08], color: CANDY.mint },
    { offset: [0.12, 0.52, -0.12], color: CANDY.pink },
    { offset: [-0.18, -0.05, 0.2], color: CANDY.lilac },
  ];
  return (
    <group ref={g} position={position}>
      {balloons.map((b, i) => (
        <group key={i} position={b.offset}>
          <mesh scale={[1, 1.18, 1]}>
            <sphereGeometry args={[0.24, 14, 14]} />
            <meshStandardMaterial color={b.color} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.42, 4]} />
            <meshStandardMaterial color="#F5E7C8" />
          </mesh>
        </group>
      ))}
      {/* 系气球的小木桩 */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.5, 8]} />
        <meshStandardMaterial color="#8A5A50" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** 圆滚滚的灌木。 */
function Bush({ position, scale = 1, color = CANDY.grass }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.32, 0]} scale={[1.15, 0.85, 1]}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.28, 0.22, 0.18]} scale={0.62}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

/** 小花：细杆 + 圆花头。 */
function Flower({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.24, 5]} />
        <meshStandardMaterial color={CANDY.grassDeep} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 草丘：压扁的大球让地面有起伏。 */
function Mound({ position, radius, color }: { position: [number, number, number]; radius: number; color: string }) {
  return (
    <mesh position={position} scale={[1, 0.32, 1]}>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

/** 糖果夜镇：童话氛围 + 暖光。 */
export function TownScene({ buildings, reducedMotion, onPick }: TownSceneProps) {
  return (
    <Canvas
      camera={{ position: [0.5, 6.5, 13], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#2A2470']} />
      <fog attach="fog" args={['#322B7E', 26, 56]} />

      {/* 光照：半环境光（天空蓝×地面暖紫）+ 月光方向光 */}
      <hemisphereLight args={['#3A4AA0', '#9A82B8', 0.75]} />
      <ambientLight color={SKY.haze} intensity={1.2} />
      <directionalLight color={SKY.moon} intensity={1.15} position={[-8, 12, 5]} />

      {/* 月亮本体（材质关雾；落在默认取景框内） */}
      <mesh position={[-5.5, 4.8, -26]}>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshBasicMaterial color={SKY.moon} fog={false} />
      </mesh>

      <Stars radius={80} depth={30} count={1600} factor={4.5} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />

      {/* 暖灯巷地面 + 草丘起伏 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color={GROUND.top} roughness={1} />
      </mesh>
      <Mound position={[-7.5, -0.1, -5.5]} radius={3.2} color="#7A6690" />
      <Mound position={[6.5, -0.1, -6]} radius={3.8} color="#75618C" />
      <Mound position={[0, -0.1, -7.5]} radius={3.4} color="#806C97" />

      {/* 石板小路（横贯街区） */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 1.9]}>
        <planeGeometry args={[19, 1.7]} />
        <meshStandardMaterial color="#85719C" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-1.2, 0.012, 1.9]}>
        <planeGeometry args={[18.2, 1.3]} />
        <meshStandardMaterial color="#9583AC" roughness={1} />
      </mesh>
      {/* 路缘圆石 */}
      {[-8, -5.5, -3, 3, 5.5, 8].map((x) => (
        <mesh key={x} position={[x, 0.03, 2.85]} rotation-x={Math.PI / 2} scale={[1, 1, 0.4]}>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 8]} />
          <meshStandardMaterial color="#A795BE" roughness={1} />
        </mesh>
      ))}

      {buildings.map((b, i) => (
        <GreyboxBuilding
          key={b.variant}
          variant={b.variant}
          stage={b.stage}
          highlighted={b.highlighted}
          reducedMotion={reducedMotion}
          position={slotToWorld(0, i, DISTRICT_SLOTS[0][i].scale)}
          rotationY={BUILDING_ROTATIONS[i % BUILDING_ROTATIONS.length]}
          onPick={() => onPick?.(i)}
        />
      ))}

      {/* 糖果路灯：路口与路旁 */}
      <CandyLamp position={[-6.2, 0, 2.6]} />
      <CandyLamp position={[6.4, 0, 1.2]} />
      <CandyLamp position={[-2.6, 0, -4.4]} />

      {/* 彩旗串：两盏路灯之间 + 建筑后方 */}
      <Bunting from={[-6.2, 2.6]} to={[6.4, 1.2]} height={2.7} />
      <Bunting from={[-8.8, -1.8]} to={[-4.9, -3.6]} height={3.0} />

      {/* 气球束 */}
      <Balloons position={[4.4, 1.6, 2.2]} reducedMotion={reducedMotion} />

      {/* 灌木与花丛 */}
      <Bush position={[-8.8, 0, -1.8]} scale={1.15} />
      <Bush position={[-4.9, 0, -3.6]} scale={0.9} color={CANDY.grassDeep} />
      <Bush position={[4.6, 0, -4.2]} scale={1.05} />
      <Bush position={[9.2, 0, -2.2]} scale={0.95} color={CANDY.grassDeep} />
      <Bush position={[-9.6, 0, 3.4]} scale={0.8} />
      <Bush position={[9.8, 0, 3.8]} scale={0.85} />
      {[
        [-5.2, 3.1, CANDY.coral], [-4.4, 3.3, CANDY.butter], [3.4, 3.0, CANDY.pink],
        [4.9, 3.4, CANDY.cream], [-7.7, 1.6, CANDY.pink], [7.4, 2.6, CANDY.coral],
        [2.2, 3.2, CANDY.mint], [-2.2, 3.4, CANDY.butter],
      ].map(([x, z, c], i) => (
        <Flower key={i} position={[x as number, 0, z as number]} color={c as string} />
      ))}

      {/* OrbitControls 默认不监听键盘事件，方向键留给 DOM 焦点层 */}
      <OrbitControls
        makeDefault
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={26}
        maxPolarAngle={1.42}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
