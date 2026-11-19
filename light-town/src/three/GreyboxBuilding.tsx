import { useRef } from 'react';
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

/** 单盏窗：底色为熄灭的深蓝，点亮后 emissive 渐变到暖光。 */
function WindowLight({ lit, reducedMotion }: { lit: boolean; reducedMotion?: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const target = lit ? 1.7 : 0;
    m.emissiveIntensity += (target - m.emissiveIntensity) * (reducedMotion ? 1 : 0.14);
  });
  return (
    <group>
      {/* 窗框 */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.52, 0.62, 0.05]} />
        <meshStandardMaterial color={UNLIT.windowFrame} roughness={0.9} />
      </mesh>
      {/* 窗体（可点亮） */}
      <mesh>
        <boxGeometry args={[0.4, 0.5, 0.06]} />
        <meshStandardMaterial
          ref={mat}
          color={UNLIT.windowFill}
          emissive={WARM.light}
          emissiveIntensity={0}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

interface VariantSpec {
  body: [number, number, number];
  windows: { x: number; y: number }[];
  doorWidth: number;
}

/** 每个变体：主体尺寸 + 6 扇窗在前脸的位置（相对主体中心）。 */
const VARIANTS: Record<GreyboxVariant, VariantSpec> = {
  'lamp-house': {
    body: [2.4, 2.0, 2.2],
    windows: [
      { x: -0.62, y: 0.32 }, { x: 0, y: 0.32 }, { x: 0.62, y: 0.32 },
      { x: -0.62, y: -0.42 }, { x: 0.62, y: -0.42 }, { x: 0, y: -0.42 },
    ],
    doorWidth: 0,
  },
  bakery: {
    body: [2.9, 1.7, 2.4],
    windows: [
      { x: -0.9, y: 0.24 }, { x: 0, y: 0.24 }, { x: 0.9, y: 0.24 },
      { x: -0.9, y: -0.4 }, { x: 0.9, y: -0.4 }, { x: 0.45, y: -0.4 },
    ],
    doorWidth: 0.66,
  },
  'post-office': {
    body: [2.2, 3.0, 2.2],
    windows: [
      { x: -0.55, y: 0.8 }, { x: 0.55, y: 0.8 }, { x: 0, y: 0.8 },
      { x: -0.55, y: 0.05 }, { x: 0.55, y: 0.05 }, { x: 0, y: 0.05 },
    ],
    doorWidth: 0.7,
  },
};

export function GreyboxBuilding({ variant, stage, highlighted, reducedMotion, position, rotationY = 0, onPick }: GreyboxBuildingProps) {
  const spec = VARIANTS[variant];
  const [w, h, d] = spec.body;

  function pick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onPick?.();
  }

  return (
    <group
      position={position}
      rotation-y={rotationY}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
      onClick={pick}
    >
      {/* 主体 */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={highlighted ? UNLIT.edge : UNLIT.top}
          emissive={highlighted ? '#3E539A' : '#000000'}
          emissiveIntensity={highlighted ? 0.3 : 0}
          roughness={0.95}
        />
      </mesh>

      {/* 变体屋顶 */}
      {variant === 'lamp-house' && (
        <>
          <mesh position={[0, h + 0.62, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[w * 0.82, 1.25, 4]} />
            <meshStandardMaterial color={UNLIT.left} roughness={0.95} flatShading />
          </mesh>
          {/* 烟囱 */}
          <mesh position={[w * 0.28, h + 0.95, d * 0.2]}>
            <boxGeometry args={[0.34, 0.9, 0.34]} />
            <meshStandardMaterial color={UNLIT.right} roughness={0.95} />
          </mesh>
        </>
      )}
      {variant === 'bakery' && (
        <>
          {/* 平顶出檐 */}
          <mesh position={[0, h + 0.09, 0]}>
            <boxGeometry args={[w + 0.35, 0.18, d + 0.35]} />
            <meshStandardMaterial color={UNLIT.left} roughness={0.95} />
          </mesh>
          {/* 雨棚 */}
          <mesh position={[0, h * 0.62, d / 2 + 0.32]} rotation-x={-0.5}>
            <boxGeometry args={[1.7, 0.07, 0.75]} />
            <meshStandardMaterial color="#8A5A50" roughness={0.9} />
          </mesh>
        </>
      )}
      {variant === 'post-office' && (
        <>
          <mesh position={[0, h + 0.08, 0]}>
            <boxGeometry args={[w + 0.25, 0.16, d + 0.25]} />
            <meshStandardMaterial color={UNLIT.left} roughness={0.95} />
          </mesh>
          {/* 旗杆与信箱旗 */}
          <mesh position={[w * 0.38, h + 0.75, d * 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 1.3, 8]} />
            <meshStandardMaterial color="#93A6DC" roughness={0.7} />
          </mesh>
          <mesh position={[w * 0.38 + 0.18, h + 1.25, d * 0.3]}>
            <boxGeometry args={[0.34, 0.22, 0.03]} />
            <meshStandardMaterial color="#B0705E" roughness={0.8} />
          </mesh>
        </>
      )}

      {/* 门 */}
      {spec.doorWidth > 0 && (
        <mesh position={[-w * 0.18, spec.doorWidth / 2 + 0.05, d / 2 + 0.03]}>
          <boxGeometry args={[spec.doorWidth, 1.0, 0.06]} />
          <meshStandardMaterial color="#241A33" roughness={0.9} />
        </mesh>
      )}
      {variant === 'lamp-house' && (
        <mesh position={[0, 0.5, d / 2 + 0.03]}>
          <boxGeometry args={[0.56, 1.0, 0.06]} />
          <meshStandardMaterial color="#241A33" roughness={0.9} />
        </mesh>
      )}

      {/* 6 扇窗按 stage 依次点亮 */}
      {spec.windows.map((win, i) => (
        <group key={i} position={[win.x, h / 2 + win.y, d / 2 + 0.05]}>
          <WindowLight lit={i < stage} reducedMotion={reducedMotion} />
        </group>
      ))}
    </group>
  );
}
