import { useId } from 'react';
import type { ComponentType } from 'react';
import type { PartnerArtProps, PartnerPose } from '../types';
import type { AccessorySlot, PartnerId } from '../../config/shop';
import { accessoryById } from '../../config/shop';
import { FOX_RIG, FoxArt } from './fox';
import { TURTLE_RIG, TurtleArt } from './turtle';
import { RABBIT_RIG, RabbitArt } from './rabbit';
import { GLOW, ac, anchorTransform } from './shared';
import type { CharacterProps, Rig } from './shared';
import { HeadItem, LampItem, ScarfItem } from './accessories';

const CHARACTERS: Record<PartnerId, { Art: ComponentType<CharacterProps>; rig: Rig }> = {
  nuannuan: { Art: FoxArt, rig: FOX_RIG },
  manman: { Art: TurtleArt, rig: TURTLE_RIG },
  tiaotiao: { Art: RabbitArt, rig: RABBIT_RIG },
};

const POSES: readonly PartnerPose[] = ['idle', 'encourage', 'celebrate', 'guide'];

/** Valid accessory id for the slot, or null (unknown ids and wrong slots are ignored). */
function equippedId(
  equipped: Partial<Record<AccessorySlot, string | null>>,
  slot: AccessorySlot,
): string | null {
  const id = equipped[slot];
  if (!id) return null;
  const def = accessoryById(id);
  return def && def.slot === slot ? def.id : null;
}

function partnerCss(p: string): string {
  const fill = 'transform-box:fill-box;';
  return [
    `@keyframes ${p}-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.022)}}`,
    `.${p}-breathe{${fill}transform-origin:50% 100%;animation:${p}-breathe 3.6s ease-in-out infinite}`,
    `@keyframes ${p}-blink{0%,91%,100%{transform:scaleY(1)}94.5%{transform:scaleY(0.1)}}`,
    `.${p}-blink{${fill}transform-origin:50% 50%;animation:${p}-blink 4.2s ease-in-out 1.2s infinite}`,
    `@keyframes ${p}-glow{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.55;transform:scale(0.9)}}`,
    `.${p}-glow{${fill}transform-origin:50% 50%;animation:${p}-glow 3.2s ease-in-out infinite}`,
    `.${p}-glow2{${fill}transform-origin:50% 50%;animation:${p}-glow 3.2s ease-in-out 1.6s infinite}`,
    `@keyframes ${p}-twinkle{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.1) rotate(8deg)}}`,
    `.${p}-twinkle{${fill}transform-origin:50% 50%;animation:${p}-twinkle 3.2s ease-in-out infinite}`,
    `.${p}-twinkle2{${fill}transform-origin:50% 50%;animation:${p}-twinkle 3.2s ease-in-out 1.6s infinite}`,
    `@keyframes ${p}-nod{0%,56%,100%{transform:translateY(0) rotate(0deg)}18%{transform:translateY(2.6px) rotate(2deg)}36%{transform:translateY(0) rotate(0deg)}}`,
    `.${p}-nod{${fill}transform-origin:50% 100%;animation:${p}-nod 2.4s ease-in-out infinite}`,
    `@keyframes ${p}-heart{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}`,
    `.${p}-heart{${fill}transform-origin:50% 50%;animation:${p}-heart 2.4s ease-in-out infinite}`,
    `@keyframes ${p}-point{0%,100%{transform:translateX(0)}50%{transform:translateX(3.5px)}}`,
    `.${p}-point{animation:${p}-point 2s ease-in-out infinite}`,
    `@keyframes ${p}-hop{0%{transform:translateY(0)}20%{transform:translateY(-15px)}38%{transform:translateY(0)}52%{transform:translateY(-6px)}66%,100%{transform:translateY(0)}}`,
    `.${p}-hop{animation:${p}-hop 1.5s ease-in-out 1 forwards}`,
    `@keyframes ${p}-shadow{0%{transform:scale(1);opacity:1}20%{transform:scale(0.78);opacity:0.6}38%{transform:scale(1);opacity:1}52%{transform:scale(0.9);opacity:0.8}66%,100%{transform:scale(1);opacity:1}}`,
    `.${p}-shadow{${fill}transform-origin:50% 50%;animation:${p}-shadow 1.5s ease-in-out 1 forwards}`,
    `@keyframes ${p}-pop{0%{transform:scale(1) rotate(0deg)}30%{transform:scale(1.45) rotate(35deg)}60%{transform:scale(0.85) rotate(65deg)}100%{transform:scale(1) rotate(90deg)}}`,
    `.${p}-pop0,.${p}-pop1,.${p}-pop2{${fill}transform-origin:50% 50%;animation:${p}-pop 1.3s ease-out 1 forwards}`,
    `.${p}-pop1{animation-delay:0.2s}`,
    `.${p}-pop2{animation-delay:0.4s}`,
    `@keyframes ${p}-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`,
    `.${p}-bob{animation:${p}-bob 3.4s ease-in-out infinite}`,
  ].join('\n');
}

export function PartnerArt({ partner, pose: requestedPose, equipped, animate, title, className }: PartnerArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const p = `lt${uid}`;
  const { Art, rig: rigs } = CHARACTERS[partner] ?? CHARACTERS.nuannuan;
  const pose: PartnerPose = POSES.includes(requestedPose) ? requestedPose : 'idle';
  const rig = rigs[pose];
  const head = equippedId(equipped ?? {}, 'head');
  const scarf = equippedId(equipped ?? {}, 'scarf');
  const lamp = equippedId(equipped ?? {}, 'lamp');
  const bodyClass = pose === 'idle' ? ac(p, animate, 'breathe') : pose === 'celebrate' ? ac(p, animate, 'hop') : undefined;
  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      {animate && <style>{partnerCss(p)}</style>}
      <defs>
        <radialGradient id={`${p}-halo`}>
          <stop offset="0" stopColor={GLOW.core} stopOpacity={0.9} />
          <stop offset="0.3" stopColor={GLOW.light} stopOpacity={0.5} />
          <stop offset="1" stopColor={GLOW.glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${p}-shadow`}>
          <stop offset="0" stopColor="#070B24" stopOpacity={0.55} />
          <stop offset="0.65" stopColor="#070B24" stopOpacity={0.3} />
          <stop offset="1" stopColor="#070B24" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse
        className={pose === 'celebrate' ? ac(p, animate, 'shadow') : undefined}
        cx={120}
        cy={217}
        rx={66}
        ry={10}
        fill={`url(#${p}-shadow)`}
      />
      <g className={bodyClass}>
        <Art
          pose={pose}
          p={p}
          anim={animate}
          headItem={head ? <HeadItem id={head} p={p} /> : null}
          neckItem={scarf ? <ScarfItem id={scarf} p={p} w={rig.neck.w} /> : null}
        />
      </g>
      {lamp && (
        <g transform={anchorTransform(rig.lamp)}>
          <g className={ac(p, animate, 'bob')}>
            <LampItem id={lamp} p={p} />
          </g>
        </g>
      )}
    </svg>
  );
}
