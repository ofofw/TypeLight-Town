// Prints the game's voice lines (src/config/voice.ts) as JSON for generate.py and verify.py.
import { VOICE_LINES } from '../../src/config/voice.ts';

process.stdout.write(JSON.stringify(VOICE_LINES));
