import Module from 'manifold-3d';
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { buildAll } from '../geometry.js';
const wasm = await Module(); wasm.setup();
for (const f of ['permanent-marker','bebas-neue','rubik-mono-one','roboto-black']) {
  const buf = readFileSync(new URL(`../fonts/${f}.woff`, import.meta.url));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const t0 = performance.now();
  try { const r = buildAll(wasm, font, { text: 'Andrea was here' }); console.log(f, Math.round(performance.now()-t0), 'ms', r.info.rollerDiameter.toFixed(1), r.warnings); }
  catch (e) { console.log(f, 'ERR', e.message); }
}
