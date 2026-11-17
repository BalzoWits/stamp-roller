// Test headless: costruisce i pezzi con vari parametri, controlla validità e collisioni.
import Module from 'manifold-3d';
import opentype from 'opentype.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildAll } from '../geometry.js';
import { toSTL, to3MF } from '../export.js';
import { PRINT, bambuObjectSettings } from '../print-settings.js';

const wasm = await Module();
wasm.setup();
const fontFile = process.argv[2] || 'fonts/black-ops-one.woff';
const buf = readFileSync(new URL('../' + fontFile, import.meta.url));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const cases = [
  { name: 'default', p: {} },
  { name: 'unico', p: { split: false } },
  { name: 'corto', p: { text: 'HI' } },
  { name: 'lungo', p: { text: 'YOUTUBE.COM/@QUALCOSA LUNGO' } },
  { name: 'fisso', p: { diameterMode: 'fixed', rollerD: 40, text: 'SINFO' } },
  { name: 'marker-stretto', p: { bodyD: 22, markerLen: 125, neckD: 17 } },
  { name: 'punta-20', p: { tipNominal: 20, tipW: 21.5, tipT: 11, bodyD: 33, markerLen: 165, neckD: 25, text: 'GRAFFITI', textH: 14 } },
  { name: 'punta-20-stretto', p: { tipNominal: 20, tipW: 21.5, tipT: 11, bodyD: 28, neckD: 22 } },
  { name: 'senza-608', p: { bearing: false } },
  { name: 'vite-608', p: { axle: 'screw' } },
  { name: 'vite-senza-608-unico', p: { axle: 'screw', bearing: false, split: false } },
  { name: 'punta-corta', p: { tipLen: 5 } },
];

// coppie che devono toccarsi per progetto (non sono errori)
const EXPECTED = new Set(['hub^tire', 'ghost^tire', 'ghost^roller']);
let failed = false;

mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
for (const c of cases) {
  const t0 = performance.now();
  const r = buildAll(wasm, font, c.p);
  const ms = Math.round(performance.now() - t0);
  const A = r.assembly;
  const keys = Object.keys(A);
  const coll = {};
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const k = `${keys[i]}^${keys[j]}`;
    const v = A[keys[i]].intersect(A[keys[j]]).volume();
    if (v > 0.01) {
      coll[k] = +v.toFixed(2);
      if (!EXPECTED.has(k) && !EXPECTED.has(`${keys[j]}^${keys[i]}`)) failed = true;
    }
  }
  const bb = (m) => { const b = m.boundingBox(); return b.min.map((v, i) => (b.max[i] - v).toFixed(1)).join(' x '); };
  console.log(`\n[${c.name}] ${ms} ms`);
  console.log(' info', JSON.stringify(r.info, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
  console.log(' warn', r.warnings);
  console.log(' contatti (mm3)', coll);
  console.log(' ingombri stampa', Object.fromEntries(Object.entries(r.print).map(([k, m]) => [k, bb(m)])));
  if (c.name === 'default') {
    for (const [k, m] of Object.entries(r.print)) writeFileSync(new URL(`../out/${k}.stl`, import.meta.url), toSTL(m.getMesh()));
    const kit = (keys) => to3MF(keys.map((k, i) => ({
      name: k, mesh: r.print[k].getMesh(), offset: [i * 50 - 100, 0], settings: bambuObjectSettings(PRINT[k]),
    })), { title: 'test' });
    writeFileSync(new URL('../out/kit.3mf', import.meta.url), kit(Object.keys(r.print).filter((k) => k !== 'tire')));
    writeFileSync(new URL('../out/tpu.3mf', import.meta.url), kit(['tire']));
  }
}
console.log(failed ? '\nFALLITO: collisioni inattese' : '\nOK');
process.exit(failed ? 1 : 0);
