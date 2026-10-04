// A real team meeting for a task ("🗣 Rapat dulu", Shades only): Shades opens it and picks who to call, each of them answers as themselves in
// two rounds (the second one can answer each other), and Shades then writes the plan from what was said. Every turn is a real, short, read-only
// `claude -p --agent <staff>` call; task-server.mjs runs them, this file holds what is said to them and how their answers are read.
export const MAX_PARTICIPANTS = 3;
export const ROUNDS = 2;
export const TURN_BUDGET_USD = 0.6; // most one turn may spend (also limited by the cost limits)
export const MIN_BUDGET_FOR_ROUND_2 = 0.3;

export const MEETING_SYSTEM = 'Kamu sedang rapat tim kecil di kantor bersama Shades (direktur) dan rekan-rekanmu. Bicara sebagai dirimu sendiri, sesuai perananmu. '
  + 'Kamu boleh membaca kode atau mencari referensi (hanya baca) sebelum menjawab, tapi JANGAN mengubah apa pun dan jangan menjalankan perintah yang mengubah sesuatu. '
  + 'Tulis hanya ucapanmu di rapat, singkat dan konkret, tanpa judul, tanpa menyalin ulang pertanyaan.';

const roleText = (m) => (typeof m.role === 'object' ? m.role?.id ?? m.role?.en : m.role) ?? '';

/** The transcript so far, one line per turn: "Gus (perencana): …". */
export function transcript(turns) {
  return turns.map((t) => `${t.name}${t.role ? ` (${t.role})` : ''}: ${t.text}`).join('\n\n');
}

/** What Shades is asked first: who should be in the meeting, a question for each of them, and a line to open with (as JSON). */
export function openingPrompt({ task, staff }) {
  const list = staff.map((m) => `- ${m.agent}: ${m.name}, ${roleText(m)}`).join('\n');
  return `Komisaris memberi tugas ini:\n"""\n${String(task).slice(0, 3000)}\n"""\n\n`
    + `Kamu akan membuka rapat tim sebelum membuat rencana. Staf yang tersedia:\n${list}\n\n`
    + `Pilih 2 sampai ${MAX_PARTICIPANTS} orang yang paling berguna untuk tugas ini (jangan semua kalau tidak perlu) dan tulis satu pertanyaan tajam untuk masing-masing, sesuai keahliannya. `
    + 'Balas HANYA dengan satu objek JSON, tanpa teks lain, bentuknya: '
    + '{"pembukaan":"satu atau dua kalimat pembuka rapat","peserta":[{"agent":"<id agent>","tanya":"<pertanyaan>"}]}';
}

/** Reads Shades' opening. Returns { open, picks: [{ agent, ask }] } or null when it can't be understood. Unknown or repeated agents are dropped. */
export function parseOpening(text, staff) {
  const raw = String(text ?? '');
  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let j;
  try { j = JSON.parse(raw.slice(a, b + 1)); } catch { return null; }
  const valid = new Set(staff.map((m) => m.agent));
  const seen = new Set();
  const picks = [];
  for (const p of Array.isArray(j.peserta) ? j.peserta : []) {
    const agent = String(p?.agent ?? '');
    if (!valid.has(agent) || seen.has(agent)) continue;
    seen.add(agent);
    picks.push({ agent, ask: String(p?.tanya ?? '').trim().slice(0, 300) });
    if (picks.length >= MAX_PARTICIPANTS) break;
  }
  if (picks.length < 1) return null;
  return { open: String(j.pembukaan ?? '').trim().slice(0, 400), picks };
}

/** Who to call when Shades' opening can't be read: by what the task is about, always including the planner. */
export function fallbackPicks(task, staff) {
  const t = String(task ?? '').toLowerCase();
  const want = [];
  const add = (agent) => { if (!want.includes(agent) && staff.some((m) => m.agent === agent)) want.push(agent); };
  add('gus-planner');
  if (/\b(bug|error|crash|rusak|gagal|fix|benerin|perbaiki)/.test(t)) add('bayu-debugger');
  if (/\b(test|tes|ngetes|qa|coba)/.test(t)) add('wren-tester');
  if (/\b(review|cek|periksa|audit|keamanan|security)/.test(t)) add('pip-reviewer');
  if (/\b(doc|dokumen|readme|tulis|nulis|changelog|laporan|artikel)/.test(t)) add('sari-writer');
  if (/\b(riset|research|cari|bandingin|compare|library|web)/.test(t)) add('iris-researcher');
  for (const m of staff) add(m.agent);
  return want.slice(0, MAX_PARTICIPANTS).map((agent) => ({ agent, ask: 'Apa pendapatmu soal tugas ini, dari sudut pandang perananmu? Apa risiko dan yang perlu dicek?' }));
}

/** What one participant is asked: round 1 answers Shades' question; round 2 reacts to the others (and may ask a colleague something). */
export function turnPrompt({ task, member, ask, turns, round }) {
  const base = `Tugas dari Komisaris:\n"""\n${String(task).slice(0, 3000)}\n"""\n\n`;
  if (round === 1) {
    return `${base}${turns.length ? `Rapat sejauh ini:\n${transcript(turns)}\n\n` : ''}Shades bertanya kepadamu, ${member.name}: ${ask}\n\n`
      + `Jawab dari sudut pandang perananmu (${roleText(member)}), maksimal 120 kata. Boleh baca kode dulu kalau perlu. Kalau kamu tidak setuju dengan seseorang yang sudah bicara, sebut namanya dan alasannya.`;
  }
  return `${base}Rapat sejauh ini:\n${transcript(turns)}\n\n`
    + `Putaran kedua, ${member.name}. Tanggapi pendapat rekanmu: sebut nama kalau kamu setuju, tidak setuju, atau mau menambah, dan kamu boleh mengubah pendapatmu sendiri. `
    + 'Kamu boleh mengajukan SATU pertanyaan kepada satu rekan (sebut namanya) kalau ada yang belum jelas. Maksimal 80 kata.';
}

/** Shades writes the final plan from the whole meeting (this goes to the normal plan-and-approve flow). */
export function synthesisPrompt({ task, turns }) {
  return `Komisaris memberi tugas:\n"""\n${String(task).slice(0, 3000)}\n"""\n\nKamu sudah memimpin rapat tim. Isi rapatnya:\n${transcript(turns)}\n\n`
    + 'Sekarang tulis RENCANA FINAL: langkah bernomor, siapa yang pegang tiap langkah, file yang kena, dan risikonya. '
    + 'Sebut siapa yang mengusulkan apa, dan catat dengan jujur kalau ada perbedaan pendapat dan kenapa kamu memilih salah satunya. '
    + 'Jangan ubah file apa pun. Tutup dengan satu baris: "Menunggu persetujuan Komisaris."';
}
