// A small read-only .xlsx reader with no dependencies, so Claude can open a spreadsheet without Python.
// An .xlsx is a zip of XML files: we read the zip's central directory, inflate only the parts we need
// (workbook, shared strings, styles, sheets) and pick the cell values out of the XML.
// It never writes anything and never runs formulas: a formula cell shows the value Excel last saved.
import fs from 'node:fs';
import zlib from 'node:zlib';

const MAX_FILE = 100 * 1024 * 1024;
const MAX_PART = 200 * 1024 * 1024; // one inflated XML part (a zip bomb stops here)

/** The entries of a zip file as Map(name → { method, size, csize, offset }). */
function zipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('bukan file .xlsx (zip-nya tidak terbaca)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip rusak');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    out.set(buf.toString('utf8', p + 46, p + 46 + nameLen), { method, csize, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** The text of one zip part, or null when it isn't there. */
function zipText(buf, entries, name) {
  const e = entries.get(name);
  if (!e) return null;
  if (buf.readUInt32LE(e.offset) !== 0x04034b50) throw new Error('zip rusak');
  const start = e.offset + 30 + buf.readUInt16LE(e.offset + 26) + buf.readUInt16LE(e.offset + 28);
  const raw = buf.subarray(start, start + e.csize);
  if (e.method === 0) return raw.toString('utf8');
  if (e.method !== 8) throw new Error(`metode zip ${e.method} tidak didukung`);
  return zlib.inflateRawSync(raw, { maxOutputLength: MAX_PART }).toString('utf8');
}

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  .replace(/_x([0-9a-f]{4})_/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Attributes of a tag's opening text, as an object (names without the namespace prefix). */
function attrs(s) {
  const o = {};
  for (const m of s.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) o[m[1].replace(/^.*:/, '')] = decode(m[2]);
  return o;
}

/** The text inside <t> elements of a string item, leaving out phonetic hints (<rPh>). */
const textOf = (xml) => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

const colIndex = (ref) => [...ref.replace(/\d+$/, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
export const colName = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const isDateFormat = (code) => /[dmyhs]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]|\\.|_.|\*./g, ''));

/** Which cell style ids (the s="…" of a cell) show a date or time. */
function dateStyles(xml) {
  const out = new Set();
  if (!xml) return out;
  const custom = new Map([...xml.matchAll(/<numFmt\b([^>]*)\/?>/g)].map((m) => attrs(m[1])).map((a) => [Number(a.numFmtId), a.formatCode ?? '']));
  const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? '';
  [...xfs.matchAll(/<xf\b([^>]*)/g)].forEach((m, i) => {
    const id = Number(attrs(m[1]).numFmtId);
    if (BUILTIN_DATE.has(id) || (custom.has(id) && isDateFormat(custom.get(id)))) out.add(i);
  });
  return out;
}

/** "9000.0" → "9000", "0.30000000000000004" → "0.3"; anything that isn't a plain number is left alone. */
const tidyNumber = (s) => (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s) ? String(Number(Number(s).toPrecision(12))) : s);

function fromSerial(v, date1904) {
  const ms = Math.round((v - (date1904 ? 24107 : 25569)) * 86400000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(v);
  const iso = d.toISOString();
  if (v < 1) return iso.slice(11, 16); // a time of day
  return Number.isInteger(v) ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** The sheets of an .xlsx: [{ name, rows: Map(rowNumber → string[]), cols, lastRow }]. Only sheets matching `only` (name or 1-based number) are parsed when it is given. */
export function readWorkbook(file, { only = null } = {}) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('itu bukan file');
  if (stat.size > MAX_FILE) throw new Error('file terlalu besar (maks 100 MB)');
  const buf = fs.readFileSync(file);
  const entries = zipEntries(buf);
  const wb = zipText(buf, entries, 'xl/workbook.xml');
  if (!wb) throw new Error('bukan file .xlsx (tidak ada xl/workbook.xml)');
  const rels = new Map([...(zipText(buf, entries, 'xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => attrs(m[1])).map((a) => [a.Id, a.Target]));
  const date1904 = /<workbookPr\b[^>]*date1904="(1|true)"/.test(wb);
  const sheetTags = [...wb.matchAll(/<sheet\b([^>]*)\/?>/g)].map((m) => attrs(m[1]));
  const wanted = sheetTags.filter((s, i) => only == null || String(only) === String(i + 1) || String(only).toLowerCase() === s.name.toLowerCase());
  if (!wanted.length) throw new Error(`sheet "${only}" tidak ada. Isi file: ${sheetTags.map((s, i) => `${i + 1}=${s.name}`).join(', ')}`);

  const sst = zipText(buf, entries, 'xl/sharedStrings.xml');
  const strings = sst ? [...sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const dates = dateStyles(zipText(buf, entries, 'xl/styles.xml'));

  return wanted.map((s) => {
    const target = rels.get(s.id) ?? '';
    const part = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const xml = zipText(buf, entries, part);
    const rows = new Map();
    let cols = 0;
    let lastRow = 0;
    let auto = 0;
    for (const rm of (xml ?? '').matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNo = Number(attrs(rm[1]).r) || auto + 1;
      auto = rowNo;
      const cells = [];
      let nextCol = 0;
      for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const a = attrs(cm[1]);
        const col = a.r ? colIndex(a.r) : nextCol;
        nextCol = col + 1;
        const body = cm[2] ?? '';
        const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let val = '';
        if (a.t === 'inlineStr') val = textOf(body);
        else if (v === undefined) val = '';
        else if (a.t === 's') val = strings[Number(v)] ?? '';
        else if (a.t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
        else if (a.t === 'str' || a.t === 'e') val = decode(v);
        else if (dates.has(Number(a.s)) && Number.isFinite(Number(v))) val = fromSerial(Number(v), date1904);
        else val = tidyNumber(decode(v));
        if (val.trim() !== '') { cells[col] = val; cols = Math.max(cols, col + 1); }
      }
      if (cells.length) { rows.set(rowNo, cells); lastRow = Math.max(lastRow, rowNo); }
    }
    return { name: s.name, rows, cols, lastRow };
  });
}

/** One sheet as text: a line per non-empty row, "row<TAB>cell<TAB>cell…", cells cut at `maxCell` characters. */
export function sheetText(sheet, { maxRows = 200, maxCell = 200 } = {}) {
  const lines = [];
  let shown = 0;
  for (const [no, cells] of [...sheet.rows].sort((a, b) => a[0] - b[0])) {
    if (shown >= maxRows) break;
    const row = Array.from({ length: cells.length }, (_, i) => {
      const t = String(cells[i] ?? '').replace(/\s+/g, ' ').trim();
      return t.length > maxCell ? `${t.slice(0, maxCell - 1)}…` : t;
    });
    lines.push(`${no}\t${row.join('\t')}`);
    shown++;
  }
  const more = sheet.rows.size - shown;
  if (more > 0) lines.push(`… ${more} baris lagi (pakai --max-rows untuk lebih banyak)`);
  return lines.join('\n');
}
