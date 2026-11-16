// Export STL binario e 3MF (zip "store", senza compressione). Nessuna dipendenza.

export function toSTL(mesh) {
  const { vertProperties: V, triVerts: T, numProp: np } = mesh;
  const nTri = T.length / 3;
  const buf = new ArrayBuffer(84 + nTri * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, nTri, true);
  let o = 84;
  for (let t = 0; t < nTri; t++) {
    const a = T[3 * t] * np, b = T[3 * t + 1] * np, c = T[3 * t + 2] * np;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2];
    const vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const val of [nx, ny, nz]) { dv.setFloat32(o, val, true); o += 4; }
    for (const i of [a, b, c]) for (let k = 0; k < 3; k++) { dv.setFloat32(o, V[i + k], true); o += 4; }
    o += 2;
  }
  return new Uint8Array(buf);
}

const xmlAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// objects: [{ name, mesh, offset:[x,y], settings?: { chiave: valore } }]
// Le settings finiscono in Metadata/model_settings.config (formato Bambu Studio / OrcaSlicer):
// verificato con Bambu Studio 02.07 che le legge anche da un 3MF non salvato da lui.
// center: dove mettere il centro del gruppo; i piatti Bambu partono da (0,0), 128 = centro di un 256×256.
export function to3MF(objects, { title, center = [128, 128] } = {}) {
  const enc = new TextEncoder();
  let res = '', items = '', cfg = '';
  objects.forEach((ob, idx) => {
    const id = idx + 1;
    const { vertProperties: V, triVerts: T, numProp: np } = ob.mesh;
    const dx = (ob.offset ? ob.offset[0] : 0) + center[0], dy = (ob.offset ? ob.offset[1] : 0) + center[1];
    const vs = [];
    for (let i = 0; i < V.length; i += np) vs.push(`<vertex x="${(V[i] + dx).toFixed(4)}" y="${(V[i + 1] + dy).toFixed(4)}" z="${V[i + 2].toFixed(4)}"/>`);
    const ts = [];
    for (let i = 0; i < T.length; i += 3) ts.push(`<triangle v1="${T[i]}" v2="${T[i + 1]}" v3="${T[i + 2]}"/>`);
    res += `<object id="${id}" name="${xmlAttr(ob.name)}" type="model"><mesh><vertices>${vs.join('')}</vertices><triangles>${ts.join('')}</triangles></mesh></object>`;
    items += `<item objectid="${id}"/>`;
    const meta = Object.entries({ name: ob.name, ...(ob.settings || {}) })
      .map(([k, v]) => `\n    <metadata key="${k}" value="${xmlAttr(v)}"/>`).join('');
    cfg += `\n  <object id="${id}">${meta}\n    <part id="${id}" subtype="normal_part">\n      <metadata key="name" value="${xmlAttr(ob.name)}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n    </part>\n  </object>`;
  });
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="it-IT" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">StampRoller</metadata>${title ? `<metadata name="Title">${xmlAttr(title)}</metadata>` : ''}<resources>${res}</resources><build>${items}</build></model>`;
  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?>\n<config>${cfg}\n</config>\n`;
  const ct = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  return zipStore([
    ['[Content_Types].xml', enc.encode(ct)],
    ['_rels/.rels', enc.encode(rels)],
    ['3D/3dmodel.model', enc.encode(model)],
    ['Metadata/model_settings.config', enc.encode(modelSettings)],
  ]);
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(d) { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zipStore(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let off = 0;
  for (const [name, data] of files) {
    const nb = enc.encode(name), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(lh.buffer), nb, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const cSize = central.reduce((s, a) => s + a.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cSize, true); end.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
