import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { DISTRICT_GROUND, SKY, THEME_LIGHTS } from '../art/palette';
import { DISTRICT_SLOTS } from '../art/buildings/districts';
import { GreyboxBuilding } from './buildings';
import type { GreyboxVariant } from './buildings';

export interface TownBuildingSpec {
  variant: GreyboxVariant;
  name: string;
  stage: number;
  highlighted?: boolean;
}

export interface TownSceneProps {
  /** 12 座建筑（BUILDINGS 顺序）。 */
  buildings: readonly TownBuildingSpec[];
  /** 相机运镜聚焦的街区（0-3）。 */
  focusDistrict: number;
  /** 聚焦街区内的建筑槽位（练习返回时对准刚点亮的建筑），null 为街区全景。 */
  focusSlot?: number | null;
  /** 各街区是否已开放（锁定街区加雾罩 + 路牌）。 */
  districtOpen?: readonly boolean[];
  reducedMotion?: boolean;
  /** 点选建筑（射线拾取）回调，参数为建筑下标（0-11）。 */
  onPick?: (index: number) => void;
}

/** 四街区在连续世界中的锚点（前排：暖灯巷 / 溪桥街；后排：星光坡 / 月湾港）。 */
const DISTRICT_OFFSET: readonly (readonly [number, number, number])[] = [
  [-9, 0, 6.5],
  [9, 0, 6.5],
  [-9, 0, -6.5],
  [9, 0, -6.5],
];

/** DISTRICT_SLOTS 的 1200x720 等距屏坐标 → 街区内 3D 地面坐标。 */
function slotToWorld(district: number, slot: number): [number, number, number] {
  const s = DISTRICT_SLOTS[district][slot];
  return [(s.x - 600) / 60 * (s.scale / 1.4), 0, (s.y - 430) / 60 * (s.scale / 1.4)];
}

const BUILDING_ROTATIONS = [-0.12, 0.05, 0.18, 0.1, -0.15, 0.02, -0.08, 0.14, 0.05, 0.12, -0.1, 0.08] as const;
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
  wood: '#8A5A50',
} as const;

/** 糖果路灯：条纹灯杆 + 发光圆球灯罩（呼吸感）+ 往地面洒暖光。 */
function CandyLamp({ position, phase = 0, withLight, reducedMotion }: {
  position: [number, number, number];
  phase?: number;
  /** 只有聚焦街区开真实点光源，控制全场灯数。 */
  withLight?: boolean;
  reducedMotion?: boolean;
}) {
  const bulb = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (reducedMotion || !bulb.current) return;
    bulb.current.emissiveIntensity = 1.6 + Math.sin(state.clock.elapsedTime * 1.8 + phase) * 0.3;
  });
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
        <meshStandardMaterial ref={bulb} color={WARM.light} emissive={WARM.light} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 2.88, 0]}>
        <coneGeometry args={[0.3, 0.24, 10]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[0.22, 0.04, 8, 20]} />
        <meshStandardMaterial color={CANDY.butter} roughness={0.7} />
      </mesh>
      {withLight && <pointLight position={[0, 2.6, 0]} color={WARM.light} intensity={2.6} distance={5.5} decay={2} />}
    </group>
  );
}

/** 蘑菇：童话感十足的红帽白点小蘑菇。 */
function Mushroom({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
        <meshStandardMaterial color="#F5E7C8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.8} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, 0.25, Math.sin(a) * 0.09]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#FFF7E0" />
          </mesh>
        );
      })}
    </group>
  );
}

/** 萤火虫：暖光小点在低空慢慢飘（reduce-motion 静止）。 */
function Fireflies({ seeds, reducedMotion }: {
  seeds: readonly { base: readonly [number, number, number]; r: number; speed: number; phase: number }[];
  reducedMotion?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const s = seeds[i];
      if (!s) return;
      child.position.set(
        s.base[0] + Math.cos(t * s.speed + s.phase) * s.r,
        s.base[1] + Math.sin(t * s.speed * 1.3 + s.phase) * 0.22,
        s.base[2] + Math.sin(t * s.speed * 0.8 + s.phase) * s.r,
      );
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.2 + Math.sin(t * 2.2 + s.phase) * 0.8;
    });
  });
  return (
    <group ref={group}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={WARM.core} emissive={WARM.light} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

/** 彩旗串：两端糖果旗杆之间挂一串三角小旗（下垂弧线）。 */
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
  const Pole = ({ x, z }: { x: number; z: number }) => (
    <group position={[x, 0, z]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.28 + i * 0.56, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.56, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? CANDY.cream : CANDY.coral} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.18, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={CANDY.butter} emissive={CANDY.butter} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
  return (
    <group>
      <Pole x={from[0]} z={from[1]} />
      <Pole x={to[0]} z={to[1]} />
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

/** 溪桥街的小桥：一排弯成拱面的木板 + 两根扶手。 */
function CreekBridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
        const t = (i + 3) / 6;
        return (
          <mesh key={i} position={[i * 0.3, Math.sin(t * Math.PI) * 0.3 + 0.08, 0]} rotation-z={-(t - 0.5) * 0.55}>
            <boxGeometry args={[0.32, 0.05, 1.1]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#8A5A50' : '#96635A'} roughness={0.95} />
          </mesh>
        );
      })}
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.68, z]} rotation-z={-0.0}>
          <boxGeometry args={[2.35, 0.05, 0.05]} />
          <meshStandardMaterial color="#8A5A50" roughness={0.95} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.9 + i * 0.9, 0.42, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.55, 6]} />
          <meshStandardMaterial color="#8A5A50" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** 浮标：条纹小浮球 + 顶灯，随波轻点（reduce-motion 静止）。 */
function Buoy({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    const t = state.clock.elapsedTime;
    g.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.05;
    g.current.rotation.z = Math.sin(t * 0.9 + position[2]) * 0.1;
  });
  return (
    <group ref={g} position={position}>
      <mesh scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color={CANDY.coral} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.14, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={CANDY.cream} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={WARM.core} emissive={WARM.light} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

/** 锁区路牌：木牌 + 一把发光小锁，轻轻上下浮动（reduce-motion 静止）。 */
function LockSign({ position, reducedMotion }: { position: [number, number, number]; reducedMotion?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !g.current) return;
    g.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.1) * 0.08;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 2.0, 8]} />
        <meshStandardMaterial color="#8A5A50" roughness={0.95} />
      </mesh>
      <group ref={g} position={[0, 2.35, 0]}>
        <mesh>
          <boxGeometry args={[1.4, 0.82, 0.08]} />
          <meshStandardMaterial color="#F5E7C8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <torusGeometry args={[0.36, 0.035, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#93A6DC" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.12, 0.05]}>
          <boxGeometry args={[0.4, 0.32, 0.12]} />
          <meshStandardMaterial color={CANDY.coral} emissive={CANDY.coral} emissiveIntensity={0.35} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.12, 0.13]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 8]} />
          <meshStandardMaterial color="#F5E7C8" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/** 锁区雾罩：半透明大碗扣在街区上。 */
function FogDome({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[8.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color="#39307E" transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

type MinimalControls = {
  target: THREE.Vector3;
  addEventListener: (type: 'start', listener: () => void) => void;
  removeEventListener: (type: 'start', listener: () => void) => void;
  update: () => void;
};

/** 相机运镜：把相机与 OrbitControls 目标缓动到给定机位；用户一拖拽就让位。 */
function CameraRig({ viewFrom, viewTarget, reducedMotion }: {
  viewFrom: readonly [number, number, number];
  viewTarget: readonly [number, number, number];
  reducedMotion?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as MinimalControls | null;
  const flying = useRef(true);
  const from = useRef(new THREE.Vector3(...viewFrom));
  const to = useRef(new THREE.Vector3(...viewTarget));
  useEffect(() => {
    flying.current = true;
    from.current.set(viewFrom[0], viewFrom[1], viewFrom[2]);
    to.current.set(viewTarget[0], viewTarget[1], viewTarget[2]);
  }, [viewFrom, viewTarget]);
  useEffect(() => {
    if (!controls) return;
    const cancel = () => { flying.current = false; };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);
  useFrame(() => {
    if (!flying.current) return;
    const k = reducedMotion ? 1 : 0.06;
    camera.position.lerp(from.current, k);
    if (controls) {
      controls.target.lerp(to.current, k);
      controls.update();
    }
    if (camera.position.distanceTo(from.current) < 0.03) flying.current = false;
  });
  return null;
}

/** 一个街区的地形与装饰（offset 平移到世界坐标）。 */
function DistrictTerrain({ district, open, reducedMotion }: { district: number; open: boolean; reducedMotion?: boolean }) {
  const off = DISTRICT_OFFSET[district];
  const ground = DISTRICT_GROUND[district];
  const p = (x: number, y: number, z: number): [number, number, number] => [off[0] + x, y, off[2] + z];
  return (
    <group>
      {/* 街区过渡裙边（压暗一圈，柔化与基底的接缝） */}
      <mesh rotation-x={-Math.PI / 2} position={[off[0], -0.02, off[2]]}>
        <circleGeometry args={[9.9, 48]} />
        <meshStandardMaterial color={open ? ground.left : '#332C55'} roughness={1} />
      </mesh>
      {/* 街区地面圆盘 */}
      <mesh rotation-x={-Math.PI / 2} position={[off[0], -0.01, off[2]]}>
        <circleGeometry args={[8.6, 48]} />
        <meshStandardMaterial color={open ? ground.top : '#3E3660'} roughness={1} />
      </mesh>

      {district === 0 && (
        <>
          <Mound position={p(-7.5, -0.1, -5.5)} radius={3.2} color="#7A6690" />
          <Mound position={p(6.5, -0.1, -6)} radius={3.8} color="#75618C" />
          <Mound position={p(0, -0.1, -7.5)} radius={3.4} color="#806C97" />
        </>
      )}

      {district === 1 && (
        <>
          {/* 小溪（贯穿街区）+ 木桥 + 芦苇 */}
          <mesh rotation-x={-Math.PI / 2} position={p(1.6, 0.005, -0.5)}>
            <planeGeometry args={[1.7, 14]} />
            <meshStandardMaterial color="#2B6CA0" roughness={0.3} metalness={0.15} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={p(1.6, 0.02, 2.4)}>
            <planeGeometry args={[1.1, 7.5]} />
            <meshStandardMaterial color="#3C7FAE" roughness={0.3} metalness={0.15} />
          </mesh>
          <CreekBridge position={p(1.6, 0, 1.9)} />
          {[-2.2, 1.0, 3.6].map((z, i) => (
            <group key={i} position={p(i % 2 === 0 ? 0.55 : 2.7, 0, z)}>
              {[0, 1, 2].map((k) => (
                <mesh key={k} position={[k * 0.09, 0.35, 0]} rotation-z={0.15 - k * 0.15}>
                  <cylinderGeometry args={[0.02, 0.03, 0.7, 5]} />
                  <meshStandardMaterial color="#3E7D6C" />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )}

      {district === 2 && (
        <>
          {/* 星光坡：背后大草丘 + 门前台阶 */}
          <Mound position={p(-4.5, -0.1, -5.5)} radius={4.4} color="#5852A4" />
          <Mound position={p(4.8, -0.1, -5.8)} radius={4.8} color="#514BA0" />
          <Mound position={p(0, -0.12, -7.8)} radius={4.0} color="#5C56AA" />
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={p(0, 0.03 + i * 0.055, 3.1 - i * 0.42)}>
              <boxGeometry args={[4.6 - i * 0.8, 0.09, 0.44]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#6B64B8' : '#776FC2'} roughness={1} />
            </mesh>
          ))}
        </>
      )}

      {district === 3 && (
        <>
          {/* 月湾港：门前海面 + 浮标 + 月光倒影 */}
          <mesh rotation-x={-Math.PI / 2} position={p(0.6, -0.005, 6.8)}>
            <circleGeometry args={[6.4, 36, Math.PI * 0.12, Math.PI * 0.76]} />
            <meshStandardMaterial color="#1F4066" roughness={0.25} metalness={0.15} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={p(-2.2, 0.001, 6.4)}>
            <circleGeometry args={[1.4, 24]} />
            <meshBasicMaterial color="#5E86B8" transparent opacity={0.35} />
          </mesh>
          {open && (
            <>
              <Buoy position={p(-3.4, 0.1, 5.6)} reducedMotion={reducedMotion} />
              <Buoy position={p(3.2, 0.1, 7.4)} reducedMotion={reducedMotion} />
            </>
          )}
          {/* 码头货箱 */}
          {[[-6.4, 4.2], [-5.4, 4.9]].map(([x, z], i) => (
            <mesh key={i} position={p(x, 0.28, z)} rotation-y={i * 0.4}>
              <boxGeometry args={[0.66, 0.56, 0.56]} />
              <meshStandardMaterial color={i === 0 ? CANDY.wood : '#77685E'} roughness={0.95} />
            </mesh>
          ))}
        </>
      )}

      {/* 石板主街（溪桥街在小溪处断开，露出水面与木桥） */}
      {district === 1 ? (
        <>
          <mesh rotation-x={-Math.PI / 2} position={p(-2.55, 0.015, 1.9)}>
            <planeGeometry args={[4.3, 1.5]} />
            <meshStandardMaterial color="#85719C" roughness={1} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={p(3.95, 0.015, 1.9)}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial color="#85719C" roughness={1} />
          </mesh>
        </>
      ) : (
        <>
          <mesh rotation-x={-Math.PI / 2} position={p(0, 0.015, 1.9)}>
            <planeGeometry args={[9.4, 1.5]} />
            <meshStandardMaterial color={open ? '#85719C' : '#4A4370'} roughness={1} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={p(-0.4, 0.012, 1.9)}>
            <planeGeometry args={[8.8, 1.05]} />
            <meshStandardMaterial color={open ? '#9583AC' : '#544B7C'} roughness={1} />
          </mesh>
        </>
      )}
      {/* 街区间的连道：左列向右引、前排向后引 */}
      {district % 2 === 0 && (
        <mesh rotation-x={-Math.PI / 2} position={[off[0] + 8.6 + 0.9, 0.013, off[2]]}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshStandardMaterial color="#6E5A80" roughness={1} />
        </mesh>
      )}
      {district < 2 && (
        <mesh rotation-x={-Math.PI / 2} position={[off[0], 0.013, off[2] - 8.6 - 0.9]}>
          <planeGeometry args={[1.2, 1.8]} />
          <meshStandardMaterial color="#6E5A80" roughness={1} />
        </mesh>
      )}

      {!open && (
        <>
          <FogDome position={[off[0], 0, off[2]]} />
          <LockSign position={p(0, 0, 3.9)} reducedMotion={reducedMotion} />
        </>
      )}
    </group>
  );
}

/** 糖果夜镇：四街区连续场景 + 运镜。 */
export function TownScene({ buildings, focusDistrict, focusSlot = null, districtOpen, reducedMotion, onPick }: TownSceneProps) {
  const focus = Math.max(0, Math.min(3, focusDistrict));
  const open = districtOpen ?? [true, true, true, true];
  const { viewFrom, viewTarget } = useMemo(() => {
    const off = DISTRICT_OFFSET[focus];
    if (focusSlot !== null && focusSlot >= 0 && focusSlot <= 2) {
      const slot = slotToWorld(focus, focusSlot);
      const t: [number, number, number] = [off[0] + slot[0] * 0.7, 2.0, off[2] + slot[2] * 0.7 + 0.3];
      return { viewTarget: t, viewFrom: [t[0] + 0.3, 3.6, t[2] + 8.2] as [number, number, number] };
    }
    return {
      viewTarget: [off[0], 1, off[2]] as [number, number, number],
      viewFrom: [off[0] + 0.5, 6.5, off[2] + 13] as [number, number, number],
    };
  }, [focus, focusSlot]);

  const fireflySeeds = useMemo(() => {
    const seeds: { base: readonly [number, number, number]; r: number; speed: number; phase: number }[] = [];
    DISTRICT_OFFSET.forEach((off, d) => {
      if (!open[d]) return;
      for (let i = 0; i < 4; i++) {
        const k = d * 4 + i;
        seeds.push({
          base: [off[0] + Math.sin(k * 2.3) * 6.5, 0.7 + (k % 4) * 0.35, off[2] + Math.cos(k * 1.7) * 3.5 + 0.5],
          r: 0.35 + (k % 3) * 0.18,
          speed: 0.5 + (k % 4) * 0.14,
          phase: k * 1.9,
        });
      }
    });
    return seeds;
  }, [open]);

  return (
    <Canvas
      camera={{ position: viewFrom, fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#2A2470']} />
      <fog attach="fog" args={['#322B7E', 30, 72]} />

      {/* 光照：半环境光（天空蓝×地面暖紫）+ 月光方向光 */}
      <hemisphereLight args={['#3A4AA0', '#9A82B8', 0.75]} />
      <ambientLight color={SKY.haze} intensity={1.2} />
      <directionalLight color={SKY.moon} intensity={1.15} position={[-8, 12, 5]} />

      {/* 月亮本体（材质关雾） */}
      <mesh position={[-6, 9.5, -44]}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color={SKY.moon} fog={false} />
      </mesh>

      <Stars radius={100} depth={40} count={1800} factor={4.5} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />

      {/* 全镇基底 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
        <circleGeometry args={[24, 56]} />
        <meshStandardMaterial color="#37305E" roughness={1} />
      </mesh>

      {DISTRICT_OFFSET.map((_, d) => (
        <DistrictTerrain key={d} district={d} open={open[d]} reducedMotion={reducedMotion} />
      ))}

      {/* 建筑：12 座按街区落位（窗光外洒只给聚焦街区，控制全场点光源数） */}
      {buildings.map((b, i) => {
        const d = Math.floor(i / 3);
        const slot = slotToWorld(d, i % 3);
        return (
          <GreyboxBuilding
            key={i}
            variant={b.variant}
            stage={b.stage}
            highlighted={b.highlighted}
            reducedMotion={reducedMotion}
            spill={d === focus}
            position={[DISTRICT_OFFSET[d][0] + slot[0], 0, DISTRICT_OFFSET[d][2] + slot[2]]}
            rotationY={BUILDING_ROTATIONS[i % BUILDING_ROTATIONS.length]}
            onPick={() => onPick?.(i)}
          />
        );
      })}

      {/* 糖果路灯：每街区两三盏，只有聚焦街区真实发光 */}
      {DISTRICT_OFFSET.map((off, d) => {
        if (!open[d]) return null;
        const lampSpots: [number, number][] =
          d === 0 ? [[-6.2, 2.6], [6.4, 1.2], [-2.6, -4.4]] : [[-6.0, 2.5], [6.2, 1.0]];
        return lampSpots.map(([x, z], k) => (
          <CandyLamp key={`${d}-${k}`} position={[off[0] + x, 0, off[2] + z]} phase={d * 2 + k * 2.1} withLight={d === focus} reducedMotion={reducedMotion} />
        ));
      })}

      {/* 彩旗串 */}
      <Bunting from={[DISTRICT_OFFSET[0][0] - 6.2, DISTRICT_OFFSET[0][2] + 2.6]} to={[DISTRICT_OFFSET[0][0] + 6.4, DISTRICT_OFFSET[0][2] + 1.2]} height={2.7} />
      <Bunting from={[DISTRICT_OFFSET[0][0] - 8.8, DISTRICT_OFFSET[0][2] - 1.8]} to={[DISTRICT_OFFSET[0][0] - 4.9, DISTRICT_OFFSET[0][2] - 3.6]} height={3.0} />
      <Bunting from={[DISTRICT_OFFSET[1][0] - 5.5, DISTRICT_OFFSET[1][2] + 2.2]} to={[DISTRICT_OFFSET[1][0] + 5.8, DISTRICT_OFFSET[1][2] + 1.6]} height={2.8} />
      <Bunting from={[DISTRICT_OFFSET[2][0] - 5.2, DISTRICT_OFFSET[2][2] + 2.6]} to={[DISTRICT_OFFSET[2][0] + 5.4, DISTRICT_OFFSET[2][2] + 2.0]} height={2.9} />
      <Bunting from={[DISTRICT_OFFSET[3][0] - 5.6, DISTRICT_OFFSET[3][2] + 2.2]} to={[DISTRICT_OFFSET[3][0] + 5.6, DISTRICT_OFFSET[3][2] + 1.4]} height={2.8} />

      {/* 气球束（暖灯巷 + 月湾港） */}
      <Balloons position={[DISTRICT_OFFSET[0][0] + 4.4, 1.6, DISTRICT_OFFSET[0][2] + 2.2]} reducedMotion={reducedMotion} />
      <Balloons position={[DISTRICT_OFFSET[3][0] - 4.6, 1.6, DISTRICT_OFFSET[3][2] + 2.6]} reducedMotion={reducedMotion} />

      {/* 蘑菇与圆石点缀 */}
      <Mushroom position={[DISTRICT_OFFSET[0][0] - 7.6, 0, DISTRICT_OFFSET[0][2] + 2.9]} scale={1.1} />
      <Mushroom position={[DISTRICT_OFFSET[0][0] - 7.0, 0, DISTRICT_OFFSET[0][2] + 3.4]} scale={0.8} />
      <Mushroom position={[DISTRICT_OFFSET[0][0] + 7.1, 0, DISTRICT_OFFSET[0][2] + 3.1]} scale={1.0} />
      <Mushroom position={[DISTRICT_OFFSET[0][0] + 7.9, 0, DISTRICT_OFFSET[0][2] + 2.5]} scale={0.7} />
      <Mushroom position={[DISTRICT_OFFSET[0][0] - 3.5, 0, DISTRICT_OFFSET[0][2] + 3.2]} scale={0.9} />
      <Mushroom position={[DISTRICT_OFFSET[2][0] - 6.8, 0, DISTRICT_OFFSET[2][2] + 2.8]} scale={1.0} />
      <Mushroom position={[DISTRICT_OFFSET[2][0] + 6.6, 0, DISTRICT_OFFSET[2][2] + 3.0]} scale={0.85} />
      <Mushroom position={[DISTRICT_OFFSET[2][0] + 7.3, 0, DISTRICT_OFFSET[2][2] + 2.3]} scale={0.7} />
      {[
        [DISTRICT_OFFSET[0][0] - 5.4, DISTRICT_OFFSET[0][2] + 3.0],
        [DISTRICT_OFFSET[0][0] + 5.1, DISTRICT_OFFSET[0][2] + 2.4],
        [DISTRICT_OFFSET[0][0] - 8.6, DISTRICT_OFFSET[0][2] + 1.2],
        [DISTRICT_OFFSET[0][0] + 8.9, DISTRICT_OFFSET[0][2] + 0.8],
        [DISTRICT_OFFSET[0][0] + 0.9, DISTRICT_OFFSET[0][2] + 3.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.14 + (i % 3) * 0.04, 8, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#9A8BB8' : '#B0A2CC'} roughness={1} />
        </mesh>
      ))}

      {/* 萤火虫（开放街区上空） */}
      <Fireflies seeds={fireflySeeds} reducedMotion={reducedMotion} />

      {/* 灌木与花丛 */}
      <Bush position={[DISTRICT_OFFSET[0][0] - 8.8, 0, DISTRICT_OFFSET[0][2] - 1.8]} scale={1.15} />
      <Bush position={[DISTRICT_OFFSET[0][0] - 4.9, 0, DISTRICT_OFFSET[0][2] - 3.6]} scale={0.9} color={CANDY.grassDeep} />
      <Bush position={[DISTRICT_OFFSET[0][0] + 4.6, 0, DISTRICT_OFFSET[0][2] - 4.2]} scale={1.05} />
      <Bush position={[DISTRICT_OFFSET[0][0] + 9.2, 0, DISTRICT_OFFSET[0][2] - 2.2]} scale={0.95} color={CANDY.grassDeep} />
      <Bush position={[DISTRICT_OFFSET[0][0] - 9.6, 0, DISTRICT_OFFSET[0][2] + 3.4]} scale={0.8} />
      <Bush position={[DISTRICT_OFFSET[0][0] + 9.8, 0, DISTRICT_OFFSET[0][2] + 3.8]} scale={0.85} />
      <Bush position={[DISTRICT_OFFSET[1][0] - 8.2, 0, DISTRICT_OFFSET[1][2] - 2.5]} scale={1.0} />
      <Bush position={[DISTRICT_OFFSET[1][0] - 8.9, 0, DISTRICT_OFFSET[1][2] + 2.6]} scale={0.8} color="#2D5C55" />
      <Bush position={[DISTRICT_OFFSET[2][0] + 8.4, 0, DISTRICT_OFFSET[2][2] - 2.4]} scale={0.9} color="#446AA0" />
      <Bush position={[DISTRICT_OFFSET[3][0] - 8.6, 0, DISTRICT_OFFSET[3][2] - 1.6]} scale={0.95} />
      {[
        [DISTRICT_OFFSET[0][0] - 5.2, DISTRICT_OFFSET[0][2] + 3.1, CANDY.coral],
        [DISTRICT_OFFSET[0][0] - 4.4, DISTRICT_OFFSET[0][2] + 3.3, CANDY.butter],
        [DISTRICT_OFFSET[0][0] + 3.4, DISTRICT_OFFSET[0][2] + 3.0, CANDY.pink],
        [DISTRICT_OFFSET[0][0] + 4.9, DISTRICT_OFFSET[0][2] + 3.4, CANDY.cream],
        [DISTRICT_OFFSET[0][0] - 7.7, DISTRICT_OFFSET[0][2] + 1.6, CANDY.pink],
        [DISTRICT_OFFSET[0][0] + 7.4, DISTRICT_OFFSET[0][2] + 2.6, CANDY.coral],
        [DISTRICT_OFFSET[0][0] + 2.2, DISTRICT_OFFSET[0][2] + 3.2, CANDY.mint],
        [DISTRICT_OFFSET[0][0] - 2.2, DISTRICT_OFFSET[0][2] + 3.4, CANDY.butter],
        [DISTRICT_OFFSET[1][0] - 5.4, DISTRICT_OFFSET[1][2] + 3.2, CANDY.pink],
        [DISTRICT_OFFSET[1][0] + 4.6, DISTRICT_OFFSET[1][2] + 3.3, CANDY.mint],
        [DISTRICT_OFFSET[2][0] - 5.8, DISTRICT_OFFSET[2][2] + 3.6, CANDY.lilac],
        [DISTRICT_OFFSET[2][0] + 5.2, DISTRICT_OFFSET[2][2] + 3.5, CANDY.cream],
        [DISTRICT_OFFSET[3][0] - 5.6, DISTRICT_OFFSET[3][2] + 3.4, CANDY.butter],
        [DISTRICT_OFFSET[3][0] + 5.8, DISTRICT_OFFSET[3][2] + 3.2, CANDY.pink],
      ].map(([x, z, c], i) => (
        <Flower key={i} position={[x as number, 0, z as number]} color={c as string} />
      ))}

      <CameraRig viewFrom={viewFrom} viewTarget={viewTarget} reducedMotion={reducedMotion} />

      {/* OrbitControls 默认不监听键盘事件，方向键留给 DOM 焦点层 */}
      <OrbitControls
        makeDefault
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={34}
        maxPolarAngle={1.42}
        target={viewTarget}
      />
    </Canvas>
  );
}
