import { initI18n, t, isEn } from './i18n.js';
import { TEXT, HTML, PATTERNS } from './i18n-en.js';
import * as THREE from 'three';
import { OrbitControls } from './lib/OrbitControls.js';
import { parse, Path } from './lib/opentype.module.js';
import { DEFAULTS, WORD_SPACE } from './geometry.js';
import { toSTL, to3MF, toZip } from './export.js';
import { PRINT } from './print-settings.js';

initI18n({ TEXT, HTML, PATTERNS });

const $ = (id) => document.getElementById(id);
// numero con un decimale: virgola in italiano, punto in inglese
const dec = (x) => (isEn ? String(x) : String(x).replace('.', ','));

// ------------------------------------------------------------------ font
const FONTS = [
  { id: 'black-ops-one', name: 'Black Ops One (stencil)', file: 'fonts/black-ops-one.woff' },
  { id: 'rubik-mono-one', name: 'Rubik Mono One (largo)', file: 'fonts/rubik-mono-one.woff' },
  { id: 'bebas-neue', name: 'Bebas Neue (alto e stretto)', file: 'fonts/bebas-neue.woff' },
  { id: 'roboto-black', name: 'Roboto Black', file: 'fonts/roboto-black.woff' },
  { id: 'permanent-marker', name: 'Permanent Marker (pennarello)', file: 'fonts/permanent-marker.woff' },
];
const fontCache = new Map(); // id -> { buf, font }

async function loadFont(id) {
  if (fontCache.has(id)) return fontCache.get(id);
  const f = FONTS.find((x) => x.id === id) || FONTS[0];
  const buf = await (await fetch(f.file)).arrayBuffer();
  const entry = { buf, font: parse(buf) };
  fontCache.set(f.id, entry);
  return entry;
}

// ------------------------------------------------------------------ stato persistente
const store = {
  get(k, d) { try { const v = localStorage.getItem('stamproller.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stamproller.' + k, JSON.stringify(v)); } catch { /* storage non disponibile */ } },
};

const NUM = ['textH', 'gap', 'rollerD', 'relief', 'bodyD', 'markerLen', 'tipLen', 'neckD', 'tipW', 'tipT'];
const MARKER_KEYS = ['bodyD', 'markerLen', 'tipLen', 'neckD', 'tipW', 'tipT', 'tipNominal'];
// Le due misure nominali più comuni. Il blocchetto reale è più grande del nominale: la Posca da 15
// misurata è 16,5 × 9,7; quello da 20 è una stima proporzionale, da verificare.
const TIPS = { 15: { tipNominal: 15, tipW: 16.5, tipT: 9.7 }, 20: { tipNominal: 20, tipW: 21.5, tipT: 11 } };
const BUILTIN_PRESETS = [
  { name: 'Generico 15 mm (valori di partenza)', builtin: true, ...pick(DEFAULTS, MARKER_KEYS) },
  { name: 'Generico 20 mm (valori di partenza)', builtin: true, ...pick(DEFAULTS, MARKER_KEYS), ...TIPS[20], neckD: 24 },
  { name: 'Uni Posca PC-17K 15 mm (punta misurata, corpo da verificare)', builtin: true, ...pick(DEFAULTS, MARKER_KEYS), bodyD: 28, markerLen: 157, ...TIPS[15] },
];

function syncTipRadio(v) {
  const r = document.querySelector(`input[name=tipSize][value="${v}"]`);
  if (r) r.checked = true;
}

function pick(o, keys) { return Object.fromEntries(keys.map((k) => [k, o[k]])); }

function readParams() {
  const p = { text: $('text').value };
  for (const k of NUM) p[k] = parseFloat($(k).value) || DEFAULTS[k];
  p.diameterMode = document.querySelector('input[name=diameterMode]:checked').value;
  p.split = $('split').checked;
  p.bearing = $('bearing').checked;
  p.axle = document.querySelector('input[name=axle]:checked').value;
  p.tipNominal = parseFloat(document.querySelector('input[name=tipSize]:checked').value);
  p.fontId = $('font').value;
  return p;
}

function writeParams(p) {
  if (p.text != null) $('text').value = p.text;
  for (const k of NUM) if (p[k] != null) $(k).value = p[k];
  if (p.diameterMode) document.querySelector(`input[name=diameterMode][value=${p.diameterMode}]`).checked = true;
  if (p.split != null) $('split').checked = p.split;
  if (p.bearing != null) $('bearing').checked = p.bearing;
  if (p.axle) document.querySelector(`input[name=axle][value=${p.axle}]`).checked = true;
  if (p.tipNominal) syncTipRadio(p.tipNominal);
  if (p.fontId && [...$('font').options].some((o) => o.value === p.fontId)) $('font').value = p.fontId;
}

function fillPresets(selectName) {
  const all = [...BUILTIN_PRESETS, ...store.get('presets', [])];
  $('preset').innerHTML = '<option value="">— scegli —</option>' + all.map((p, i) => `<option value="${i}"${p.builtin ? '' : ' translate="no"'}>${escapeHtml(p.name)}</option>`).join('');
  if (selectName) { const i = all.findIndex((p) => p.name === selectName); if (i >= 0) $('preset').value = String(i); }
  return all;
}
function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ------------------------------------------------------------------ scena 3D
const viewerEl = $('viewer');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewerEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#16161a');
const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight('#ffffff', '#40404a', 1.6));
const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(150, -200, 300); scene.add(key);
const rim = new THREE.DirectionalLight('#ffd9a0', 0.9); rim.position.set(-200, 150, -100); scene.add(rim);

const MAT = {
  head: new THREE.MeshStandardMaterial({ color: '#2c2c33', roughness: 0.55, metalness: 0.05, flatShading: true }),
  sleeve: new THREE.MeshStandardMaterial({ color: '#3a3a42', roughness: 0.6, metalness: 0.05, flatShading: true }),
  roller: new THREE.MeshStandardMaterial({ color: '#f5a524', roughness: 0.45, flatShading: true }),
  tire: new THREE.MeshStandardMaterial({ color: '#f5a524', roughness: 0.8, flatShading: true }),
  hub: new THREE.MeshStandardMaterial({ color: '#cfd2d6', roughness: 0.5, flatShading: true }),
  pin: new THREE.MeshStandardMaterial({ color: '#e9e6dd', roughness: 0.6, flatShading: true }),
  spacers: new THREE.MeshStandardMaterial({ color: '#e9e6dd', roughness: 0.6, flatShading: true }),
  bolt: new THREE.MeshStandardMaterial({ color: '#b8bcc4', roughness: 0.3, metalness: 0.8, flatShading: true }),
  bearing: new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.25, metalness: 0.9, flatShading: true }),
  ghost: new THREE.MeshStandardMaterial({ color: '#9fd3ff', roughness: 0.3, transparent: true, opacity: 0.22, depthWrite: false }),
};
const groups = { assembly: new THREE.Group(), print: new THREE.Group() };
scene.add(groups.assembly, groups.print);
const bed = new THREE.GridHelper(220, 22, '#55555f', '#2e2e36');
bed.rotation.x = Math.PI / 2;
groups.print.add(bed);
let rollerMesh = null, ghostMesh = null;
let view = 'assembly';

function toGeometry(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.vertProperties, 3));
  g.setIndex(new THREE.BufferAttribute(m.triVerts, 1));
  return g;
}

function clearGroup(g, keep = []) {
  for (const c of [...g.children]) if (!keep.includes(c)) { g.remove(c); c.traverse((o) => o.geometry?.dispose()); }
}

// n = numero nel nome del file (ordine di montaggio), file/fileEn = nome breve nel file
const PARTS = {
  head: { n: 1, label: 'Testa', file: 'testa', fileEn: 'head', mat: 'PLA/PETG' },
  sleeve: { n: 2, label: 'Impugnatura', file: 'impugnatura', fileEn: 'grip', mat: 'PLA/PETG' },
  hub: { n: 3, label: 'Mozzo', file: 'mozzo', fileEn: 'hub', mat: 'PLA/PETG' },
  roller: { n: 3, label: 'Rullo', file: 'rullo', fileEn: 'roller', mat: 'PLA/PETG' },
  tire: { n: 4, label: 'Battistrada', file: 'battistrada', fileEn: 'tread', mat: 'TPU' },
  pin: { n: 5, label: 'Perno', file: 'perno', fileEn: 'pin', mat: 'PLA/PETG' },
  spacers: { n: 6, label: 'Distanziali ×2', file: 'distanziali-x2', fileEn: 'spacers-x2', mat: 'PLA/PETG' },
};
const matFile = (k) => PARTS[k].mat.replace('/', '-');
// es. stamproller_CIAO_15mm_3-mozzo-608_PLA-PETG.stl
function baseName() {
  const tip = document.querySelector('input[name=tipSize]:checked').value;
  return `stamproller_${slug()}_${tip}mm`;
}
function partFile(k, ext = 'stl') {
  const P = PARTS[k], i = lastResult.info;
  let name = isEn ? P.fileEn : P.file;
  if (k === 'hub' && i.bearing) name += '-608';
  if (k === 'pin') name += `-${i.axleD}mm`;
  return `${baseName()}_${P.n}-${name}_${matFile(k)}.${ext}`;
}
const SPINNING = ['hub', 'tire', 'roller'];

// Pezzi in fila sul piatto, centrati: x calcolato dagli ingombri reali.
function printLayout(print) {
  const order = ['pin', 'spacers', 'sleeve', 'head', 'hub', 'tire', 'roller'].filter((k) => print[k]);
  const span = (m) => { let a = Infinity, b = -Infinity; const V = m.vertProperties; for (let i = 0; i < V.length; i += 3) { if (V[i] < a) a = V[i]; if (V[i] > b) b = V[i]; } return [a, b]; };
  const spans = order.map((k) => span(print[k]));
  const gap = 8;
  const total = spans.reduce((s, [a, b]) => s + (b - a), 0) + gap * (order.length - 1);
  let x = -total / 2;
  const lay = {};
  order.forEach((k, i) => { const [a, b] = spans[i]; lay[k] = [x - a, 0]; x += b - a + gap; });
  return lay;
}

let lastResult = null;
function showResult(r) {
  lastResult = r;
  clearGroup(groups.assembly);
  clearGroup(groups.print, [bed]);
  rollerMesh = new THREE.Group();
  rollerMesh.position.set(0, 0, r.info.axleZ);
  groups.assembly.add(rollerMesh);
  for (const k of Object.keys(r.assembly)) {
    const geo = toGeometry(r.assembly[k]);
    const mesh = new THREE.Mesh(geo, MAT[k]);
    if (SPINNING.includes(k)) {
      geo.translate(0, 0, -r.info.axleZ);
      rollerMesh.add(mesh);
      continue;
    }
    if (k === 'ghost') { ghostMesh = mesh; mesh.visible = $('showGhost').checked; mesh.renderOrder = 2; }
    groups.assembly.add(mesh);
  }
  const lay = printLayout(r.print);
  renderDownloads(r.print);
  for (const k of Object.keys(r.print)) {
    const mesh = new THREE.Mesh(toGeometry(r.print[k]), MAT[k]);
    mesh.position.set(lay[k][0], lay[k][1], 0);
    groups.print.add(mesh);
  }
  if (!showResult.fitted) { fit(); showResult.fitted = true; }
  invalidate();
}

function setView(v) {
  view = v;
  groups.assembly.visible = v === 'assembly';
  groups.print.visible = v === 'print';
  fit();
  invalidate();
}

function fit() {
  const g = groups[view];
  const box = new THREE.Box3();
  g.traverse((o) => { if (o.isMesh && o.visible) box.expandByObject(o); });
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const fitFov = camera.aspect < 1 ? Math.atan(Math.tan(fov) * camera.aspect) : fov;
  const dir = view === 'assembly' ? new THREE.Vector3(1.1, -1.3, 0.55) : new THREE.Vector3(0.2, -1, 0.9);
  camera.position.copy(c).add(dir.normalize().multiplyScalar((radius / Math.sin(fitFov)) * 1.05));
  controls.target.copy(c);
  controls.update();
}

function resize() {
  const w = viewerEl.clientWidth, h = viewerEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  invalidate();
  drawImprint();
}
new ResizeObserver(resize).observe(viewerEl);

// Disegno solo quando serve (camera mossa, modello nuovo, rullo che gira): risparmia CPU e batteria.
let dirty = true;
const invalidate = () => { dirty = true; };
controls.addEventListener('change', invalidate);
let prevT = performance.now();
renderer.setAnimationLoop((t) => {
  const dt = Math.min((t - prevT) / 1000, 0.1); prevT = t;
  if (rollerMesh && $('spin').checked && view === 'assembly') { rollerMesh.rotation.x -= dt * 0.8; dirty = true; }
  controls.update();
  if (dirty) { renderer.render(scene, camera); dirty = false; }
});

// ------------------------------------------------------------------ anteprima del segno
function drawImprint() {
  const cv = $('imprint');
  const dpr = Math.min(devicePixelRatio, 2);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W) return;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper');
  ctx.fillRect(0, 0, W, H);
  const r = lastResult, entry = fontCache.get($('font').value) || fontCache.get('custom');
  if (!r || !entry || !r.info.repeats) { $('imprintInfo').textContent = ''; return; }
  const p = readParams(), info = r.info, font = entry.font;
  const pxmm = (H - 16) / info.rollerWidth;
  const os2 = font.tables.os2;
  const capRatio = os2 && os2.sCapHeight ? os2.sCapHeight / font.unitsPerEm : 0.7;
  const fsize = p.textH / capRatio;                  // dimensione del font in mm, come in geometry.js
  const sx = info.textScaleX || 1;
  // stesse regole del rullo: parole composte una per una con lo spazio corto
  const words = p.text.trim().split(/\s+/).filter(Boolean);
  const wordsPath = (x0, y0) => {
    const out = new Path();
    let x = x0;
    for (const w of words) { out.extend(font.getPath(w, x, y0, fsize)); x += font.getAdvanceWidth(w, fsize) + WORD_SPACE; }
    return out;
  };
  const probe = wordsPath(0, 0).getBoundingBox();
  // striscia del rullo
  ctx.fillStyle = 'rgba(0,0,0,.06)';
  ctx.fillRect(0, H / 2 - (info.rollerWidth * pxmm) / 2, W, info.rollerWidth * pxmm);
  ctx.globalAlpha = 0.86;
  const k = info.textScale * pxmm;                   // mm del font -> pixel
  const step = info.pitchU * pxmm;
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink');
  for (let x = 12; x < W + step; x += step) {
    ctx.save();
    ctx.translate(x, H / 2);
    ctx.scale(k * sx, k);
    ctx.translate(-probe.x1, -(probe.y1 + probe.y2) / 2);
    const path = wordsPath(0, 0);
    path.fill = ink;
    path.draw(ctx);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // tacche di giro
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  const rev = info.circumference * pxmm;
  for (let x = 12, n = 0; x < W; x += rev, n++) { ctx.fillRect(x, H - 6, 1, 6); }
  $('imprintInfo').textContent = `un giro = ${info.circumference.toFixed(0)} mm · tacche = inizio di ogni giro`;
}

// ------------------------------------------------------------------ build nel worker
// Un worker nuovo per ogni build: la memoria wasm non si accumula e un build vecchio si annulla
// chiudendo il suo worker. Ne tengo uno di riserva già inizializzato per non pagare l'avvio.
let worker = null, spare = null, reqId = 0, debounce = 0;

function makeWorker() {
  const w = new Worker('./worker.js', { type: 'module' });
  w.onmessage = (ev) => { w.terminate(); if (w === worker) worker = null; onResult(ev, w); };
  w.onerror = (e) => {
    if (w !== worker) return;
    setStatus('Errore nel generatore: ' + (e.message || 'sconosciuto'), true); busy(false);
  };
  return w;
}

function takeWorker() {
  if (worker) worker.terminate();
  worker = spare || makeWorker();
  spare = makeWorker();
  return worker;
}

function requestBuild() {
  clearTimeout(debounce);
  debounce = setTimeout(doBuild, 300);
}

async function doBuild() {
  const p = readParams();
  store.set('params3', p); // v3: spazio tra ripetizioni 3 mm (10 faceva incastrare la punta)
  $('rollerD').disabled = p.diameterMode !== 'fixed';
  const id = ++reqId;
  let entry;
  try {
    entry = p.fontId === 'custom' ? fontCache.get('custom') : await loadFont(p.fontId);
  } catch (e) {
    setStatus('Font non caricato: ' + e.message, true); return;
  }
  if (id !== reqId) return;
  const w = takeWorker();
  busy(true);
  w.t0 = performance.now();
  w.postMessage({ id, params: p, font: entry.buf.slice(0) });
}

function onResult({ data }, w) {
  if (data.id !== reqId) return;
  busy(false);
  if (!data.ok) { setStatus('Errore: ' + data.error, true); return; }
  showResult(data);
  renderInfo(data.info);
  renderWarnings(data.warnings);
  drawImprint();
  $('dl3mf').disabled = false;
  $('dlZip').disabled = false;
  const split = !!data.print.tire;
  $('dl3mf').textContent = split ? 'Pezzi rigidi PLA/PETG (.3mf)' : 'Kit completo (.3mf)';
  $('dl3mfTpu').hidden = !split;
  renderSettings(data.print);
  setStatus(`Pronto · ${dec((data.ms / 1000).toFixed(1))} s`);
}

function busy(on) { $('busy').classList.toggle('on', on); }
function setStatus(msg, err = false) { const s = $('status'); s.textContent = msg; s.classList.toggle('err', err); }

function renderInfo(i) {
  const rows = [
    ['Rullo', `Ø ${i.rollerDiameter.toFixed(1)} × ${i.rollerWidth} mm`],
    ['Ripetizioni', i.repeats ? `${i.repeats} per giro` : '—'],
    ['Testo', i.repeats ? `${i.textWidth.toFixed(0)} × ${i.textHeight.toFixed(1)} mm${i.textScale < 0.999 ? ` (scala ${Math.round(i.textScale * 100)}%)` : ''}` : '—'],
    ['Corpo', `${i.handleLength.toFixed(0)} mm, Ø ${i.handleOuterD.toFixed(1)} (ghiera Ø ${i.ringD.toFixed(1)})`],
    ['Regolazione', `±${i.adjust} mm avvitando l'impugnatura`],
    ['Cuscinetto', i.bearingTxt],
    ['Asse', i.pin],
    ['Materiali', i.split ? 'battistrada in TPU, il resto PLA/PETG' : 'tutto PLA/PETG'],
  ];
  $('info').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function renderDownloads(print) {
  const box = $('dlParts');
  box.innerHTML = '';
  for (const k of Object.keys(print)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${PARTS[k].label} <small>${PARTS[k].mat}</small>`;
    b.onclick = () => download(toSTL(lastResult.print[k]), partFile(k), 'model/stl');
    box.appendChild(b);
  }
}

function renderWarnings(w) {
  $('warnings').innerHTML = w.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
}

// ------------------------------------------------------------------ download
function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug() {
  const s = $('text').value.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return s || (isEn ? 'plain' : 'liscio');
}
// Un 3MF per materiale (i pezzi rigidi insieme, il battistrada TPU da solo), senza impostazioni di
// stampa: solo i pezzi già disposti sul piatto. Le impostazioni sono nella tabella e nel LEGGIMI.
function download3MF(keys, file, title) {
  const r = lastResult;
  const sub = Object.fromEntries(keys.map((k) => [k, r.print[k]]));
  const lay = printLayout(sub);
  download(to3MF(keys.map((k) => ({
    name: `${PARTS[k].n}-${t(PARTS[k].label)} (${PARTS[k].mat})`, mesh: sub[k], offset: lay[k],
  })), { title }), file, 'model/3mf');
}
$('dl3mf').onclick = () => {
  const split = !!lastResult.print.tire;
  const what = split ? (isEn ? 'rigid-parts_PLA-PETG' : 'pezzi-rigidi_PLA-PETG') : 'kit_PLA-PETG';
  download3MF(Object.keys(lastResult.print).filter((k) => k !== 'tire'), `${baseName()}_${what}.3mf`, `Stamp Roller ${$('text').value.trim()}`);
};
$('dl3mfTpu').onclick = () => download3MF(['tire'], partFile('tire', '3mf'), `Stamp Roller ${$('text').value.trim()} TPU`);
$('dlZip').onclick = () => {
  const keys = Object.keys(lastResult.print).sort((a, b) => PARTS[a].n - PARTS[b].n);
  const files = keys.map((k) => [partFile(k), toSTL(lastResult.print[k])]);
  files.push([isEn ? 'README.txt' : 'LEGGIMI.txt', readmeText(keys)]);
  download(toZip(files), `${baseName()}_STL.zip`, 'application/zip');
};

// Testo del LEGGIMI nello zip: elenco file con materiale e impostazioni, viteria, montaggio.
function readmeText(keys) {
  const i = lastResult.info, p = readParams();
  const L = [];
  const row = (k) => {
    const s = PRINT[k];
    return isEn
      ? `${partFile(k)}\n    ${PARTS[k].mat} · ${t(s.placement)} · walls ${s.walls} · infill ${s.infill}% · layer ${s.layer} mm`
      : `${partFile(k)}\n    ${PARTS[k].mat} · ${s.placement} · pareti ${s.walls} · riempimento ${s.infill}% · layer ${dec(s.layer)} mm`;
  };
  if (isEn) {
    L.push(`STAMP ROLLER "${p.text.trim()}" — ${p.tipNominal} mm marker`, '',
      `Marker: Ø ${p.bodyD} mm, length ${p.markerLen} mm, tip ${p.tipW} × ${p.tipT} mm`,
      `Roller: Ø ${i.rollerDiameter.toFixed(1)} × ${i.rollerWidth} mm, ${i.repeats} repeat(s) per turn`, '',
      'FILES (no supports for any part)', ...keys.map(row), '',
      'HARDWARE', i.bearing ? '  1 × 608 bearing (8×22×7, skateboard type)' : '  no bearing',
      `  axle: ${t(i.pin)}`, '',
      'ASSEMBLY',
      ...(i.split ? ['  1. Slide the TPU tread onto the hub from the side without the flange, teeth aligned.'] : []),
      ...(i.bearing ? ['  2. Press the 608 into the hub seat; push one spacer into each side hole.'] : []),
      '  3. Drop the roller in between the arms from above, then insert the pin (or screw + lock nut).',
      '  4. Insert the marker into the head with the tip in the slot, screw on the grip until the tip touches the roller.',
      '  5. Too much paint on the roller? Back the grip off half a turn.', '',
      'https://balzowits.github.io/stamp-roller/');
  } else {
    L.push(`STAMP ROLLER "${p.text.trim()}" — marker da ${p.tipNominal} mm`, '',
      `Marker: Ø ${dec(p.bodyD)} mm, lunghezza ${dec(p.markerLen)} mm, punta ${dec(p.tipW)} × ${dec(p.tipT)} mm`,
      `Rullo: Ø ${dec(i.rollerDiameter.toFixed(1))} × ${i.rollerWidth} mm, ${i.repeats} ripetizioni per giro`, '',
      'FILE (nessun pezzo ha bisogno di supporti)', ...keys.map(row), '',
      'VITERIA', i.bearing ? '  1 cuscinetto 608 (8×22×7, da skateboard)' : '  nessun cuscinetto',
      `  asse: ${i.pin}`, '',
      'MONTAGGIO',
      ...(i.split ? ['  1. Infila il battistrada TPU sul mozzo dal lato senza bordino, allineando i denti.'] : []),
      ...(i.bearing ? ['  2. Premi il 608 nella sede del mozzo; infila un distanziale in ciascun foro laterale.'] : []),
      '  3. Cala il rullo dall\'alto tra i bracci, poi infila il perno (o vite + dado autobloccante).',
      '  4. Infila il marker nella testa con la punta nella feritoia, avvita l\'impugnatura finché la punta tocca il rullo.',
      '  5. Troppa vernice sul rullo? Svita l\'impugnatura di mezzo giro.', '',
      'https://balzowits.github.io/stamp-roller/');
  }
  return L.join('\r\n') + '\r\n';
}

function renderSettings(print) {
  const rows = Object.keys(print).map((k) => {
    const s = PRINT[k];
    return `<tr><td>${PARTS[k].label}<small>${PARTS[k].mat} · ${s.placement}</small></td><td>${s.walls}</td><td>${s.infill}%</td><td>${dec(s.layer)}</td></tr>`;
  });
  $('settings').innerHTML = `<tr><th>Pezzo</th><th>Pareti</th><th>Riemp.</th><th>Layer</th></tr>${rows.join('')}`;
}

// ------------------------------------------------------------------ eventi
$('font').innerHTML = FONTS.map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
let presets = fillPresets();
writeParams({ ...DEFAULTS, text: t(DEFAULTS.text), ...store.get('params3', {}), fontId: (store.get('params3', {}).fontId === 'custom' ? FONTS[0].id : store.get('params3', {}).fontId) });

for (const el of document.querySelectorAll('.panel input:not([type=file]), .panel select:not(#preset)')) {
  el.addEventListener('input', () => {
    if (el.name === 'tipSize') writeParams(TIPS[el.value]);
    if (MARKER_KEYS.includes(el.id) || el.name === 'tipSize') $('preset').value = '';
    requestBuild();
  });
}
$('preset').addEventListener('change', () => {
  const pr = presets[+$('preset').value];
  if (pr) { writeParams(pick(pr, MARKER_KEYS)); requestBuild(); }
});
$('savePreset').onclick = () => {
  const name = (prompt(t('Nome del preset (es. Molotow 627HS):')) || '').trim();
  if (!name) return;
  const user = store.get('presets', []).filter((p) => p.name !== name);
  user.push({ name, ...pick(readParams(), MARKER_KEYS) });
  store.set('presets', user);
  presets = fillPresets(name);
};
$('delPreset').onclick = () => {
  const pr = presets[+$('preset').value];
  if (!pr || pr.builtin) return;
  store.set('presets', store.get('presets', []).filter((p) => p.name !== pr.name));
  presets = fillPresets();
};
$('fontFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    fontCache.set('custom', { buf, font: parse(buf) });
    let opt = $('font').querySelector('option[value=custom]');
    if (!opt) { opt = new Option('', 'custom'); opt.setAttribute('translate', 'no'); $('font').add(opt); }
    opt.textContent = `${t('Caricato:')} ${file.name}`;
    $('font').value = 'custom';
    requestBuild();
  } catch (err) { setStatus('Font non leggibile: ' + err.message, true); }
});
for (const r of document.querySelectorAll('input[name=view]')) r.addEventListener('change', () => setView(r.value));
$('showGhost').addEventListener('change', () => { if (ghostMesh) ghostMesh.visible = $('showGhost').checked; invalidate(); });
$('fit').onclick = fit;

window.__sr = { camera, controls, THREE, fit }; // per test e debug da console
setView('assembly');
setStatus('Genero il primo modello…');
doBuild();
