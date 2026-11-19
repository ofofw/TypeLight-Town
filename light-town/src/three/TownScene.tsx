import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
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

/** 路灯：灯杆 + 发光灯罩 + 往地面洒暖光。 */
function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 2.3, 8]} />
        <meshStandardMaterial color="#3D4C7E" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.42, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={WARM.light} emissive={WARM.light} emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <coneGeometry args={[0.34, 0.28, 8]} />
        <meshStandardMaterial color="#53436A" roughness={0.9} flatShading />
      </mesh>
      <pointLight position={[0, 2.4, 0]} color={WARM.light} intensity={6} distance={7.5} decay={2} />
    </group>
  );
}

/** 低多边形树：树干 + 两层圆锥。 */
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.9, 6]} />
        <meshStandardMaterial color="#53436A" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.85, 1.6, 7]} />
        <meshStandardMaterial color="#3E7D6C" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <coneGeometry args={[0.6, 1.15, 7]} />
        <meshStandardMaterial color="#4E927E" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

/** 夜景小镇场景：暖色调夜空 + 月光 + 星星 + 路灯树木石板路 + 暖灯巷建筑群。 */
export function TownScene({ buildings, reducedMotion, onPick }: TownSceneProps) {
  return (
    <Canvas
      camera={{ position: [0.5, 6.5, 13], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#1B2A66']} />
      <fog attach="fog" args={['#26377E', 24, 52]} />

      {/* 光照：半环境光（天空蓝×地面暖紫）+ 月光方向光 */}
      <hemisphereLight args={['#2A3F80', '#8A76A3', 0.7]} />
      <ambientLight color={SKY.haze} intensity={1.1} />
      <directionalLight color={SKY.moon} intensity={1.1} position={[-8, 12, 5]} />

      {/* 月亮本体（材质关雾，避免被远景雾色洗掉） */}
      <mesh position={[-9, 8.5, -30]}>
        <sphereGeometry args={[1.15, 24, 24]} />
        <meshBasicMaterial color={SKY.moon} fog={false} />
      </mesh>

      <Stars radius={80} depth={30} count={1400} factor={4} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />

      {/* 暖灯巷地面 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color={GROUND.top} roughness={1} />
      </mesh>

      {/* 石板小路（横贯街区） */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 1.9]}>
        <planeGeometry args={[19, 1.7]} />
        <meshStandardMaterial color="#85719C" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-1.2, 0.012, 1.9]}>
        <planeGeometry args={[18.2, 1.3]} />
        <meshStandardMaterial color="#9583AC" roughness={1} />
      </mesh>

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

      {/* 路灯：路口与路旁 */}
      <StreetLamp position={[-6.2, 0, 2.6]} />
      <StreetLamp position={[6.4, 0, 1.2]} />
      <StreetLamp position={[-2.6, 0, -4.4]} />

      {/* 树木：背景与空隙点缀 */}
      <Tree position={[-8.8, 0, -1.8]} scale={1.15} />
      <Tree position={[-4.9, 0, -3.6]} scale={0.9} />
      <Tree position={[4.6, 0, -4.2]} scale={1.05} />
      <Tree position={[9.2, 0, -2.2]} scale={0.95} />
      <Tree position={[-9.6, 0, 3.4]} scale={0.8} />
      <Tree position={[9.8, 0, 3.8]} scale={0.85} />

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
