// Dizionario inglese per i18n.js. Chiavi = testo italiano come appare nella pagina (spazi normalizzati).
import { t } from './i18n.js';

export const TEXT = {
  // meta, header, stato
  'Genera un rullo-timbro personalizzato per marker da 15 o 20 mm, pronto da stampare in 3D.': 'Make a custom stamp roller for 15 or 20 mm markers, ready to 3D print.',
  'per marker da 15 e 20 mm': 'for 15 and 20 mm markers',
  'Caricamento…': 'Loading…',
  'Genero il primo modello…': 'Building the first model…',
  'Genero il modello…': 'Building the model…',
  'sconosciuto': 'unknown',

  // Scritta
  'Scritta': 'Lettering',
  'Testo': 'Text',
  '…oppure carica un font (TTF, OTF, WOFF)': '…or upload a font (TTF, OTF, WOFF)',
  'Altezza lettere': 'Letter height',
  'Spazio tra ripetizioni': 'Gap between repeats',
  'Rubik Mono One (largo)': 'Rubik Mono One (wide)',
  'Bebas Neue (alto e stretto)': 'Bebas Neue (tall and narrow)',
  'Permanent Marker (pennarello)': 'Permanent Marker (felt-tip)',
  'Caricato:': 'Loaded:',
  'CIAO': 'HELLO',

  // Rullo
  'Rullo': 'Roller',
  'Diametro': 'Diameter',
  'Diametro automatico': 'Auto diameter',
  'Diametro fisso': 'Fixed diameter',
  'Rilievo': 'Relief',
  'In automatico il diametro si adatta al testo: se la scritta è corta viene ripetuta, se è troppo lunga viene rimpicciolita.':
    'In auto mode the diameter follows the text: short text is repeated, text that is too long is scaled down.',
  'Su misura della scritta': 'Fitted to the text',
  'Fisso: rulli intercambiabili': 'Fixed: swappable rollers',
  'Su misura: il diametro si adatta al testo (scritta corta ripetuta, troppo lunga rimpicciolita). Ogni scritta ha il suo portamarker.':
    'Fitted: the diameter follows the text (short text repeated, long text scaled down). Each text gets its own marker holder.',
  'Il rullo non lascia mai tratti vuoti più lunghi dello spazio tra ripetizioni: dove non ci sono lettere la punta si infilerebbe nell\'incavo e bloccherebbe il rullo. Per lo stesso motivo gli spazi tra le parole vengono accorciati.':
    'The roller never leaves blank stretches longer than the gap between repeats: where there are no letters the tip would sink into the recess and jam the roller. For the same reason, spaces between words are shortened.',
  'Rullo in due pezzi: mozzo rigido + battistrada in TPU': 'Two-piece roller: rigid hub + TPU tread',
  'Il battistrada morbido prende meglio la vernice e si adatta alle superfici irregolari. Si infila a pressione sul mozzo, i denti lo tengono fermo. Si può cambiare scritta ristampando solo il battistrada.':
    'A soft tread picks up paint better and conforms to uneven surfaces. It press-fits onto the hub and the teeth keep it from slipping. To change the lettering, reprint just the tread.',
  'Cuscinetto 608 nel rullo (22×8×7, quello degli skateboard)': '608 bearing in the roller (22×8×7, the skateboard one)',
  'Il rullo gira molto più libero. Asse da 8 mm; il rullo minimo diventa Ø 32 circa.':
    'The roller spins much more freely. 8 mm axle; the smallest roller becomes about Ø 32.',
  'Asse': 'Axle',
  'Perno stampato': 'Printed pin',
  'Vite e dado': 'Screw and nut',

  // Il tuo marker
  'Il tuo marker': 'Your marker',
  'Larghezza punta': 'Tip width',
  'Punta 15 mm': '15 mm tip',
  'Punta 20 mm': '20 mm tip',
  'B · lunghezza punta→fondo': 'B · length tip→end',
  'C · sporgenza': 'C · stick-out',
  '— scegli —': '— choose —',
  'Generico 15 mm (valori di partenza)': 'Generic 15 mm (starting values)',
  'Generico 20 mm (valori di partenza)': 'Generic 20 mm (starting values)',
  'Uni Posca PC-17K 15 mm (punta misurata, corpo da verificare)': 'Uni Posca PC-17K 15 mm (tip measured, body to be checked)',
  'A · Ø massimo': 'A · Max Ø',
  'B · Lunghezza': 'B · Length',
  'Larghezza reale punta': 'Actual tip width',
  'Spessore reale punta': 'Actual tip thickness',
  'Misura il blocchetto della punta col calibro: è più grande del "15 mm" scritto sul marker (la Posca da 15 è 16,5 × 9,7). La feritoia aggiunge già 0,4 mm per lato.':
    'Measure the tip block with calipers: it is bigger than the "15 mm" printed on the marker (the 15 mm Posca is 16.5 × 9.7). The slot already adds 0.4 mm per side.',
  'Misure avanzate': 'Advanced measurements',
  'C · Sporgenza punta': 'C · Tip stick-out',
  'Ø ultimo collarino': 'Ø of last collar',
  'La sporgenza serve solo come controllo: se è meno di 6 mm il collarino tocca la piastra prima che la punta arrivi al rullo.':
    'Stick-out is only used as a check: under 6 mm the collar hits the plate before the tip reaches the roller.',
  'Salva come preset': 'Save as preset',
  'Elimina preset': 'Delete preset',
  'La lunghezza decide dove arriva la punta: l\'impugnatura spinge il marker dal fondo finché tocca il rullo. Il filetto recupera ±7 mm, quindi basta il righello. Il foro del corpo ha 1 mm di gioco sul diametro: il marker scorre libero mentre avviti.':
    'The length sets where the tip ends up: the grip pushes the marker from the back until it touches the roller. The thread takes up ±7 mm, so a ruler is enough. The body bore has 1 mm of clearance on the diameter, so the marker slides freely while you screw.',
  'Nome del preset (es. Molotow 627HS):': 'Preset name (e.g. Molotow 627HS):',

  // Scarica
  'Scarica': 'Download',
  'Kit completo (.3mf)': 'Full kit (.3mf)',
  'Pezzi rigidi PLA/PETG (.3mf)': 'Rigid parts PLA/PETG (.3mf)',
  'Battistrada TPU (.3mf)': 'TPU tread (.3mf)',
  'Tutti gli STL (.zip)': 'All STLs (.zip)',
  'I .3mf contengono solo i pezzi già disposti sul piatto, senza impostazioni di stampa: quelle consigliate sono nella tabella qui sotto. Il battistrada TPU ha un file suo, così va su un piatto a parte. Lo .zip contiene tutti gli STL e un LEGGIMI con impostazioni e montaggio.':
    'The .3mf files contain only the parts laid out on the bed, with no print settings: the recommended ones are in the table below. The TPU tread has its own file so it goes on a separate plate. The .zip has every STL plus a README with settings and assembly.',
  'Oppure i singoli pezzi in STL:': 'Or the individual parts as STL:',

  // nomi dei pezzi
  'Testa': 'Head',
  'Impugnatura': 'Grip',
  'Perno': 'Pin',
  'Distanziali ×2': 'Spacers ×2',
  'Mozzo': 'Hub',
  'Battistrada': 'Tread',

  // info
  'Ripetizioni': 'Repeats',
  'Corpo': 'Body',
  'Regolazione': 'Adjustment',
  'Cuscinetto': 'Bearing',
  'Materiali': 'Materials',
  'battistrada in TPU, il resto PLA/PETG': 'TPU tread, everything else PLA/PETG',
  'tutto PLA/PETG': 'all PLA/PETG',
  'cuscinetto 608 (22×8×7)': '608 bearing (22×8×7)',
  'nessuno': 'none',

  // impostazioni consigliate
  'Impostazioni consigliate': 'Recommended settings',
  'Pezzo': 'Part',
  'Pareti': 'Walls',
  'Riemp.': 'Infill',
  'in piedi, bracci in alto': 'upright, arms up',
  'col fondo sul piatto': 'bottom on the bed',
  'sdraiato sul lato piatto': 'lying on its flat side',
  'in piedi (sono 2)': 'upright (2 of them)',
  'col bordino sul piatto': 'flange on the bed',
  'in piedi, 20–30 mm/s': 'upright, 20–30 mm/s',
  'in piedi': 'upright',
  'Per tutti: niente supporti. I file non contengono impostazioni: impostale nello slicer (le trovi anche nel LEGGIMI dello .zip).':
    'No supports for any part. The files carry no settings: set them in your slicer (they are also in the README inside the .zip).',

  // stampa e montaggio
  'Stampa e montaggio': 'Printing and assembly',
  'PLA o PETG, layer da 0,2 mm, 3–4 perimetri. Il perno al 100% di riempimento.': 'PLA or PETG, 0.2 mm layers, 3–4 perimeters. Print the pin at 100% infill.',
  'Infila il battistrada sul mozzo dal lato senza bordino, allineando i denti, fino in battuta.': 'Slide the tread onto the hub from the side without the flange, lining up the teeth, all the way down.',
  'Carica il marker (pompa la punta), infilalo nella testa con la punta nella feritoia, poi avvita l\'impugnatura finché la punta sfiora il rullo.':
    'Prime the marker (pump the tip), insert it into the head with the tip in the slot, then screw on the grip until the tip just touches the roller.',
  'Se il rullo si impregna troppo, svita l\'impugnatura di mezzo giro. Per cambiare marker la sviti del tutto: il marker resta fuori quasi per intero e si sfila a mano.':
    'If the roller gets too soaked, back the grip off half a turn. To swap markers unscrew it completely: the marker sticks out almost entirely and pulls out by hand.',

  // vista
  'Vista': 'View',
  'Montato': 'Assembled',
  'Piatto di stampa': 'Print bed',
  'Mostra marker': 'Show marker',
  'Gira rullo': 'Spin roller',
  'Inquadra': 'Fit view',
  'Anteprima del segno': 'Stroke preview',

  // avvisi e errori di geometry.js senza numeri
  'Lunghezza marker troppo corta rispetto alla punta.': 'Marker length is too short compared to the tip.',
  'Il collarino non può essere più largo del corpo: uso il massimo possibile.': 'The collar can\'t be wider than the body: using the largest possible value.',
  'Il font non contiene i caratteri del testo.': 'The font doesn\'t contain the characters of the text.',
  'Nessun testo: il rullo è liscio.': 'No text: the roller is plain.',
  'Mozzo sottile: aumenta il diametro del rullo.': 'Thin hub: increase the roller diameter.',
  'Marker corto: l\'impugnatura viene molto bassa, controlla le misure.': 'Short marker: the grip comes out very short, check the measurements.',
  'La punta è quasi larga quanto il corpo: la feritoia non lascia spazio al cono interno.': 'The tip is almost as wide as the body: the slot leaves no room for the inner cone.',
};

export const HTML = {
  '<b>Rulli intercambiabili</b>: il diametro resta quello che scegli e le lettere tengono l\'altezza impostata; la scritta si ripete quante volte ci sta e, per chiudere il giro senza vuoti, le lettere si allargano o stringono un poco in orizzontale. Testa, impugnatura e mozzo restano identici per qualunque scritta: stampi il portamarker una volta e per ogni nuova scritta ristampi solo il battistrada (o il rullo). Tieni lo stesso diametro e le stesse misure del marker.':
    '<b>Swappable rollers</b>: the diameter stays the one you pick and the letters keep the height you set; the text is repeated as many times as it fits and, to close the turn without blank stretches, the letters get slightly wider or narrower horizontally. Head, grip and hub stay identical for any text: print the holder once and for each new text reprint only the tread (or the roller). Keep the same diameter and the same marker measurements.',
  '<b>Testa</b> in piedi con i bracci verso l\'alto, <b>impugnatura</b> col fondo sul piatto, <b>mozzo</b> col bordino sul piatto, <b>perno</b> sdraiato sul lato piatto. Non servono supporti.':
    '<b>Head</b> upright with the arms up, <b>grip</b> with its bottom on the bed, <b>hub</b> with the flange on the bed, <b>pin</b> lying on its flat side. No supports needed.',
  '<b>Battistrada in TPU</b> (95A), in piedi, lento (20–30 mm/s), layer da 0,12–0,16 mm per lettere nitide.':
    '<b>TPU tread</b> (95A), upright, slow (20–30 mm/s), 0.12–0.16 mm layers for crisp letters.',
  'Con il <b>608</b>: premilo nella sede del mozzo dal lato senza bordino fino in battuta (se è duro, usa una morsa con due rondelle). Poi infila un <b>distanziale</b> in ciascun foro laterale del mozzo, fino a toccare il cuscinetto.':
    'With the <b>608</b>: press it into the hub seat from the side without the flange, all the way in (if it is tight, use a vise with two washers). Then push a <b>spacer</b> into each side hole of the hub until it touches the bearing.',
  'Cala il rullo dall\'alto tra i bracci (i distanziali restano nei loro fori), allinea i fori e spingi il <b>perno</b> dal lato della testa finché lo scatto passa dall\'altra parte, oppure infila la <b>vite</b> e chiudi col dado autobloccante senza schiacciare i bracci. Il rullo deve girare libero.':
    'Drop the roller in from above between the arms (the spacers stay in their holes), line up the holes and push the <b>pin</b> in from the head side until the snap clicks through the other side, or insert the <b>screw</b> and close it with the lock nut without squeezing the arms. The roller must spin freely.',
};

const N = '([-\\d.,]+)'; // numeri: virgola (italiano) o punto
const re = (s) => new RegExp('^' + s + '$');

export const PATTERNS = [
  // stato
  [re(`Pronto · ${N} s`), 'Ready · $1 s'],
  [/^Errore nel generatore: (.+)$/, (_, m) => 'Generator error: ' + t(m)],
  [/^Errore: (.+)$/, (_, m) => 'Error: ' + t(m)],
  [/^Font non caricato: (.+)$/, 'Font not loaded: $1'],
  [/^Font non leggibile: (.+)$/, 'Can\'t read the font: $1'],
  [/^Geometria non valida: (.+)$/, 'Invalid geometry: $1'],

  // anteprima del segno
  [re(`un giro = ${N} mm · tacche = inizio di ogni giro`), 'one turn = $1 mm · ticks = start of each turn'],

  // info
  [re(`${N} per giro`), '$1 per turn'],
  [/^(.+ mm) \(scala (\d+)%\)$/, '$1 (scaled to $2%)'],
  [re(`${N} mm, Ø ${N} \\(ghiera Ø ${N}\\)`), '$1 mm, Ø $2 (collar Ø $3)'],
  [re(`±${N} mm avvitando l'impugnatura`), '±$1 mm by screwing the grip'],
  [/^vite M(\d+)×(\d+) \+ dado autobloccante$/, 'M$1×$2 screw + lock nut'],
  [/^perno stampato Ø(\d+) mm, a scatto$/, 'printed snap-fit pin, Ø$1 mm'],

  // tabella impostazioni: "materiale · posizionamento"
  [/^(PLA\/PETG|TPU) · (.+)$/, (_, m, p) => m + ' · ' + t(p)],

  // avvisi di geometry.js
  [re(`Diametro corpo ${N} mm fuori dal campo previsto \\(15–45\\)\\.`), 'Body diameter $1 mm is outside the expected range (15–45).'],
  [re(`Larghezza punta ${N} mm fuori dal campo previsto \\(10–25\\)\\.`), 'Tip width $1 mm is outside the expected range (10–25).'],
  [re(`Testo troppo alto per un rullo largo ${N} mm: ridotto al (\\d+)%\\.`), 'Text too tall for the roller width ($1 mm): scaled to $2%.'],
  [re(`Testo troppo lungo per il diametro massimo \\(${N} mm\\): ridotto al (\\d+)%\\.`), 'Text too long for the maximum diameter ($1 mm): scaled to $2%.'],
  [re(`Tratti sottili: circa il (\\d+)% del testo è sotto ${N} mm\\. Aumenta l'altezza o usa un font più grosso\\.`),
    'Thin strokes: about $1% of the text is under $2 mm. Increase the height or use a bolder font.'],
  [re(`Col rullo da Ø ${N} mm la scritta non ci sta nemmeno una volta: è ridotta al (\\d+)%\\. Accorciala o usa un rullo più grande\\.`),
    'With a Ø $1 mm roller the lettering doesn\'t fit even once: it is scaled to $2%. Shorten it or use a bigger roller.'],
  [re(`La scritta viene (allargata|stretta) al (\\d+)% per chiudere il giro senza vuoti: se non ti piace cambia diametro o testo\\.`),
    (_, w, n) => `The lettering is ${w === 'allargata' ? 'stretched' : 'squeezed'} to ${n}% to close the turn without blank stretches: if you don't like it, change the diameter or the text.`],
  [re(`C'è un tratto di ${N} mm senza lettere: la punta può infilarcisi e bloccare il rullo\\. Riduci lo spazio tra ripetizioni o sostituisci gli spazi tra le parole con un trattino o un punto\\.`),
    'There is a $1 mm stretch with no letters: the tip can sink into it and jam the roller. Reduce the gap between repeats or replace word spaces with a dash or a dot.'],
  [re(`La punta sporge solo ${N} mm dal collarino: il collarino tocca la piastra prima che la punta arrivi al rullo \\(servono almeno ${N} mm\\)\\.`),
    'The tip sticks out only $1 mm past the collar: the collar hits the plate before the tip reaches the roller (at least $2 mm needed).'],
];
