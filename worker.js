// Worker: costruisce la geometria senza bloccare la pagina.
import Module from './lib/manifold.js';
import { parse } from './lib/opentype.module.js';
import { buildAll } from './geometry.js';

const ready = Module().then((w) => { w.setup(); return w; });

function pack(m, transfer) {
  const mesh = m.getMesh();
  const np = mesh.numProp;
  let vert = mesh.vertProperties;
  if (np !== 3) {
    const out = new Float32Array((vert.length / np) * 3);
    for (let i = 0, j = 0; i < vert.length; i += np, j += 3) { out[j] = vert[i]; out[j + 1] = vert[i + 1]; out[j + 2] = vert[i + 2]; }
    vert = out;
  } else vert = vert.slice();
  const tri = mesh.triVerts.slice();
  transfer.push(vert.buffer, tri.buffer);
  return { vertProperties: vert, triVerts: tri, numProp: 3 };
}

self.onmessage = async ({ data }) => {
  const { id, params, font } = data;
  try {
    const wasm = await ready;
    const t0 = performance.now();
    const f = parse(font);
    const r = buildAll(wasm, f, params);
    const transfer = [];
    const assembly = {}, print = {};
    for (const [k, m] of Object.entries(r.assembly)) assembly[k] = pack(m, transfer);
    for (const [k, m] of Object.entries(r.print)) print[k] = pack(m, transfer);
    const ms = Math.round(performance.now() - t0);
    self.postMessage({ id, ok: true, assembly, print, info: r.info, warnings: r.warnings, ms }, transfer);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message ? e.message : e) });
  }
};
