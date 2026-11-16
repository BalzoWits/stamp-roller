import Module from 'manifold-3d';
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { buildAll } from '../geometry.js';
const wasm = await Module(); wasm.setup();
for (const [f,t] of [['black-ops-one','CIAO'],['permanent-marker','CIAO'],['permanent-marker','Andrea was here']]) {
  const buf = readFileSync(new URL(`../fonts/${f}.woff`, import.meta.url));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const r = buildAll(wasm, font, { text: t });
  console.log(f, t, Object.fromEntries(Object.entries(r.print).map(([k,m])=>[k,m.numTri()])));
}
