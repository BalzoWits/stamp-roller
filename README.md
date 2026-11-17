# Stamp Roller

Generatore web di un rullo-timbro per marker con punta a scalpello da **15 o 20 mm** (Molotow, Montana, Grog…).
La larghezza della punta decide feritoia, rullo (punta + 3 mm), forcella e perno; gli spessori di default
(5 mm per la 15, 6 mm per la 20) sono da verificare sui marker reali.
Si sceglie la scritta, si inseriscono le misure del proprio marker e si scaricano i pezzi da stampare in 3D.
Tutto gira nel browser: nessun server, si pubblica su GitHub Pages così com'è.

**Online:** https://balzowits.github.io/stamp-roller/

## Come funziona

- **Rullo**: cilindro con il testo **a specchio** in rilievo, avvolto sulla superficie. In modalità automatica
  il diametro si adatta alla scritta (ripetuta se corta, rimpicciolita se troppo lunga, Ø 24–48 mm).
- **Corpo in due pezzi**, avvitati tra loro:
  - **Testa** (~35 mm + forcella): piastra frontale con **feritoia** che allinea la punta al rullo e fa da battuta
    all'ultimo collarino, cono di invito, ghiera zigrinata con filetto femmina, forcella a cunei (faccia interna
    dritta, esterna inclinata fino al bordo della testa) con sedi piane per testa e scatto del perno.
  - **Impugnatura**: tubo su misura del corpo del marker, chiuso sul fondo, con filetto maschio tondo a passo
    largo (passo 7 mm, profondità 2 mm, fianchi a ~45°, 3 spire). Il filetto
    spinge il marker contro la battuta e recupera ±7 mm di errore sulla lunghezza; svitandola il marker resta
    scoperto quasi per intero e si estrae a mano.
- **Rullo in due pezzi** (default, disattivabile): mozzo rigido in PLA/PETG con bordino di battuta e 8 denti
  anti-rotazione + battistrada in **TPU** con la scritta, montato a pressione (interferenza 0,1 mm).
- **Perno stampato** Ø5 mm: testa da un lato, scatto a due linguette dall'altro; ha due piatti per stamparlo sdraiato.

Pezzi stampabili senza supporti: testa in piedi (bracci in alto), impugnatura col fondo sul piatto,
mozzo col bordino sul piatto, battistrada in piedi, perno sdraiato. Nessuna viteria.

## Posizione della punta (rev. 17/11/2026)

Niente battuta davanti: l'impugnatura spinge il marker dal fondo finché la punta tocca il rullo, quindi conta
la **lunghezza totale** (B). La punta sporge 3 mm oltre la piastra in posizione nominale e il filetto regola ±7 mm;
la sporgenza oltre il collarino (C) serve solo a controllare che il collarino non tocchi la piastra (≥ 6 mm).
Il foro del corpo ha 1 mm di gioco sul diametro, la feritoia 0,4 mm per lato. Misure reali: Posca PC-17K da 15 mm
ha il blocchetto della punta 16,5 × 9,7 (misurato), corpo ~28, lunghezza ~157 (dal web, da verificare).

Opzioni rullo: **cuscinetto 608** (sede Ø22,2 centrata, asse da 8 mm, rullo minimo Ø 32 circa; due
**distanziali** stampati a parte vanno dai bracci all'anello interno: fissi sui bracci impedirebbero di calare il
rullo, il test lo verifica facendolo scendere dall'alto) e **asse** a perno stampato a scatto oppure vite M8 (M5 senza 608) + dado.

## Impostazioni di stampa nel 3MF

I .3mf scaricati contengono `Metadata/model_settings.config` (formato Bambu Studio / OrcaSlicer) con pareti,
riempimento, altezza layer e supporti spenti per ogni pezzo; i valori stanno in `print-settings.js` e sono gli
stessi della tabella nella pagina. Verificato con Bambu Studio 02.07 da riga di comando: legge il file anche da un
3MF non suo (il battistrada esce a 0,16 mm con un processo da 0,20). Non si salvano stampante, processo e
filamento: un progetto Bambu completo è legato al modello di stampante e il 3MF "finto progetto" lo fa crashare;
anche i piatti multipli vengono ignorati fuori dai progetti, per questo il **battistrada TPU ha un 3MF suo**.
Gli altri slicer ignorano il file e prendono solo la geometria.

## Struttura

| File | Ruolo |
|---|---|
| `geometry.js` | geometria parametrica (manifold-3d + font opentype), modulo puro usato da worker e test |
| `worker.js` | genera i pezzi in un Web Worker (uno nuovo per ogni build) |
| `app.js` | interfaccia, anteprima three.js, anteprima del segno, preset, download |
| `export.js` | STL binario e 3MF (zip senza compressione) con impostazioni per oggetto, senza dipendenze |
| `print-settings.js` | impostazioni di stampa consigliate per pezzo (tabella nella pagina + 3MF) |
| `lib/` | librerie copiate da `node_modules` (manifold-3d 3.5.5, opentype.js 1.3.4, three 0.187) |
| `fonts/` | font OFL da @fontsource (WOFF) |
| `test/node-test.mjs` | build headless di 5 configurazioni: validità, collisioni tra pezzi, ingombri; scrive `out/` |

## Sviluppo

```sh
npm install                 # solo per test e per aggiornare lib/
node test/node-test.mjs     # test geometria
python -m http.server 8765  # poi http://127.0.0.1:8765
```

Per aggiornare una libreria: `npm install <pkg>@<versione>` e ricopiare il file in `lib/`.

Pubblicazione: `powershell -File publish.ps1 "messaggio"` carica tutti i file (tranne `node_modules`, `out`)
via API GitHub, perché `git push` dalla rete aziendale fallisce per SSL.

## Licenze

Librerie in `lib/licenses/` (manifold-3d Apache-2.0, three MIT, opentype.js MIT); font in `fonts/licenses/`
(OFL 1.1, Permanent Marker Apache-2.0).

## Da verificare con la prima stampa

- Misure reali dei marker (preset salvabili dal sito): i valori di default (Ø 30, 140 mm, sporgenza 12) sono di partenza.
- Verso del testo: stampare una parola asimmetrica (es. "RF") e controllare che il segno si legga dritto.
- Gioco della filettatura (0,5 mm radiale, `thrClr`) e del foro corpo (0,25 mm) sulla propria stampante.
- Calzata del battistrada TPU sul mozzo (interferenza 0,1 mm, costante `tpuFit` in `geometry.js`).
- Scatto del perno: dente 0,45 mm, taglio 1,3 mm (`pinLip`, `pinSlot`); foro nei bracci Ø5,3.
- Pressione punta–rullo: interferenza nominale 0,3 mm, regolabile dal tappo.
