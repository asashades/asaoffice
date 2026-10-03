#!/usr/bin/env node
// Prints an .xlsx file as plain text (read-only, no Python needed):
//   node tools/xlsx-read.mjs <file.xlsx> [--list] [--sheet <name|number>] [--max-rows <n>]
// Each sheet starts with "## <name>", then one line per non-empty row: "<row number><TAB>cell<TAB>cell…".
import path from 'node:path';

import { readWorkbook, sheetText } from './lib/xlsx.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? null : args.splice(i, 2)[1] ?? null;
};
const list = args.includes('--list') && !!args.splice(args.indexOf('--list'), 1);
const sheet = flag('--sheet');
const maxRows = Math.min(5000, Math.max(1, Number(flag('--max-rows')) || 200));
const file = args[0];

if (!file || args.length > 1) {
  console.error('Pakai: node tools/xlsx-read.mjs <file.xlsx> [--list] [--sheet <nama|nomor>] [--max-rows <n>]');
  process.exit(2);
}
if (!/\.(xlsx|xlsm)$/i.test(file)) {
  console.error('Hanya file .xlsx atau .xlsm yang bisa dibaca (file .xls lama belum didukung).');
  process.exit(2);
}

try {
  const sheets = readWorkbook(path.resolve(file), { only: sheet });
  for (const s of sheets) {
    console.log(`## ${s.name} (${s.lastRow} baris, ${s.cols} kolom)`);
    if (!list) console.log(sheetText(s, { maxRows }));
  }
} catch (e) {
  console.error(`Gagal membaca ${path.basename(file)}: ${e.code === 'ENOENT' ? 'file tidak ditemukan' : e.code === 'EACCES' ? 'tidak ada izin membuka file ini' : e.message}`);
  process.exit(1);
}
