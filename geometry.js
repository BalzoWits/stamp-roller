// Geometria parametrica del rullo-timbro per marker da 15 mm.
// Modulo puro: gira identico nel browser (worker) e in node (test).
// Assi (assemblato): il marker punta verso +Z, la faccia anteriore del manico è a z = 0,
// l'asse del rullo è parallelo a X (stessa direzione della larghezza della punta).

const TAU = Math.PI * 2;

export const DEFAULTS = {
  // marker
  bodyD: 30,        // diametro massimo del corpo
  markerLen: 140,   // lunghezza da punta a fondo
  tipLen: 12,       // quanto sporge la punta oltre l'ultimo collarino
  tipW: 15,         // larghezza punta
  tipT: 5,          // spessore punta
  neckD: 20,        // diametro dell'ultimo collarino (sotto la punta)
  // timbro
  text: 'CIAO',
  textH: 10,        // altezza delle maiuscole
  relief: 1.2,      // rilievo delle lettere
  gap: 10,          // spazio tra una ripetizione e l'altra
  diameterMode: 'auto', // 'auto' | 'fixed'
  rollerD: 36,      // diametro esterno (solo in modalità fixed)
  rollerW: 18,      // larghezza del rullo
  minStroke: 0.8,   // tratto minimo stampabile
  split: true,      // rullo in due pezzi: mozzo rigido + battistrada TPU
};

// Costanti di progetto (non esposte nel sito)
const K = {
  boreClr: 0.25,   // gioco radiale del foro sul corpo
  wall: 3.6,       // parete di impugnatura e corpo della testa
  plateT: 2,       // spessore della piastra con la feritoia
  slotClr: 0.3,    // gioco della feritoia per lato
  threadLen: 21,   // lunghezza filetto (3 spire)
  threadEng: 14,   // impegno nominale testa/impugnatura (il resto è regolazione)
  thrDepth: 2,     // profondità del filetto tondo
  pitch: 7,        // passo (fianchi a ~45°: stampabile in verticale)
  thrClr: 0.5,     // gioco radiale del filetto (~0,35 mm sul fianco)
  maleWall: 1.6,   // parete sotto il fondo del filetto maschio
  floor: 2,        // fondo chiuso dell'impugnatura
  armT: 4.5,       // spessore bracci forcella
  armGap: 0.8,     // distanza braccio-rullo
  boss: 0.5,       // rondella integrata sul braccio
  armR: 7.5,       // raggio della testa del braccio attorno all'asse
  bossR: 4.5,      // raggio della rondella integrata
  pinR: 2.5,       // perno stampato Ø5
  pinFlat: 2.25,   // piatti del perno (stampa sdraiato): mezza altezza
  axleHole: 2.65,  // raggio foro perno nei bracci
  rollerBore: 2.8, // raggio foro nel rullo (gira libero sul perno)
  pinHeadR: 4.5,
  pinHeadT: 1.6,
  pinLip: 0.45,    // dente dello scatto
  pinSlot: 1.3,    // taglio tra le due linguette
  tireWall: 2.2,   // spessore del battistrada TPU sotto le lettere
  hubFlange: 1,    // bordino di battuta del mozzo
  teeth: 8,        // denti anti-rotazione mozzo/battistrada
  toothW: 2.2,
  toothH: 0.9,
  tpuFit: 0.1,     // interferenza del battistrada sul mozzo
  contact: 0.3,    // interferenza punta-lettere
  rMin: 12,        // raggio esterno minimo del rullo
  rMax: 24,        // raggio esterno massimo
  textMargin: 1,   // margine del testo sui fianchi del rullo
};

export const LIMITS = { rMin: K.rMin, rMax: K.rMax, threadAdjust: K.threadLen - K.threadEng - 0 };

// ---------------------------------------------------------------- testo -> CrossSection
function textCross(CrossSection, font, text, size) {
  const path = font.getPath(text, 0, 0, size);
  const contours = [];
  let cur = [];
  let px = 0, py = 0;
  const push = (x, y) => cur.push([x, -y]);
  const close = () => { if (cur.length > 2) contours.push(cur); cur = []; };
  // segmenti per curva in base alla lunghezza del poligono di controllo (~0.35 mm a segmento)
  const segs = (len) => Math.min(12, Math.max(1, Math.ceil(len / 0.35)));
  for (const c of path.commands) {
    if (c.type === 'M') { close(); push(c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'L') { push(c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'Q') {
      const n = segs(Math.hypot(c.x1 - px, c.y1 - py) + Math.hypot(c.x - c.x1, c.y - c.y1));
      for (let i = 1; i <= n; i++) {
        const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
        push(a * px + b * c.x1 + d * c.x, a * py + b * c.y1 + d * c.y);
      }
      px = c.x; py = c.y;
    } else if (c.type === 'C') {
      const n = segs(Math.hypot(c.x1 - px, c.y1 - py) + Math.hypot(c.x2 - c.x1, c.y2 - c.y1) + Math.hypot(c.x - c.x2, c.y - c.y2));
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, e = 3 * u * t * t, d = t * t * t;
        push(a * px + b * c.x1 + e * c.x2 + d * c.x, a * py + b * c.y1 + e * c.y2 + d * c.y);
      }
      px = c.x; py = c.y;
    } else if (c.type === 'Z') close();
  }
  close();
  return new CrossSection(contours, 'NonZero').simplify(0.02);
}

// Calcola raggio, numero di ripetizioni e scala del testo sul rullo.
export function layoutText(textW, gap, mode, rollerD) {
  const unit = textW + gap;
  let scale = 1, n = 1, Ro;
  if (mode === 'fixed') {
    Ro = Math.min(Math.max(rollerD / 2, K.rMin), K.rMax);
    const C = TAU * Ro;
    n = Math.floor(C / unit);
    if (n < 1) { n = 1; scale = (C - gap) / textW; }
  } else {
    Ro = unit / TAU;
    if (Ro < K.rMin) {
      n = Math.ceil((TAU * K.rMin) / unit);
      Ro = (n * unit) / TAU;
    } else if (Ro > K.rMax) {
      Ro = K.rMax;
      scale = (TAU * Ro - gap) / textW;
    }
  }
  return { Ro, n, scale, C: TAU * Ro, pitchU: (TAU * Ro) / n };
}

// ---------------------------------------------------------------- costruzione
export function buildAll(wasm, font, params) {
  const { Manifold, CrossSection } = wasm;
  const p = { ...DEFAULTS, ...params };
  const warnings = [];
  const seg = (r) => Math.max(48, Math.ceil((TAU * r) / 0.6));
  const cyl = (h, r1, r2 = r1) => Manifold.cylinder(h, r1, r2, seg(Math.max(r1, r2)));
  const cylX = (h, r, x0, z) => cyl(h, r).rotate([0, 90, 0]).translate([x0, 0, z]);

  // ---- controlli di base
  if (p.bodyD < 15 || p.bodyD > 45) warnings.push(`Diametro corpo ${p.bodyD} mm fuori dal campo previsto (15–45).`);
  if (p.markerLen - p.tipLen < 50) warnings.push('Lunghezza marker troppo corta rispetto alla punta.');
  if (p.neckD / 2 + 0.5 > p.bodyD / 2 + K.boreClr - 0.5) warnings.push('Il collarino non può essere più largo del corpo: uso il massimo possibile.');

  // ---------------------------------------------------------------- testo e rullo
  const W = p.rollerW;
  const split = !!p.split;
  const fl = split ? K.hubFlange : 0;     // il bordino del mozzo ruba larghezza al battistrada
  const txt = (p.text || '').trim();
  let textInfo = { n: 0, scale: 1, textW: 0 };
  let Ro, relief = p.relief;
  let textSolid = null;

  if (txt) {
    const os2 = font.tables.os2;
    const capRatio = os2 && os2.sCapHeight ? os2.sCapHeight / font.unitsPerEm : 0.7;
    let cs = textCross(CrossSection, font, txt, p.textH / capRatio);
    if (cs.isEmpty()) throw new Error('Il font non contiene i caratteri del testo.');
    let b = cs.bounds();
    let bw = b.max[0] - b.min[0], bh = b.max[1] - b.min[1];
    const hAvail = W - fl - 2 * K.textMargin;
    let hScale = 1;
    if (bh > hAvail) {
      hScale = hAvail / bh;
      warnings.push(`Testo troppo alto per un rullo largo ${W} mm: ridotto al ${Math.round(hScale * 100)}%.`);
    }
    cs = cs.translate([-b.min[0], -(b.min[1] + b.max[1]) / 2]).scale([hScale, hScale]);
    bw *= hScale; bh *= hScale;

    const L = layoutText(bw, p.gap, p.diameterMode, p.rollerD);
    if (L.scale < 1) {
      cs = cs.scale([L.scale, L.scale]);
      warnings.push(`Testo troppo lungo per il diametro massimo (${2 * K.rMax} mm): ridotto al ${Math.round(L.scale * 100)}%.`);
      bw *= L.scale; bh *= L.scale;
    }
    Ro = L.Ro;

    // tratto minimo: quanto del testo sparisce se tolgo i tratti più sottili di minStroke
    const area = cs.area();
    const h = p.minStroke / 2;
    const robust = cs.offset(-h, 'Round').offset(h, 'Round');
    const lost = 1 - robust.area() / area;
    if (lost > 0.08) warnings.push(`Tratti sottili: circa il ${Math.round(lost * 100)}% del testo è sotto ${p.minStroke} mm. Aumenta l'altezza o usa un font più grosso.`);

    // ripetizioni lungo la circonferenza, poi specchio (u -> -u)
    const copies = [];
    for (let k = 0; k < L.n; k++) copies.push(cs.translate([k * L.pitchU, 0]));
    const ring = CrossSection.compose(copies).scale([-1, 1]);

    const sink = 0.6;
    const Rbase = Ro - relief - sink;
    textSolid = ring.extrude(relief + sink).refineToLength(0.8).warp((v) => {
      const u = v[0], w = v[1], r = Rbase + v[2], th = u / Ro;
      v[0] = w + fl / 2; v[1] = r * Math.cos(th); v[2] = r * Math.sin(th);
    });
    textInfo = { n: L.n, scale: hScale * L.scale, textW: bw, textHreal: bh, C: L.C, pitchU: L.pitchU };
  } else {
    Ro = p.diameterMode === 'fixed' ? Math.min(Math.max(p.rollerD / 2, K.rMin), K.rMax) : K.rMin;
    warnings.push('Nessun testo: il rullo è liscio.');
  }

  const Rc = Ro - relief;
  // i pezzi del rullo si costruiscono lungo Z (x=0..W) e poi si girano sull'asse X centrato
  const toX = (m) => m.rotate([0, 90, 0]).translate([-W / 2, 0, 0]);
  const bore = cyl(W + 2, K.rollerBore).translate([0, 0, -1]);
  const rollerParts = {};
  if (split) {
    const Rhub = Rc - K.tireWall;
    const teeth = [];
    for (let i = 0; i < K.teeth; i++) {
      teeth.push(CrossSection.square([K.toothW, K.toothH + 0.5]).translate([-K.toothW / 2, Rhub - 0.5]).rotate((360 * i) / K.teeth));
    }
    const hubCs = CrossSection.union([CrossSection.circle(Rhub, seg(Rhub)), ...teeth]);
    // mozzo: bordino sotto (stampa) + corpo dentato, smusso d'invito in cima
    const hubBody = hubCs.extrude(W - fl).translate([0, 0, fl])
      .intersect(cyl(W - 0.6, Rhub + K.toothH + 1).add(cyl(0.6, Rhub + K.toothH + 1, Rhub - 0.2).translate([0, 0, W - 0.6])));
    const hub = cyl(fl, Rhub + 1.2).add(hubBody).subtract(bore);
    // battistrada: anello con l'impronta dei denti, leggermente più stretta (montaggio a pressione)
    const ring = CrossSection.circle(Rc, seg(Rc)).subtract(hubCs.offset(-K.tpuFit, 'Miter'));
    let tire = toX(ring.extrude(W - fl).translate([0, 0, fl]));
    if (textSolid) tire = tire.add(textSolid.subtract(toX(cyl(W + 2, Rhub + K.toothH + 0.2).translate([0, 0, -1]))));
    rollerParts.hub = toX(hub);
    rollerParts.tire = tire;
    if (Rhub - K.rollerBore < 2.5) warnings.push('Mozzo sottile: aumenta il diametro del rullo.');
  } else {
    let roller = toX(cyl(W, Rc));
    if (textSolid) roller = roller.add(textSolid);
    rollerParts.roller = roller.subtract(toX(bore));
  }

  // ---------------------------------------------------------------- manico
  const Rb = p.bodyD / 2 + K.boreClr;
  const Rh = Rb + K.wall;
  const neckR = Math.min(p.neckD / 2 + 0.5, Rb - 0.5);
  const plateT = K.plateT;
  const zTip = -plateT + p.tipLen;                 // estremità della punta
  const zConeTop = -plateT, zConeBase = zConeTop - (Rb - neckR);
  const zb = -plateT - (p.markerLen - p.tipLen);   // fondo del marker
  // Corpo in due pezzi: TESTA (piastra, forcella, ghiera con filetto femmina) e IMPUGNATURA
  // (tubo chiuso sul fondo con filetto maschio). Il filetto fa anche da regolazione di lunghezza.
  const P = K.pitch, Lt = K.threadLen, hT = K.thrDepth;
  const zh = zConeBase - 2 - Lt - 5;               // retro della testa (bocca del filetto)
  const shift = Lt - K.threadEng;                  // filetto maschio scoperto in posizione nominale
  const zs = zh - shift;                           // spalla dell'impugnatura (inizio filetto maschio)
  const zr = zb - K.floor;                         // fondo dell'impugnatura
  if (zs - zr < 25) warnings.push('Marker corto: l\'impugnatura viene molto bassa, controlla le misure.');
  const zc = zTip + Ro - K.contact;                // asse del rullo

  if (p.tipLen <= plateT + 2) warnings.push('La punta sporge troppo poco oltre la piastra: controlla "sporgenza punta".');

  // Filetto tondo a passo largo. Una sezione "a chiocciola" r(θ) = fondo + h·(1+cos θ)/2 estrusa con
  // torsione di 360° per passo dà in ogni direzione un profilo assiale sinusoidale: creste arrotondate,
  // fianchi a ~45°, un solo principio. Il femmina è la stessa sezione allargata del gioco.
  const rootM = Rb + K.maleWall;                   // fondo del maschio
  const maleMax = rootM + hT;                      // cresta del maschio = diametro dell'impugnatura
  const femMax = maleMax + K.thrClr;
  const Rj = femMax + 2.2;                         // testa: parete attorno al femmina
  const thread = (clr, len) => {
    const n = seg(maleMax), pts = [];
    for (let i = 0; i < n; i++) {
      const th = (TAU * i) / n, r = rootM + clr + hT * (0.5 + 0.5 * Math.cos(th));
      pts.push([r * Math.cos(th), r * Math.sin(th)]);
    }
    return new CrossSection([pts]).extrude(len, Math.ceil(len / 0.25), (360 * len) / P);
  };

  // testa: cilindro pieno Ø Rj, zigrinato sulla ghiera, smusso anteriore
  const zRingTop = zh + Lt + 5;
  let handle = cyl(-2 - zh, Rj).translate([0, 0, zh]).add(cyl(2, Rj, Rj - 1.5).translate([0, 0, -2]));
  const ringKnurl = [];
  const nRK = Math.round((TAU * Rj) / 4);
  for (let i = 0; i < nRK; i++) {
    const a = (TAU * i) / nRK;
    ringKnurl.push(Manifold.cylinder(zRingTop - zh - 2, 1, 1, 16).translate([Math.cos(a) * (Rj + 0.3), Math.sin(a) * (Rj + 0.3), zh + 1]));
  }
  handle = handle.subtract(Manifold.union(ringKnurl));

  // forcella: bracci spessi, base larga quanto la testa
  const x0 = W / 2 + K.armGap;
  const xOut = x0 + K.armT;
  // Ogni braccio è un cuneo: inviluppo tra la testa attorno al perno (spessa armT) e tutto il
  // segmento di testa oltre la faccia interna. Faccia interna dritta, faccia esterna inclinata
  // fino al bordo della testa: regge la flessione laterale.
  const baseSeg = CrossSection.circle(Rj - 1, seg(Rj))
    .intersect(CrossSection.square([Rj, 2 * Rj]).translate([x0, -Rj]))
    .extrude(1.5).translate([0, 0, -1.5]);
  const arm = Manifold.hull([baseSeg, cylX(K.armT, K.armR, x0, zc)]);
  // sede piana per testa e scatto del perno sulla faccia esterna inclinata
  const spot = cylX(Rj, K.pinHeadR + 0.7, xOut, zc);
  handle = handle
    .add(arm.subtract(spot))
    .add(arm.subtract(spot).mirror([1, 0, 0]))
    .add(cylX(K.boss + 0.1, K.bossR, x0 - K.boss, zc))
    .add(cylX(K.boss + 0.1, K.bossR, -x0 - 0.1, zc));

  // cavità della testa: filetto femmina + smusso a 45° (stampabile senza supporti) + foro + cono + feritoia
  const femTop = zh + Lt + 1;
  const cavity = Manifold.union([
    thread(K.thrClr, Lt + 1 + P).translate([0, 0, zh - P]),
    cyl(femMax - Rb, femMax, Rb).translate([0, 0, femTop - 0.01]),
    cyl(zConeBase - zh + 1, Rb).translate([0, 0, zh - 1]),
    cyl(zConeTop - zConeBase, Rb, neckR).translate([0, 0, zConeBase]),
    Manifold.cube([p.tipW + 2 * K.slotClr, p.tipT + 2 * K.slotClr, plateT + 0.4], true).translate([0, 0, -plateT / 2]),
  ]);
  handle = handle.subtract(cavity).subtract(cylX(2 * xOut + 2, K.axleHole, -xOut - 1, zc));

  // ---------------------------------------------------------------- impugnatura
  const chamfer = cyl(Lt - 1.5, maleMax + 0.5).add(cyl(1.5, maleMax + 0.5, maleMax - 1).translate([0, 0, Lt - 1.5]));
  let sleeve = Manifold.union([
    cyl(zs - zr - 0.6, Rh).translate([0, 0, zr + 0.6]),
    cyl(0.6, Rh - 0.6, Rh).translate([0, 0, zr]),
    thread(0, Lt).intersect(chamfer).translate([0, 0, zs - 0.01]),
  ]).subtract(cyl(zs + Lt - zb + 1, Rb).translate([0, 0, zb]));  // foro: il fondo resta chiuso
  // scanalature di presa
  const gz0 = zr + 4, gz1 = zs - 4;
  if (gz1 - gz0 > 15) {
    const grooves = [];
    const nG = Math.round((TAU * Rh) / 6.5);
    for (let i = 0; i < nG; i++) {
      const a = (TAU * i) / nG;
      grooves.push(Manifold.cylinder(gz1 - gz0, 1.2, 1.2, 24).translate([Math.cos(a) * (Rh + 0.5), Math.sin(a) * (Rh + 0.5), gz0]));
    }
    sleeve = sleeve.subtract(Manifold.union(grooves));
  }
  // in posizione nominale (impegno threadEng): fase del filetto coerente con il femmina
  const sleeveAsm = sleeve.rotate([0, 0, -(360 * shift) / P]);

  // ---------------------------------------------------------------- marker fantasma (solo anteprima)
  const ghost = Manifold.union([
    cyl(zConeBase - 1 - zb, p.bodyD / 2).translate([0, 0, zb]),
    cyl(-plateT - (zConeBase - 1), Math.min(p.neckD / 2, neckR - 0.3)).translate([0, 0, zConeBase - 1]),
    Manifold.cube([p.tipW, p.tipT, zTip + plateT], true).translate([0, 0, (zTip - plateT) / 2]),
  ]);

  // ---------------------------------------------------------------- perno stampato
  // Asse X, testa a -X, scatto a +X: due linguette separate da un taglio verticale che si
  // stringono passando nel foro del braccio. Piatti sopra/sotto per stamparlo sdraiato.
  const lipX = xOut + 0.2, lipL = 1.6;
  let pin = Manifold.union([
    cylX(K.pinHeadT, K.pinHeadR, -xOut - K.pinHeadT, 0),
    cylX(lipX + xOut + 0.01, K.pinR, -xOut - 0.01, 0),
    cyl(lipL, K.pinR + K.pinLip, K.pinR - 0.4).rotate([0, 90, 0]).translate([lipX, 0, 0]),
  ]);
  const slotFrom = xOut - K.armT - 2;
  pin = pin
    .subtract(Manifold.cube([lipX + lipL - slotFrom + 1, K.pinSlot, 20]).translate([slotFrom, -K.pinSlot / 2, -10]))
    .subtract(Manifold.cylinder(20, K.pinSlot / 2, K.pinSlot / 2, 24).translate([slotFrom, 0, -10])) // fondo del taglio arrotondato
    .intersect(Manifold.cube([200, 200, 2 * K.pinFlat], true));

  // ---------------------------------------------------------------- disposizione di stampa
  const onBed = (m) => {
    const b = m.boundingBox();
    return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]);
  };
  const asm = { head: handle, sleeve: sleeveAsm, pin: pin.translate([0, 0, zc]) };
  const print = { head: handle.translate([0, 0, -zh]), sleeve: onBed(sleeve), pin: onBed(pin) };
  for (const [k, m] of Object.entries(rollerParts)) {
    asm[k] = m.translate([0, 0, zc]);
    print[k] = onBed(m.rotate([0, -90, 0])); // asse in verticale, bordino del mozzo sul piatto
  }

  for (const [name, m] of Object.entries(print)) {
    if (m.status() !== 'NoError' || m.isEmpty()) throw new Error(`Geometria non valida: ${name} (${m.status()})`);
  }

  const info = {
    axleZ: zc,
    split,
    rollerDiameter: 2 * Ro,
    rollerWidth: W,
    repeats: textInfo.n,
    textScale: textInfo.scale,
    textWidth: textInfo.textW,
    textHeight: textInfo.textHreal,
    circumference: TAU * Ro,
    pitchU: textInfo.pitchU,
    handleLength: -zr + zc + K.armR,
    handleOuterD: 2 * Rh,
    ringD: 2 * Rj,
    headLength: zc + K.armR - zh,
    adjust: Lt - K.threadEng - 0,
    adjustBack: K.threadEng - 6,
    pin: `perno stampato Ø${2 * K.pinR} mm, a scatto`,
  };

  return {
    assembly: { ...asm, ghost },
    print,
    info,
    warnings,
  };
}
