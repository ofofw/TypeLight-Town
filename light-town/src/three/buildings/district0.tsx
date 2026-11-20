import { CANDY, ArchedDoor, ArchedWindow, BentConeHat, CrookedChimney, FlowerBox, OnionDome, PortholeWindow, SquareWindow, SwirlSign, TopStar, WavingFlag } from './parts';
import type { BuildingBodyProps } from './parts';

/** 暖灯巷三座建筑（BUILDINGS 0-2）。 */

export function LampHouse({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
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
      {[0, 1, 2].map((row) =>
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
        }),
      )}
      <ArchedDoor width={0.62} height={0.62} color={CANDY.wood} position={[0, 0.01, 1.14]} />
      {/* 塔基花环：草环 + 小花 */}
      <mesh position={[0, 0.14, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.22, 0.09, 8, 28]} />
        <meshStandardMaterial color="#4E927E" roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.28, 0.3, Math.sin(a) * 1.28]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={[CANDY.coral, CANDY.butter, CANDY.pink][i % 3]} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Bakery({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
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
          <FlowerBox colors={[CANDY.butter, CANDY.pink, CANDY.cream]} />
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
  );
}

export function PostOffice({ stage, highlighted, reducedMotion }: BuildingBodyProps) {
  const litCount = (i: number) => i < stage;
  return (
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
      {/* 侧翼角上的飘动小旗 */}
      <WavingFlag position={[1.72, 1.56, 1.05]} color={CANDY.pink} reducedMotion={reducedMotion} />
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
  );
}
