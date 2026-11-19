import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SKY } from '../art/palette';
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

/** 夜景小镇场景：深蓝夜空 + 月光 + 星星 + 暖灯巷建筑群。 */
export function TownScene({ buildings, reducedMotion, onPick }: TownSceneProps) {
  return (
    <Canvas
      camera={{ position: [0.5, 6.5, 13], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#131F4A']} />
      <fog attach="fog" args={['#1D2F6B', 22, 48]} />

      {/* 月光 */}
      <ambientLight color={SKY.haze} intensity={1.15} />
      <directionalLight color={SKY.moon} intensity={0.85} position={[-8, 12, 5]} />

      {/* 月亮本体 */}
      <mesh position={[-9, 8.5, -30]}>
        <sphereGeometry args={[1.15, 24, 24]} />
        <meshBasicMaterial color={SKY.moon} />
      </mesh>

      <Stars radius={80} depth={30} count={1200} factor={3.2} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />

      {/* 暖灯巷地面 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#4A3D63" roughness={1} />
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
