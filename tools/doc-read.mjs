#!/usr/bin/env node
// Prints the text of a PDF or Word document (read-only, macOS only, no extra packages): PDFs through the system's PDFKit, Word and similar through `textutil`.
//   node tools/doc-read.mjs <file.pdf|.docx|.doc|.rtf|.odt> [--pages <n|from-to>] [--offset <chars>] [--max-chars <n>] [--info]
// A PDF is printed page by page ("## Halaman N"); --pages picks which ones. A Word document is one flow of text; --offset continues after a cut.
// Output is cut at --max-chars (default 30000) and says how to continue. A scanned PDF (pictures of pages) has no text: it says so.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PDF_EXT = /\.pdf$/i;
const WORD_EXT = /\.(docx|doc|rtf|odt)$/i;
const DEFAULT_MAX = 30_000;
const HARD_MAX = 200_000;
const MAX_BYTES = 150 * 1024 * 1024;
const BATCH = 15; // pages asked of PDFKit at a time

// PDFKit through JavaScript for Automation: `pdf.js <file> <from> <to>` -> { pages, title, texts[] } or { error }.
const JXA = `
ObjC.import('PDFKit');
function run(argv) {
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  if (!doc || doc.isNil()) return JSON.stringify({ error: 'open' });
  if (doc.isLocked) return JSON.stringify({ error: 'locked' });
  const n = Number(doc.pageCount);
  const from = Math.max(1, Number(argv[1]) || 1);
  const to = Math.min(n, Number(argv[2]) || n);
  const texts = [];
  for (let i = from - 1; i < to; i++) texts.push(ObjC.unwrap(doc.pageAtIndex(i).string) || '');
  let title = '';
  try { title = String(ObjC.deepUnwrap(doc.documentAttributes).Title || ''); } catch (e) {}
  return JSON.stringify({ pages: n, title, texts });
}`;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? null : args.splice(i, 2)[1] ?? null;
};
const info = args.includes('--info') && !!args.splice(args.indexOf('--info'), 1);
const pagesArg = flag('--pages');
const offset = Math.max(0, Number(flag('--offset')) || 0);
const maxChars = Math.min(HARD_MAX, Math.max(500, Number(flag('--max-chars')) || DEFAULT_MAX));
const file = args[0];

const usage = () => {
  console.error('Pakai: node tools/doc-read.mjs <file.pdf|.docx|.doc|.rtf|.odt> [--pages <n|dari-sampai>] [--offset <karakter>] [--max-chars <n>] [--info]');
  process.exit(2);
};
if (!file || args.length > 1) usage();
if (process.platform !== 'darwin') { console.error('Pembaca ini hanya jalan di macOS.'); process.exit(2); }
if (!PDF_EXT.test(file) && !WORD_EXT.test(file)) {
  console.error('Hanya file .pdf, .docx, .doc, .rtf, dan .odt yang bisa dibaca dengan pembaca ini (file teks biasa pakai Read).');
  process.exit(2);
}

const clean = (t) => String(t ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const fail = (msg) => { console.error(`Gagal membaca ${path.basename(file)}: ${msg}`); process.exit(1); };

const full = path.resolve(file);
let st;
try { st = fs.statSync(full); } catch (e) { fail(e.code === 'ENOENT' ? 'file tidak ditemukan' : e.code === 'EACCES' ? 'tidak ada izin membuka file ini' : e.message); }
if (!st.isFile()) fail('ini bukan file');
if (st.size > MAX_BYTES) fail(`file terlalu besar (${Math.round(st.size / 1048576)} MB)`);

/** Pages "3" or "3-7" -> [from, to] (to may be null = until the end); null if malformed. */
function parsePages(text) {
  if (!text) return [1, null];
  const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(String(text).trim());
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  return from >= 1 && to >= from ? [from, to] : null;
}

function jxa(from, to) {
  let out;
  try {
    out = execFileSync('osascript', ['-l', 'JavaScript', '-e', JXA, full, String(from), String(to)], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { fail(e.killed ? 'PDF terlalu lama dibuka' : 'PDF tidak bisa dibuka'); }
  let j;
  try { j = JSON.parse(out); } catch { fail('PDF tidak bisa dibaca'); }
  if (j.error === 'locked') fail('PDF ini terkunci dengan kata sandi');
  if (j.error) fail('PDF tidak bisa dibuka (rusak atau bukan PDF)');
  return j;
}

function readPdf() {
  const range = parsePages(pagesArg);
  if (!range) usage();
  const first = jxa(1, 1); // page count and title
  const total = first.pages;
  const head = `# ${path.basename(full)} — ${total} halaman${first.title ? ` — "${first.title.slice(0, 120)}"` : ''}`;
  if (info) return console.log(`${head}\nUkuran: ${Math.round(st.size / 1024)} KB`);
  let [from, to] = range;
  to = Math.min(total, to ?? total);
  if (from > total) fail(`PDF ini hanya ${total} halaman`);
  const out = [head];
  let chars = 0;
  let anyText = false;
  let resume = null; // the page to continue from when the output is cut
  scan: for (let start = from; start <= to; start += BATCH) {
    const upTo = Math.min(to, start + BATCH - 1);
    const batch = start === 1 && upTo === 1 ? first : jxa(start, upTo);
    for (let i = 0; i < batch.texts.length; i++) {
      const n = start + i;
      const text = clean(batch.texts[i]);
      if (text) anyText = true;
      const block = `\n## Halaman ${n}\n${text || '(tidak ada teks di halaman ini)'}`;
      if (chars + block.length > maxChars) {
        if (chars === 0) { out.push(`${block.slice(0, maxChars)}\n… halaman ini terlalu panjang dan dipotong`); resume = n + 1 <= to ? n + 1 : null; } else resume = n;
        break scan;
      }
      out.push(block);
      chars += block.length;
    }
  }
  if (!anyText && resume === null) out.push('\nTidak ada teks yang bisa dibaca di halaman ini. Kemungkinan PDF ini hasil scan (gambar); pakai Read untuk melihat halamannya.');
  if (resume !== null) out.push(`\n… dipotong di batas ${maxChars} karakter. Lanjutkan dengan --pages ${resume}-${to}`);
  console.log(out.join('\n'));
}

function readWord() {
  if (pagesArg) console.error('(--pages hanya untuk PDF; dokumen Word dibaca utuh, lanjutkan dengan --offset)');
  let text;
  try {
    text = execFileSync('textutil', ['-convert', 'txt', '-stdout', full], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch { fail('dokumen tidak bisa dibuka (rusak, terkunci, atau formatnya tidak dikenal)'); }
  text = clean(text.replace(/^\t•\t/gm, '- ').replace(/^\t(\d+[.)])\t/gm, '$1 ').replace(/^\t(?=\S)/gm, ''));
  const head = `# ${path.basename(full)} — ${text.length} karakter`;
  if (info) return console.log(`${head}\nUkuran: ${Math.round(st.size / 1024)} KB`);
  if (!text) return console.log(`${head}\n\nTidak ada teks di dokumen ini.`);
  if (offset >= text.length) fail(`dokumen ini hanya ${text.length} karakter`);
  const slice = text.slice(offset, offset + maxChars);
  const end = offset + slice.length;
  console.log(`${head}${offset ? ` (mulai dari karakter ${offset})` : ''}\n\n${slice}${end < text.length ? `\n\n… dipotong di karakter ${end} dari ${text.length}. Lanjutkan dengan --offset ${end}` : ''}`);
}

if (PDF_EXT.test(file)) readPdf(); else readWord();
