// Geometria parametrica del rullo-timbro per marker con punta a scalpello da 15 o 20 mm.
// Modulo puro: gira identico nel browser (worker) e in node (test).
// Assi (assemblato): il marker punta verso +Z, la faccia anteriore del manico è a z = 0,
// l'asse del rullo è parallelo a X (stessa direzione della larghezza della punta).

const TAU = Math.PI * 2;

export const DEFAULTS = {
  // marker
  // (Posca PC-17K: ~157 mm, corpo ~28; Molotow 627HS: corpo 29, ~161 mm vuoto. Punta Posca 15 mm
  // misurata dall'utente: 16,5 × 9,7 — "15 mm" è la larghezza del segno, non del blocchetto.)
  bodyD: 29,        // diametro massimo del corpo
  markerLen: 158,   // lunghezza da punta a fondo: è LEI che decide dove arriva la punta
  tipLen: 10,       // sporgenza della punta oltre l'ultimo collarino (solo controllo)
  tipNominal: 15,   // larghezza nominale del marker (15 o 20): decide la larghezza del rullo
  tipW: 16.5,       // larghezza reale del blocchetto della punta
  tipT: 9.7,        // spessore reale del blocchetto della punta
  neckD: 20,        // diametro dell'ultimo collarino (sotto la punta)
  // timbro
  text: 'CIAO',
  textH: 10,        // altezza delle maiuscole
  relief: 1.2,      // rilievo delle lettere
  gap: 3,           // spazio tra una ripetizione e l'altra (corto: la punta non deve trovare vuoti)
  diameterMode: 'auto', // 'auto' | 'fixed'
  rollerD: 50,      // diametro esterno (solo in modalità fixed = rulli intercambiabili)
  minStroke: 0.8,   // tratto minimo stampabile
  split: true,      // rullo in due pezzi: mozzo rigido + battistrada TPU
  bearing: true,    // cuscinetto 608 (22×8×7) nel rullo, asse da 8 mm
  axle: 'pin',      // 'pin' = perno stampato a scatto | 'screw' = vite M8 (con 608) o M5 + dado
};

// Asse: con il 608 è da 8 mm, senza da 5 mm. Misure del perno stampato scalate sul diametro.
function axleCfg(d) {
  const big = d >= 8;
  return {
    d, r: d / 2,
    hole: d / 2 + 0.2,              // foro nei bracci
    bore: d / 2 + 0.3,              // foro nel rullo senza cuscinetto (gira sul perno)
    headR: d / 2 + (big ? 3.5 : 2),
    headT: big ? 2.4 : 1.6,
    lip: big ? 0.6 : 0.45,          // dente dello scatto
    lipL: big ? 2.2 : 1.6,
    slot: big ? 1.8 : 1.3,          // taglio tra le linguette
    flat: d / 2 * 0.9,              // piatti per stamparlo sdraiato
    nutH: big ? 8 : 5,              // dado autobloccante
  };
}
const BRG = { R: 11, fitR: 11.1, w: 7, land: 5.8, side: 7 }; // 608: sede Ø22,2, appoggio solo sull'anello interno

// Costanti di progetto (non esposte nel sito)
const K = {
  boreClr: 0.5,    // gioco radiale del foro sul corpo (+1 mm sul Ø: il marker scorre avvitando)
  wall: 3.6,       // parete di impugnatura e corpo della testa
  plateT: 2,       // spessore della piastra con la feritoia
  slotClr: 0.4,    // gioco della feritoia per lato
  threadLen: 21,   // lunghezza filetto (3 spire)
  threadEng: 14,   // impegno nominale testa/impugnatura (il resto è regolazione)
  thrDepth: 2,     // profondità del filetto tondo
  pitch: 7,        // passo (fianchi a ~45°: stampabile in verticale)
  thrClr: 0.5,     // gioco radiale del filetto (~0,35 mm sul fianco)
  maleWall: 1.6,   // parete sotto il fondo del filetto maschio
  floor: 2,        // fondo chiuso dell'impugnatura
  armT: 4.5,       // spessore bracci forcella
  armGap: 0.8,     // distanza braccio-rullo
  boss: 0.5,       // rondella integrata sul braccio (senza cuscinetto)
  armR: 8,         // raggio della testa del braccio attorno all'asse
  bossR: 4.5,      // raggio della rondella integrata (senza cuscinetto)
  tipStick: 3,     // quanto sporge la punta oltre la piastra in posizione nominale
  tireWall: 2.2,   // spessore del battistrada TPU sotto le lettere
  hubFlange: 1,    // bordino di battuta del mozzo
  teeth: 8,        // denti anti-rotazione mozzo/battistrada
  toothW: 2.2,
  toothH: 0.9,
  tpuFit: 0.1,     // interferenza del battistrada sul mozzo
  contact: 0.3,    // interferenza punta-lettere
  rMin: 12,        // raggio esterno minimo del rullo
  rMax: 24,        // raggio esterno massimo (su misura)
  rMaxFixed: 30,   // raggio esterno massimo dei rulli intercambiabili (Ø 60)
  textMargin: 1,   // margine del testo sui fianchi del rullo
};

export const LIMITS = { rMin: K.rMin, rMax: K.rMax, threadAdjust: K.threadLen - K.threadEng - 0 };

// ---------------------------------------------------------------- testo -> CrossSection
// Spazio tra le parole: quello del font (~0,25 em) lascia un vuoto dove la punta si incastra;
// le parole vengono composte una per una con uno spazio corto.
export const WORD_SPACE = 1.8; // mm di avanzamento per ogni spazio (alla dimensione del testo)
function textCross(CrossSection, font, text, size) {
  const words = text.split(/\s+/).filter(Boolean);
  const path = { commands: [] };
  let x0 = 0;
  for (const w of words) {
    path.commands.push(...font.getPath(w, x0, 0, size).commands);
    x0 += font.getAdvanceWidth(w, size) + WORD_SPACE;
  }
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
// Regola d'oro: lo spazio vuoto tra le ripetizioni NON si allarga mai oltre `gap`. La punta tocca il
// rullo su tutta la larghezza: dove per qualche mm non c'è nessuna lettera il feltro si rilassa
// nell'incavo e poi urta il bordo della lettera dopo, bloccando il rullo (prova reale 19/11/2026).
//  - automatico: si aggiungono ripetizioni e il diametro cresce quanto serve;
//  - fisso (rulli intercambiabili: la testa dipende solo dal diametro, non dalla scritta): l'ALTEZZA
//    delle lettere resta quella impostata; la scritta si ripete quante volte ci sta (ripetizioni
//    arrotondate al più vicino) e il resto del giro si chiude allargando o stringendo un poco le
//    lettere solo in orizzontale. Solo se non ci sta nemmeno una volta si rimpicciolisce tutta.
export function layoutText(textW, gap, mode, rollerD, rMin = K.rMin) {
  const unit = textW + gap;
  let scale = 1, scaleX = 1, n = 1, Ro;
  if (mode === 'fixed') {
    Ro = Math.min(Math.max(rollerD / 2, rMin), K.rMaxFixed);
    const C = TAU * Ro;
    n = Math.max(1, Math.round(C / unit));
    const sx = (C / n - gap) / textW;
    if (n === 1 && sx < 0.85) scale = sx; // più lunga del giro: rimpicciolisco tutto
    else scaleX = sx;
  } else {
    Ro = unit / TAU;
    if (Ro < rMin) {
      n = Math.ceil((TAU * rMin) / unit);
      Ro = (n * unit) / TAU;
      if (Ro > K.rMax) {
        // con una ripetizione in più il rullo esce dal massimo: resto al minimo e adatto la scritta
        Ro = rMin;
        n = Math.max(1, Math.round((TAU * rMin) / unit));
        scaleX = ((TAU * rMin) / n - gap) / textW;
      }
    } else if (Ro > K.rMax) {
      Ro = K.rMax;
      scale = (TAU * Ro - gap) / textW;
    }
  }
  return { Ro, n, scale, scaleX, C: TAU * Ro, pitchU: (TAU * Ro) / n };
}

// Vuoto più lungo DENTRO la scritta (spazi tra parole, lettere distanti), in mm lungo il giro.
function maxInnerBlank(cs) {
  const iv = cs.toPolygons().map((poly) => {
    let a = Infinity, b = -Infinity;
    for (const [x] of poly) { if (x < a) a = x; if (x > b) b = x; }
    return [a, b];
  }).sort((p, q) => p[0] - q[0]);
  let maxGap = 0, end = -Infinity;
  for (const [a, b] of iv) {
    if (end > -Infinity && a > end) maxGap = Math.max(maxGap, a - end);
    end = Math.max(end, b);
  }
  return maxGap;
}
export const MAX_BLANK = 4; // oltre questo vuoto la punta rischia di incastrarsi

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
  // rullo: largo quanto il marker nominale + 3, e comunque almeno il blocchetto reale + 1,5
  const W = Math.max(p.tipNominal + 3, p.tipW + 1.5);
  if (p.tipW < 10 || p.tipW > 25) warnings.push(`Larghezza punta ${p.tipW} mm fuori dal campo previsto (10–25).`);
  const split = !!p.split;
  const bearing = !!p.bearing;
  const AX = axleCfg(bearing ? 8 : 5);
  // raggio minimo: con il 608 il mozzo deve contenere la sede Ø22 più una parete
  const rMinEff = bearing
    ? Math.max(K.rMin, BRG.fitR + 1.6 + (split ? K.tireWall : 0) + p.relief)
    : K.rMin;
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

    const fixed = p.diameterMode === 'fixed';
    const L = layoutText(bw, p.gap, p.diameterMode, p.rollerD, rMinEff);
    if (Math.abs(L.scale - 1) > 0.001) {
      cs = cs.scale([L.scale, L.scale]);
      if (!fixed) warnings.push(`Testo troppo lungo per il diametro massimo (${2 * K.rMax} mm): ridotto al ${Math.round(L.scale * 100)}%.`);
      else warnings.push(`Col rullo da Ø ${2 * L.Ro} mm la scritta non ci sta nemmeno una volta: è ridotta al ${Math.round(L.scale * 100)}%. Accorciala o usa un rullo più grande.`);
      bw *= L.scale; bh *= L.scale;
    }
    if (Math.abs(L.scaleX - 1) > 0.001) {
      cs = cs.scale([L.scaleX, 1]);
      bw *= L.scaleX;
      if (L.scaleX > 1.2 || L.scaleX < 0.85) warnings.push(`La scritta viene ${L.scaleX > 1 ? 'allargata' : 'stretta'} al ${Math.round(L.scaleX * 100)}% per chiudere il giro senza vuoti: se non ti piace cambia diametro o testo.`);
    }
    Ro = L.Ro;
    const inner = maxInnerBlank(cs);
    const blank = Math.max(inner, L.pitchU - bw);
    if (blank > MAX_BLANK + 0.05) {
      warnings.push(`C'è un tratto di ${blank.toFixed(1)} mm senza lettere: la punta può infilarcisi e bloccare il rullo. Riduci lo spazio tra ripetizioni o sostituisci gli spazi tra le parole con un trattino o un punto.`);
    }

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
    textInfo = { n: L.n, scale: hScale * L.scale, scaleX: L.scaleX, textW: bw, textHreal: bh, C: L.C, pitchU: L.pitchU, maxBlank: blank };
  } else {
    Ro = p.diameterMode === 'fixed' ? Math.min(Math.max(p.rollerD / 2, rMinEff), K.rMaxFixed) : rMinEff;
    warnings.push('Nessun testo: il rullo è liscio.');
  }

  const Rc = Ro - relief;
  // i pezzi del rullo si costruiscono lungo Z (x=0..W) e poi si girano sull'asse X centrato
  const toX = (m) => m.rotate([0, 90, 0]).translate([-W / 2, 0, 0]);
  // foro del rullo: sede del 608 centrata (aperta dal lato opposto al bordino, così si stampa
  // senza sbalzi) + foro passante più largo delle rondelle; senza cuscinetto, foro sul perno
  const bore = bearing
    ? Manifold.union([
      cyl(W + 2, BRG.side).translate([0, 0, -1]),
      cyl(W / 2 + BRG.w / 2 + 1, BRG.fitR).translate([0, 0, W / 2 - BRG.w / 2]),
      cyl(0.6, BRG.fitR, BRG.fitR + 0.6).translate([0, 0, W - 0.59]),
    ])
    : cyl(W + 2, AX.bore).translate([0, 0, -1]);
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
    if (!bearing && Rhub - AX.bore < 2.5) warnings.push('Mozzo sottile: aumenta il diametro del rullo.');
  } else {
    let roller = toX(cyl(W, Rc));
    if (textSolid) roller = roller.add(textSolid);
    rollerParts.roller = roller.subtract(toX(bore));
  }

  // ---------------------------------------------------------------- manico
  const Rb = p.bodyD / 2 + K.boreClr;
  const Rh = Rb + K.wall;
  const plateT = K.plateT;
  const slotW = p.tipW + 2 * K.slotClr, slotT = p.tipT + 2 * K.slotClr;
  // il cono interno deve finire più largo della feritoia, altrimenti la feritoia lo buca di lato
  const neckR = Math.max(Math.min(p.neckD / 2 + 0.5, Rb - 0.5), Math.hypot(slotW / 2, slotT / 2) + 0.5);
  // Nessuna battuta davanti: è l'impugnatura a spingere il marker dal fondo finché la punta tocca il
  // rullo. In posizione nominale la punta sporge tipStick oltre la piastra; il filetto regola ±7 mm.
  const zTip = K.tipStick;                         // estremità della punta
  const zConeTop = -plateT, zConeBase = zConeTop - (Rb - neckR);
  const zb = zTip - p.markerLen;                   // fondo del marker
  const zCollar = zTip - p.tipLen;                 // ultimo collarino (solo anteprima e controllo)
  // Corpo in due pezzi: TESTA (piastra, forcella, ghiera con filetto femmina) e IMPUGNATURA
  // (tubo chiuso sul fondo con filetto maschio). Il filetto fa anche da regolazione di lunghezza.
  const P = K.pitch, Lt = K.threadLen, hT = K.thrDepth;
  const zh = zConeBase - 2 - Lt - 5;               // retro della testa (bocca del filetto)
  const shift = Lt - K.threadEng;                  // filetto maschio scoperto in posizione nominale
  const zs = zh - shift;                           // spalla dell'impugnatura (inizio filetto maschio)
  const zr = zb - K.floor;                         // fondo dell'impugnatura
  if (zs - zr < 25) warnings.push('Marker corto: l\'impugnatura viene molto bassa, controlla le misure.');
  const zc = zTip + Ro - K.contact;                // asse del rullo

  if (zCollar > -plateT - 1) warnings.push(`La punta sporge solo ${p.tipLen} mm dal collarino: il collarino tocca la piastra prima che la punta arrivi al rullo (servono almeno ${plateT + K.tipStick + 1} mm).`);
  if (neckR > Rb - 0.5) warnings.push('La punta è quasi larga quanto il corpo: la feritoia non lascia spazio al cono interno.');

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
  const spot = cylX(Rj, Math.max(AX.headR, AX.d) + 0.7, xOut, zc);
  handle = handle
    .add(arm.subtract(spot))
    .add(arm.subtract(spot).mirror([1, 0, 0]));
  // Senza cuscinetto: rondella sottile sul braccio contro la faccia del rullo.
  // Col 608 NIENTE sporgenze fisse (impedirebbero di calare il rullo tra i bracci): due distanziali
  // stampati a parte, infilati nei fori laterali del mozzo, vanno dal braccio all'anello interno.
  if (!bearing) {
    handle = handle
      .add(cylX(K.boss + 0.1, K.bossR, x0 - K.boss, zc))
      .add(cylX(K.boss + 0.1, K.bossR, -x0 - 0.1, zc));
  }
  const spacerL = x0 - BRG.w / 2 - 0.2;          // sporge dal rullo meno del gioco braccio-rullo
  const spacer = bearing
    ? cyl(spacerL, BRG.land).subtract(cyl(spacerL + 2, AX.r + 0.25).translate([0, 0, -1]))
    : null;

  // cavità della testa: filetto femmina + smusso a 45° (stampabile senza supporti) + foro + cono + feritoia
  const femTop = zh + Lt + 1;
  const cavity = Manifold.union([
    thread(K.thrClr, Lt + 1 + P).translate([0, 0, zh - P]),
    cyl(femMax - Rb, femMax, Rb).translate([0, 0, femTop - 0.01]),
    cyl(zConeBase - zh + 1, Rb).translate([0, 0, zh - 1]),
    cyl(zConeTop - zConeBase, Rb, neckR).translate([0, 0, zConeBase]),
    Manifold.cube([slotW, slotT, plateT + 0.4], true).translate([0, 0, -plateT / 2]),
  ]);
  handle = handle.subtract(cavity).subtract(cylX(2 * xOut + 2, AX.hole, -xOut - 1, zc));

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
  const collarTop = Math.min(zCollar, -plateT - 0.05);
  const ghost = Manifold.union([
    cyl(zConeBase - 1 - zb, p.bodyD / 2).translate([0, 0, zb]),
    cyl(collarTop - (zConeBase - 1), Math.min(p.neckD / 2, neckR - 0.3)).translate([0, 0, zConeBase - 1]),
    Manifold.cube([p.tipW, p.tipT, zTip - collarTop], true).translate([0, 0, (zTip + collarTop) / 2]),
  ]);

  // ---------------------------------------------------------------- asse
  // Perno stampato: asse X, testa a -X, scatto a +X: due linguette separate da un taglio verticale
  // che si stringono passando nel foro del braccio. Piatti sopra/sotto per stamparlo sdraiato.
  const lipX = xOut + 0.2;
  let pin = Manifold.union([
    cylX(AX.headT, AX.headR, -xOut - AX.headT, 0),
    cylX(lipX + xOut + 0.01, AX.r, -xOut - 0.01, 0),
    cyl(AX.lipL, AX.r + AX.lip, AX.r - 0.4).rotate([0, 90, 0]).translate([lipX, 0, 0]),
  ]);
  const slotFrom = xOut - K.armT - 2;
  pin = pin
    .subtract(Manifold.cube([lipX + AX.lipL - slotFrom + 1, AX.slot, 30]).translate([slotFrom, -AX.slot / 2, -15]))
    .subtract(Manifold.cylinder(30, AX.slot / 2, AX.slot / 2, 24).translate([slotFrom, 0, -15])) // fondo del taglio arrotondato
    .intersect(Manifold.cube([200, 200, 2 * AX.flat], true));
  // Vite: solo anteprima (testa, gambo, dado), lunghezza arrotondata a 5 mm
  const screwL = Math.ceil((2 * xOut + AX.nutH + 1.5) / 5) * 5;
  const bolt = Manifold.union([
    cylX(0.7 * AX.d, AX.d * 0.85, -xOut - 0.7 * AX.d, 0),
    cylX(screwL, AX.r, -xOut, 0),
    Manifold.cylinder(AX.nutH, AX.d * 0.9, AX.d * 0.9, 6).rotate([0, 90, 0]).translate([xOut, 0, 0]),
  ]);
  const useScrew = p.axle === 'screw';
  const bearingGhost = bearing
    ? cyl(BRG.w, BRG.R).subtract(cyl(BRG.w + 2, AX.r).translate([0, 0, -1])).rotate([0, 90, 0]).translate([-BRG.w / 2, 0, 0])
    : null;

  // ---------------------------------------------------------------- disposizione di stampa
  const onBed = (m) => {
    const b = m.boundingBox();
    return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]);
  };
  const asm = { head: handle, sleeve: sleeveAsm };
  const print = { head: handle.translate([0, 0, -zh]), sleeve: onBed(sleeve) };
  if (useScrew) asm.bolt = bolt.translate([0, 0, zc]);
  else { asm.pin = pin.translate([0, 0, zc]); print.pin = onBed(pin); }
  if (bearingGhost) asm.bearing = bearingGhost.translate([0, 0, zc]);
  if (spacer) {
    // in posizione: dall'anello interno (±w/2 + 0,1) verso i bracci
    const sx = spacer.rotate([0, 90, 0]);
    asm.spacers = Manifold.union([
      sx.translate([BRG.w / 2 + 0.1, 0, zc]),
      sx.mirror([1, 0, 0]).translate([-(BRG.w / 2 + 0.1), 0, zc]),
    ]);
    // stampa: due tubetti in piedi, uno accanto all'altro
    print.spacers = onBed(Manifold.union([
      spacer.translate([-(BRG.land + 2), 0, 0]),
      spacer.translate([BRG.land + 2, 0, 0]),
    ]));
  }
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
    textScaleX: textInfo.scaleX || 1,
    maxBlank: textInfo.maxBlank || 0,
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
    bearing,
    axleD: AX.d,
    pin: useScrew ? `vite M${AX.d}×${screwL} + dado autobloccante` : `perno stampato Ø${AX.d} mm, a scatto`,
    bearingTxt: bearing ? 'cuscinetto 608 (22×8×7)' : 'nessuno',
  };

  return {
    assembly: { ...asm, ghost },
    print,
    info,
    warnings,
  };
}
