// Prints phase-2 voice lines as JSON for generate-phase2.py:
//   { "items": { "<item.id>": "<voiceText>" }, "prompts": { "<p2-id>": "<text>" } }
// 每个中文 item 的读音以 content.json 的 voiceText 为准（多音字按词确定读音）。
import { VOICE_LINES_P2 } from '../../src/config/phase2/voice.ts';
import content from '../../src/config/phase2/content.json' with { type: 'json' };

const items = {};
for (const item of content.items) {
  if (item.language !== 'zh') continue;
  const text = item.voiceText ?? item.target;
  if (!text) throw new Error(`zh item without voiceText: ${item.id}`);
  items[item.id] = text;
}

process.stdout.write(JSON.stringify({ items, prompts: VOICE_LINES_P2 }));
