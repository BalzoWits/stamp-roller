// Traduzione della pagina (italiano -> inglese) senza toccare il markup.
// La pagina è scritta in italiano; con la lingua inglese questo modulo sostituisce:
//  - i testi semplici, nodo per nodo (dizionario TEXT: testo italiano esatto -> inglese)
//  - i testi con dentro grassetti, link, codice (dizionario HTML: innerHTML italiano -> innerHTML inglese)
//  - i testi con numeri o parti variabili (PATTERNS: [RegExp, sostituzione])
//  - gli attributi title, aria-label, placeholder
// Un MutationObserver traduce anche quello che il programma scrive dopo (pannelli, avvisi, stato).
// Non si traducono textarea, input e gli elementi con translate="no" (testi scritti dall'utente).
// Per i testi disegnati su canvas o calcolati nel codice c'è t().
//
// Uso: import { initI18n, t, lang } from './i18n.js'; initI18n({ TEXT, HTML, PATTERNS });

const KEY = 'lang';
function pick() {
  try { const v = localStorage.getItem(KEY); if (v === 'it' || v === 'en') return v; } catch { /* storage bloccato */ }
  return /^it\b/i.test(navigator.language || '') ? 'it' : 'en';
}
export const lang = pick();
export const isEn = lang === 'en';

let TEXT = {}, HTML = {}, PATTERNS = [];
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// traduzione di una stringa (testo senza markup); se non c'è, resta com'è
export function t(s) {
  if (!isEn || s == null) return s;
  const k = norm(String(s));
  if (!k) return s;
  if (Object.prototype.hasOwnProperty.call(TEXT, k)) return TEXT[k];
  for (const [re, rep] of PATTERNS) {
    if (re.test(k)) return k.replace(re, rep);
  }
  return s;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'CANVAS', 'SVG']);
const ATTRS = ['title', 'aria-label', 'placeholder'];
const HTML_TAGS = 'p, li, h1, h2, h3, h4, dt, dd, td, th, summary, small, label, span, div, a, button';
const done = new WeakMap(); // nodo -> ultimo testo scritto da noi (per non ritradurre all'infinito)

function skipped(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.getAttribute('translate') === 'no') return true;
  }
  return false;
}

function textNode(n) {
  if (done.get(n) === n.nodeValue) return;
  const v = n.nodeValue;
  const core = v.trim();
  if (!core || !/[A-Za-zÀ-ÿ]/.test(core) || skipped(n.parentElement)) return;
  const tr = t(core);
  if (tr !== core) {
    const out = v.replace(core, () => tr); // funzione: un $ nella traduzione resta letterale
    done.set(n, out);
    n.nodeValue = out;
  } else done.set(n, v);
}

function attrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute && el.getAttribute(a);
    if (!v) continue;
    const tr = t(v);
    if (tr !== v) el.setAttribute(a, tr);
  }
}

function htmlBlocks(root) {
  if (!Object.keys(HTML).length) return;
  const list = root.matches && root.matches(HTML_TAGS) ? [root, ...root.querySelectorAll(HTML_TAGS)] : [...(root.querySelectorAll ? root.querySelectorAll(HTML_TAGS) : [])];
  for (const el of list) {
    if (!el.firstElementChild || skipped(el)) continue;
    const k = norm(el.innerHTML);
    if (Object.prototype.hasOwnProperty.call(HTML, k)) el.innerHTML = HTML[k];
  }
}

function walk(root) {
  if (root.nodeType === 3) { textNode(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  htmlBlocks(root.nodeType === 9 ? root.documentElement : root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.currentNode; n; n = it.nextNode()) {
    if (n.nodeType === 3) textNode(n);
    else attrs(n);
  }
}

export function initI18n(dict = {}) {
  ({ TEXT = {}, HTML = {}, PATTERNS = [] } = dict);
  TEXT = Object.fromEntries(Object.entries(TEXT).map(([k, v]) => [norm(k), v]));
  HTML = Object.fromEntries(Object.entries(HTML).map(([k, v]) => [norm(k), v]));
  document.documentElement.lang = lang;
  // bottone di lingua: mostra l'altra lingua, al clic la salva e ricarica
  const b = document.getElementById('langBtn');
  if (b) {
    b.textContent = isEn ? 'IT' : 'EN';
    b.title = isEn ? 'Passa all\'italiano' : 'Switch to English';
    b.setAttribute('translate', 'no');
    b.addEventListener('click', () => {
      try { localStorage.setItem(KEY, isEn ? 'it' : 'en'); } catch { /* storage bloccato */ }
      location.reload();
    });
  }
  if (!isEn) return;
  const desc = document.querySelector('meta[name=description]');
  if (desc) desc.content = t(desc.content);
  walk(document);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') textNode(m.target);
      else if (m.type === 'attributes') attrs(m.target);
      else for (const n of m.addedNodes) walk(n);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
