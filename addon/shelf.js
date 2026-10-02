// asaoffice Bookshelf (Rak Buku): the Commissioner's notes, an Obsidian vault (a folder of Markdown files, ~/AsaOffice-Vault
// by default; point it at an existing vault with "Folder vault"). It opens from the HUD's 📚 button or any bookshelf in the
// office, search first: the panel opens on the search box, ↑/↓ + Enter open a note, and typing a name that doesn't exist
// offers to create it (or to save the text as an idea). One column: the list (grouped by kind, each group foldable, with a
// one-line preview) or the note on the full width; Esc steps back. Notes are read first; double-click or "Ubah" edits,
// Ctrl/⌘+Enter saves. Quick capture also lives on the hero card (💡 / N → __asaoffice.shelf.addIdea).
// Notes that contain #konteks are also given to the team as context for every task. Only this Mac can use it (the API is
// loopback-only); a phone sees a hint. See tools/lib/vault.mjs for the server side.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Rak Buku', vault: 'Vault', openObsidian: 'Buka di Obsidian', hintVault: 'Di Obsidian: Open folder as vault, lalu pilih folder ini.',
      obNotKnown: 'Obsidian belum mengenal vault ini, jadi catatan tidak bisa dibuka dari sini.', obRegister: 'Daftarkan ke Obsidian', obCopy: 'Salin path vault', obCopied: 'Path vault disalin.',
      obRunning: 'Tutup Obsidian dulu (⌘Q), lalu klik Daftarkan lagi. Atau di Obsidian: Open folder as vault, lalu pilih folder vault ini (path-nya bisa disalin).',
      obNotInstalled: 'Obsidian belum pernah dijalankan di Mac ini. Buka Obsidian sekali (atau pasang dulu), lalu coba lagi. Atau di Obsidian: Open folder as vault, lalu pilih folder vault ini.', obFailed: 'Gagal mendaftarkan vault. Pakai cara manual: di Obsidian pilih Open folder as vault.',
      search: 'Cari catatan, atau ketik untuk bikin yang baru…', report: '📜 Tulis laporan hari ini', back: 'Kembali',
      ideas: '💡 Ide & TODO', reports: '📜 Laporan', notes: '📝 Catatan', other: '📁 Lainnya', empty: 'Belum ada catatan. Ketik sesuatu di atas lalu Enter.', noMatch: 'Gak ada yang cocok.',
      createNote: (t) => `📝 Buat catatan “${t}”`, createIdea: (t) => `💡 Simpan jadi ide/TODO: “${t}”`,
      edit: 'Ubah', save: 'Simpan', cancel: 'Batal', saved: 'Tersimpan ✓', unsaved: '● belum disimpan', keepEditing: 'Masih ada yang belum disimpan. Simpan dengan Ctrl/⌘+Enter, atau klik Batal.',
      toShades: '→ Shades', toShadesTip: 'Kirim jadi tugas ke Shades', context: 'Dibaca tim sebagai konteks', newNoteTitle: 'Catatan baru',
      changeVault: '⚙ Folder vault', vaultPlaceholder: 'Tempel path folder vault Obsidian…', vaultFromEnv: 'Diatur lewat OFFICE_VAULT di Terminal.',
      vaultErr: { relative: 'Pakai path lengkap, mulai dari / atau ~.', notfound: 'Folder itu gak ketemu.', outside: 'Folder harus ada di dalam folder home kamu.', perm: 'Gak bisa akses folder itu. Di Mac: System Settings → Privacy & Security → Files and Folders (atau Full Disk Access), izinkan Terminal.', env: 'Diatur lewat OFFICE_VAULT di Terminal.' },
      offline: 'Rak buku cuma bisa dibuka dari Mac yang menjalankan kantor (npm run office).', failed: 'Gagal: ',
      contextNote: 'Tulis #konteks di catatan biar dibaca Shades dan tim tiap ada tugas.', hint: '↑↓←→ pilih · Enter buka · Esc kembali',
      reportH: (d) => `Laporan ${d}`, today: (d, s, t, f) => `Hari ini (${d}): ${s} sesi Claude, ${t} tool call, ${f} file diedit.`,
      quiet: 'Hari ini belum ada sesi Claude.', streak: (n) => `Streak kerja: ${n} hari 🔥`, done: 'Tugas selesai', decide: 'Menunggu keputusanmu', none: 'Belum ada.',
      ago: (m) => (m < 1 ? 'baru saja' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`),
      ideaSaved: '💡 Tersimpan di Ide & TODO',
      recent: '🕒 Terbaru', noteCount: (n) => `${n} catatan`, results: (n) => `Hasil pencarian (${n})`,
      folders: 'Folder', foldHome: 'Vault', newFolder: '＋ Folder', newNoteHere: '＋ Catatan', folderName: 'Nama folder baru, Enter untuk buat', emptyFolder: 'Folder ini kosong.',
      items: (n) => `${n} isi`, renameTip: 'Ganti nama', moveTip: 'Pindahkan ke folder lain', trashTip: 'Hapus (dipindah ke .trash)', sure: 'Yakin? Klik lagi', protectedTip: 'Bawaan Rak Buku, tidak bisa diubah',
      moveHere: 'Pindahkan ke…', moveRoot: '🏠 (akar vault)', cancelShort: 'Batal', dropHint: 'Seret catatan ke folder buat memindahkan',
      linksFixed: (l, f) => (l ? ` · ${l} tautan diperbarui di ${f} catatan` : ''), moved: (n) => `Dipindahkan: ${n}`, renamed: (n) => `Diganti jadi: ${n}`, madeFolder: (n) => `Folder dibuat: ${n}`, trashed: (n) => `“${n}” dipindah ke .trash di vault (bisa dikembalikan lewat Finder atau Obsidian).`,
      fileErr: { exists: 'Sudah ada yang bernama itu di sana.', protected: 'Ini bawaan Rak Buku (Ide-TODO, Catatan, Laporan), tidak bisa diubah.', inside: 'Folder tidak bisa dipindah ke dalam dirinya sendiri.', path: 'Nama atau lokasi itu tidak valid.', missing: 'Item itu sudah tidak ada.', write: 'Gagal menulis ke vault.' },
      wikiMissing: (t) => `Catatan “${t}” belum ada: dibuatkan baru.`, imgMissing: 'gambar tidak ketemu',
      gallery: 'Galeri', listMode: 'Daftar', newCard: 'Catatan baru', openTodos: (n) => (n ? `${n} belum selesai` : 'Semua beres'), emptyCard: 'Kosong',
    },
    en: {
      title: 'Bookshelf', vault: 'Vault', openObsidian: 'Open in Obsidian', hintVault: 'In Obsidian: Open folder as vault, then pick this folder.',
      obNotKnown: 'Obsidian does not know this vault yet, so the note cannot be opened from here.', obRegister: 'Add it to Obsidian', obCopy: 'Copy vault path', obCopied: 'Vault path copied.',
      obRunning: 'Quit Obsidian first (⌘Q), then click Add again. Or in Obsidian: Open folder as vault and pick this vault folder (you can copy its path).',
      obNotInstalled: 'Obsidian has not been run on this Mac yet. Open Obsidian once (or install it), then try again. Or in Obsidian: Open folder as vault and pick this vault folder.', obFailed: 'Could not add the vault. Do it by hand: in Obsidian choose Open folder as vault.',
      search: 'Search notes, or type to create a new one…', report: "📜 Write today's report", back: 'Back',
      ideas: '💡 Ideas & TODO', reports: '📜 Reports', notes: '📝 Notes', other: '📁 Other', empty: 'No notes yet. Type something above and press Enter.', noMatch: 'Nothing matches.',
      createNote: (t) => `📝 Create note “${t}”`, createIdea: (t) => `💡 Save as idea/TODO: “${t}”`,
      edit: 'Edit', save: 'Save', cancel: 'Cancel', saved: 'Saved ✓', unsaved: '● unsaved', keepEditing: 'There are unsaved changes. Save with Ctrl/⌘+Enter, or click Cancel.',
      toShades: '→ Shades', toShadesTip: 'Send to Shades as a task', context: 'Read by the team as context', newNoteTitle: 'New note',
      changeVault: '⚙ Vault folder', vaultPlaceholder: 'Paste the path of your Obsidian vault folder…', vaultFromEnv: 'Set by OFFICE_VAULT in Terminal.',
      vaultErr: { relative: 'Use the full path, starting with / or ~.', notfound: 'That folder was not found.', outside: 'The folder must be inside your home folder.', perm: 'Cannot access that folder. On a Mac: System Settings → Privacy & Security → Files and Folders (or Full Disk Access), allow Terminal.', env: 'Set by OFFICE_VAULT in Terminal.' },
      offline: 'The bookshelf only opens from the Mac that runs the office (npm run office).', failed: 'Failed: ',
      contextNote: 'Write #konteks in a note to have Shades and the team read it with every task.', hint: '↑↓←→ choose · Enter open · Esc back',
      reportH: (d) => `Report ${d}`, today: (d, s, t, f) => `Today (${d}): ${s} Claude sessions, ${t} tool calls, ${f} files edited.`,
      quiet: 'No Claude sessions yet today.', streak: (n) => `Work streak: ${n} days 🔥`, done: 'Tasks done', decide: 'Waiting for your decision', none: 'None yet.',
      ago: (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`),
      ideaSaved: '💡 Saved to Ideas & TODO',
      recent: '🕒 Recent', noteCount: (n) => `${n} notes`, results: (n) => `Search results (${n})`,
      folders: 'Folders', foldHome: 'Vault', newFolder: '＋ Folder', newNoteHere: '＋ Note', folderName: 'New folder name, Enter to create', emptyFolder: 'This folder is empty.',
      items: (n) => `${n} items`, renameTip: 'Rename', moveTip: 'Move to another folder', trashTip: 'Delete (moved to .trash)', sure: 'Sure? Click again', protectedTip: 'Part of the Bookshelf, cannot be changed',
      moveHere: 'Move to…', moveRoot: '🏠 (vault root)', cancelShort: 'Cancel', dropHint: 'Drag a note onto a folder to move it',
      linksFixed: (l, f) => (l ? ` · ${l} link(s) updated in ${f} note(s)` : ''), moved: (n) => `Moved: ${n}`, renamed: (n) => `Renamed to: ${n}`, madeFolder: (n) => `Folder created: ${n}`, trashed: (n) => `“${n}” moved to .trash in the vault (restore it from Finder or Obsidian).`,
      fileErr: { exists: 'Something with that name is already there.', protected: 'This is part of the Bookshelf (Ide-TODO, Catatan, Laporan) and cannot be changed.', inside: 'A folder cannot be moved into itself.', path: 'That name or place is not valid.', missing: 'That item is gone.', write: 'Could not write to the vault.' },
      wikiMissing: (t) => `Note “${t}” does not exist yet: made a new one.`, imgMissing: 'image not found',
      gallery: 'Gallery', listMode: 'List', newCard: 'New note', openTodos: (n) => (n ? `${n} open` : 'All done'), emptyCard: 'Empty',
    },
  });

  const css = `
  .asa-shelf { display: flex; flex-direction: column; gap: 8px; min-height: 380px; }
  .asa-shelf input[type=search], .asa-shelf input[type=text], .asa-shelf textarea { font: inherit; font-size: 15px; padding: 8px 10px; background: #fffbe9; color: #3a2117;
    border: 2px solid #744122; width: 100%; box-sizing: border-box; }
  .asa-shelf input[type=search] { font-size: 16px; }
  .asa-panel.asa-plain .asa-shelf textarea { flex: 1; min-height: 330px; resize: vertical; font-family: ui-monospace, Menlo, monospace; font-size: 13.5px; line-height: 1.5; }
  .asa-shelf-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .asa-shelf-bar .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-shelf-list { overflow: auto; max-height: 52vh; border: 2px solid #d9c49a; background: #fffbe9; }
  .asa-shelf-group { display: flex; width: 100%; align-items: center; gap: 6px; font: inherit; font-size: 13px; padding: 7px 10px; cursor: pointer; text-align: left;
    background: #f4e6c4; color: #973a2f; border: 0; border-bottom: 1px solid #e6d3a6; position: sticky; top: 0; z-index: 1; }
  .asa-shelf-group small { opacity: 0.7; margin-left: auto; }
  .asa-shelf-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 12px; width: 100%; text-align: left; font: inherit; padding: 8px 12px; cursor: pointer;
    background: none; color: inherit; border: 0; border-bottom: 1px solid #f0e4c4; border-left: 4px solid transparent; }
  .asa-shelf-row:hover, .asa-shelf-row.cur { background: #f4e6c4; }
  .asa-shelf-row.cur { border-left-color: #c8503c; }
  .asa-shelf-row b { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-shelf-row small { font-size: 12px; opacity: 0.6; white-space: nowrap; align-self: start; }
  .asa-shelf-row span { grid-column: 1 / 3; font-size: 13px; opacity: 0.75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-shelf-row.create b { color: #3f8a36; }
  .asa-shelf-doc { border: 2px solid #d9c49a; background: #fffbe9; padding: 12px 16px; overflow: auto; max-height: 56vh; font-size: 15px; }
  .asa-shelf-doc h1, .asa-shelf-doc h2, .asa-shelf-doc h3 { font-weight: 600; margin: 12px 0 4px; color: #973a2f; }
  .asa-shelf-doc h1 { font-size: 21px; margin-top: 2px; } .asa-shelf-doc h2 { font-size: 18px; } .asa-shelf-doc h3 { font-size: 16px; }
  .asa-shelf-doc p, .asa-shelf-doc li { margin: 4px 0; }
  .asa-shelf-doc ul { margin: 4px 0; padding-left: 20px; }
  .asa-shelf-doc code { background: #f0e2bb; padding: 0 3px; }
  .asa-shelf-doc .tag { color: #4a86d8; } .asa-shelf-doc .wiki { color: #7a4fb8; }
  .asa-shelf-task { display: flex; gap: 8px; align-items: baseline; margin: 5px 0; }
  .asa-shelf-task.done span { text-decoration: line-through; opacity: 0.55; }
  .asa-shelf-task input { width: auto; }
  .asa-shelf-task .asa-btn { margin-left: auto; padding: 1px 8px; font-size: 12px; }
  .asa-shelf-msg { font-size: 13px; min-height: 18px; opacity: 0.85; }
  .asa-shelf-foot { font-size: 12.5px; opacity: 0.75; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .asa-shelf-foot input { max-width: 100%; margin-top: 4px; }
  .asa-shelf-hint { font-size: 12px; opacity: 0.55; }
  .asa-shelf-top { display: flex; gap: 8px; align-items: stretch; }
  .asa-shelf-top input { flex: 1; min-width: 0; }
  .asa-shelf-modes { display: flex; flex: none; }
  .asa-shelf-modes .asa-btn { padding: 4px 11px; font-size: 14px; }
  .asa-shelf-modes .asa-btn + .asa-btn { margin-left: -2px; }
  .asa-shelf-modes .asa-btn.on { background: #744122; color: #fff6dc; }
  .asa-shelf-gal { overflow: auto; max-height: 54vh; padding: 2px; }
  .asa-shelf-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; padding: 2px; }
  .asa-ncard { display: flex; flex-direction: column; gap: 4px; min-height: 132px; padding: 10px 12px 8px; text-align: left; font: inherit; cursor: pointer; color: inherit;
    background: #fffbe9; border: 2px solid #d9c49a; box-shadow: 0 2px 0 rgba(116,65,34,0.22); min-width: 0; }
  .asa-ncard:hover { border-color: #b8935c; }
  .asa-ncard.cur { border-color: #c8503c; box-shadow: 0 0 0 2px #c8503c, 0 2px 0 rgba(116,65,34,0.22); }
  .asa-ncard b { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-ncard p { margin: 0; flex: 1; font-size: 13px; line-height: 1.4; opacity: 0.78; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; white-space: pre-line; }
  .asa-ncard small { font-size: 11.5px; opacity: 0.6; }
  .asa-ncard.new { align-items: center; justify-content: center; border-style: dashed; color: #3f8a36; background: transparent; box-shadow: none; }
  .asa-ncard.new b { font-size: 26px; font-weight: normal; line-height: 1; }
  .asa-ncard.ideas { background: #f1f6e0; border-color: #9ab87a; }
  .asa-ncard ul { list-style: none; margin: 0; padding: 0; flex: 1; font-size: 13px; line-height: 1.45; overflow: hidden; }
  .asa-ncard li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .asa-ncard li::before { content: '☐ '; opacity: 0.6; }
  .asa-shelf-split { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 10px; min-height: 380px; }
  .asa-tree { overflow: auto; max-height: 54vh; border: 2px solid #d9c49a; background: #fffbe9; padding: 4px 0; }
  .asa-tnode { display: flex; align-items: center; gap: 4px; width: 100%; font: inherit; font-size: 13.5px; text-align: left; padding: 4px 8px 4px 6px; background: none; border: 0; border-left: 3px solid transparent; color: inherit; cursor: pointer; white-space: nowrap; }
  .asa-tnode:hover { background: #f9f0d6; }
  .asa-tnode.on { background: #f4e6c4; border-left-color: #c8503c; font-weight: 600; }
  .asa-tnode.drop { background: #e8f2d4; outline: 2px dashed #3f8a36; outline-offset: -2px; }
  .asa-tnode .lab { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .asa-tnode small { opacity: 0.5; font-size: 11.5px; }
  .asa-tnode .caret { width: 14px; flex: none; text-align: center; font-size: 11px; opacity: 0.7; }
  .asa-tnode .caret:hover { opacity: 1; }
  .asa-tnode.pin { padding-left: 10px; }
  .asa-tsep { border-top: 1px dashed #d9c49a; margin: 4px 8px; }
  .asa-content { overflow: auto; max-height: 54vh; border: 2px solid #d9c49a; background: #fffbe9; padding: 8px 10px; min-width: 0; }
  .asa-chead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; position: sticky; top: -8px; background: #fffbe9; padding: 4px 0; z-index: 2; }
  .asa-chead .grow { flex: 1; min-width: 0; }
  .asa-chead .asa-btn { padding: 3px 9px; font-size: 13px; }
  .asa-chead .trail { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; font-size: 14px; }
  .asa-chead .trail button { font: inherit; background: none; border: 1px solid transparent; padding: 1px 6px; cursor: pointer; color: #973a2f; }
  .asa-chead .trail button:hover, .asa-chead .trail button.drop { background: #f4e6c4; border-color: #c9a877; }
  .asa-chead .sep { opacity: 0.45; }
  .asa-rows { display: flex; flex-direction: column; }
  .asa-treebtn { display: none; padding: 4px 10px; }
  .asa-shelf-cards .asa-ncard { position: relative; cursor: pointer; }
  .asa-ncard.dir { min-height: 84px; background: #f9f0d6; border-color: #c9a877; }
  .asa-ncard.dir.drop, .asa-fold-row.drop { background: #e8f2d4; outline: 2px dashed #3f8a36; outline-offset: -2px; }
  .asa-ncard .acts { position: absolute; top: 4px; right: 4px; display: flex; gap: 2px; opacity: 0; transition: opacity 0.12s; background: rgba(255,251,233,0.95); }
  .asa-ncard:hover .acts, .asa-ncard:focus-within .acts { opacity: 1; }
  @media (hover: none) { .asa-ncard .acts { opacity: 0.8; } }
  .asa-fold-row { display: flex; align-items: center; gap: 4px; padding: 0 6px 0 0; border-bottom: 1px solid #f0e4c4; border-left: 4px solid transparent; }
  .asa-fold-row:hover, .asa-fold-row.cur { background: #f9f0d6; }
  .asa-fold-row.cur { border-left-color: #c8503c; }
  .asa-ncard.cur { border-color: #c8503c; box-shadow: 0 0 0 2px #c8503c; }
  .asa-fold-row .main { flex: 1; min-width: 0; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 0 8px; align-items: baseline; text-align: left; font: inherit; padding: 7px 8px; background: none; border: 0; color: inherit; cursor: pointer; }
  .asa-fold-row .main b { font-weight: 600; font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-fold-row .main small { font-size: 12px; opacity: 0.6; white-space: nowrap; }
  .asa-fold-row .acts { display: flex; gap: 2px; flex: none; }
  .acts button { font: inherit; font-size: 14px; background: none; border: 1px solid transparent; cursor: pointer; padding: 1px 5px; opacity: 0.6; }
  .acts button:hover { opacity: 1; border-color: #c9a877; background: #fffbe9; }
  .acts .lock { opacity: 0.35; font-size: 13px; padding: 1px 6px; }
  .asa-editbox { display: flex; align-items: center; gap: 6px; padding: 6px 8px; margin: 2px 0; background: #f9f0d6; border: 1px dashed #c9a877; grid-column: 1 / -1; }
  .asa-editbox input[type=text], .asa-editbox select { flex: 1; min-width: 0; padding: 4px 8px; font-size: 14px; }
  .asa-editbox select { font: inherit; background: #fffbe9; color: #3a2117; border: 2px solid #744122; }
  .asa-fold-empty { padding: 14px; opacity: 0.6; font-size: 14px; }
  @media (max-width: 720px) {
    .asa-shelf-split { grid-template-columns: 1fr; }
    .asa-tree { display: none; max-height: 30vh; }
    .asa-shelf.tree-open .asa-tree { display: block; }
    .asa-treebtn { display: inline-flex; }
  }
  .asa-shelf-sub { font-size: 12.5px; color: #973a2f; margin: 10px 2px 4px; }
  `;

  const token = new URLSearchParams(location.search).get('token');
  async function api(method, route, body) {
    const port = ns.data?.taskServer?.port;
    if (!port || !token) throw new Error('noApi');
    const res = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || String(res.status));
    return json;
  }

  const IDEAS = 'Ide-TODO.md';
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const modeStore = () => (ns.store.get('shelfMode') === 'list' ? 'list' : 'gallery');

  // ── Reading a note: the Markdown reader lives in markdown.js ──
  const dirOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
  const baseOf = (rel) => rel.slice(rel.lastIndexOf('/') + 1);
  async function loadImage(src, dir, img) {
    const port = ns.data?.taskServer?.port;
    const tok = new URLSearchParams(location.search).get('token');
    try {
      if (!port || !tok) throw new Error('noApi');
      const res = await fetch(`http://127.0.0.1:${port}/api/vault/asset?name=${encodeURIComponent(src)}&from=${encodeURIComponent(dir)}`, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) throw new Error(String(res.status));
      img.onload = () => URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(await res.blob());
    } catch { img.replaceWith(h('span', { class: 'tag' }, `🖼 ${S.imgMissing}: ${src}`)); }
  }
  /** Follows a [[wikilink]]: the note with that name (same folder first), or a new one with that title. */
  async function openWiki(target, dir) {
    try {
      const all = (await api('GET', '/api/vault')).notes;
      const want = target.replace(/\.md$/i, '').toLowerCase();
      const hits = all.filter((n) => n.path.replace(/\.md$/i, '').toLowerCase() === want || baseOf(n.path).replace(/\.md$/i, '').toLowerCase() === want);
      const hit = hits.find((n) => dirOf(n.path) === dir) ?? hits[0];
      if (hit) return openNote(hit.path);
      newNote(target, dir);
      say(S.wikiMissing(target));
    } catch (err) { say(S.failed + err.message); }
  }
  function renderNote(el, text, rel) {
    const dir = dirOf(rel);
    ns.markdown.render(el, text, {
      dir,
      toggle: (lineNo, checked) => toggle(rel, lineNo, checked),
      taskExtra: rel === IDEAS ? (li, taskText) => li.append(h('button', { type: 'button', class: 'asa-btn', title: S.toShadesTip, onclick: () => { ns.panel.close(); ns.mailbox?.compose(taskText.replace(/#konteks\b/g, '').trim()); } }, S.toShades)) : null,
      wiki: (target) => openWiki(target, dir),
      image: (src, img) => loadImage(src, dir, img),
    });
  }

  let state = null; // the open panel's state
  const say = (t) => { if (state?.msg) state.msg.textContent = t; };
  const rerender = () => state?.panel?.rerender();

  async function toggle(rel, lineNo, checked) {
    try {
      const { text } = await api('GET', `/api/vault/note?path=${encodeURIComponent(rel)}`);
      const lines = text.split('\n');
      lines[lineNo] = lines[lineNo].replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
      await api('POST', '/api/vault/note', { path: rel, text: lines.join('\n') });
      await openNote(rel);
    } catch (err) { say(S.failed + err.message); }
  }

  // ── Data ──
  async function loadList(q = state?.q ?? '') {
    const res = await api('GET', `/api/vault${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    state.vault = res.path;
    state.obsidian = res.obsidian ?? null;
    state.fromEnv = !!res.fromEnv;
    state.notes = res.notes;
    if (!q) state.all = res.notes;
    state.cursor = 0;
  }
  async function openNote(rel) {
    try {
      state.text = (await api('GET', `/api/vault/note?path=${encodeURIComponent(rel)}`)).text;
      state.sel = rel;
      state.view = 'note';
      state.draft = null;
      if (!state.notes.some((n) => n.path === rel)) await loadList('');
      rerender();
    } catch (err) { say(S.failed + err.message); }
  }
  async function backToList() {
    state.view = 'list';
    state.sel = null;
    state.draft = null;
    state.pathEdit = false;
    try { await Promise.all([loadList(), loadFolders()]); } catch { /* keep the old list */ }
    rerender();
  }

  /** Quick capture: one line appended to Ide-TODO.md. Also used by the hero card. */
  const addIdea = (text) => api('POST', '/api/vault/idea', { text });

  async function writeReport() {
    const day = dayKey();
    const d = ns.data?.stats?.days?.[day];
    const mail = (ns.data?.mail ?? []).filter((l) => !l.report);
    const doneToday = mail.filter((l) => l.status === 'done' && l.finishedAt && dayKey(new Date(l.finishedAt)) === day);
    const waiting = mail.filter((l) => l.status === 'awaiting');
    const line = (l) => `- ${l.title}${l.name ? ` (${l.name})` : ''}`;
    const parts = [`# ${S.reportH(day)}`, ''];
    parts.push(d?.tools ? S.today(day, d.sessions ?? 0, d.tools, d.files ?? 0) : S.quiet);
    if (ns.data?.stats?.streak) parts.push('', S.streak(ns.data.stats.streak));
    parts.push('', `## ${S.done}`, ...(doneToday.length ? doneToday.map(line) : [S.none]));
    parts.push('', `## ${S.decide}`, ...(waiting.length ? waiting.map(line) : [S.none]), '');
    const rel = `Laporan/${day}.md`;
    try {
      await api('POST', '/api/vault/note', { path: rel, text: parts.join('\n') });
      state.q = '';
      await loadList('');
      await openNote(rel);
    } catch (err) { say(S.failed + err.message); }
  }

  /** A new note opens straight in the editor, named from its first line when saved. */
  function newNote(title = '', dir = null) {
    state.newDir = dir ?? navDir(); // null: the Catatan folder
    state.view = 'new';
    state.sel = null;
    state.draft = title ? `# ${title}\n\n` : '# ';
    rerender();
  }
  async function saveNew(text) {
    const first = text.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean);
    const stamp = new Date().toLocaleString('sv-SE', { hour12: false }).replace(/:/g, '.').slice(0, 16);
    const name = String(first || `${S.newNoteTitle} ${stamp}`).replace(/[\\/:*?"<>|#]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    try {
      const base = state.newDir == null ? 'Catatan' : state.newDir;
      const at = (stem) => (base ? `${base}/${stem}.md` : `${stem}.md`);
      let rel = at(name);
      const all = (await api('GET', '/api/vault')).notes;
      for (let i = 2; all.some((n) => n.path === rel); i++) rel = at(`${name} ${i}`);
      await api('POST', '/api/vault/note', { path: rel, text });
      state.q = '';
      await loadList('');
      await openNote(rel);
    } catch (err) { say(S.failed + err.message); }
  }

  // ── The shelf: a folder tree on the left, the chosen folder (or the newest notes) on the right ──
  const PROTECTED = new Set(['Ide-TODO.md', 'Catatan', 'Laporan']);
  const join = (dir, name) => (dir ? `${dir}/${name}` : name);
  const crumbsOf = (dir) => (dir ? dir.split('/') : []);
  /** A note is shown under its file name (what renaming changes), like Obsidian's file list; the ideas file keeps its friendly name. */
  const nameOf = (n) => (n.path === IDEAS ? S.ideas : baseOf(n.path).replace(/\.md$/i, ''));
  const navDir = () => (state.nav.type === 'dir' ? state.nav.dir : null); // null: not inside a folder (the newest notes)
  const openDirs = new Set((() => { try { return JSON.parse(ns.store.get('shelfOpenDirs') || '["Catatan"]'); } catch { return ['Catatan']; } })());
  const saveOpenDirs = () => ns.store.set('shelfOpenDirs', JSON.stringify([...openDirs].slice(-200)));

  const childrenOf = (dir) => (state.folders ?? []).filter((f) => dirOf(f) === dir);
  const notesIn = (dir) => (state.all ?? []).filter((n) => dirOf(n.path) === dir).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
  const countIn = (dir) => (dir ? (state.all ?? []).filter((n) => n.path.startsWith(`${dir}/`)).length : (state.all ?? []).length);

  async function loadFolders() {
    try { state.folders = (await api('GET', '/api/vault/tree')).folders ?? []; } catch { state.folders = state.folders ?? []; }
  }
  /** After the vault changed (rename, move, delete, new folder): fresh data, and a valid place to stand. */
  async function refreshAll() {
    await Promise.all([loadList('').catch(() => {}), loadFolders()]);
    while (state.nav.type === 'dir' && state.nav.dir && !state.folders.includes(state.nav.dir)) state.nav = { type: 'dir', dir: dirOf(state.nav.dir) };
    paintTree();
    paintContent();
  }
  function go(nav) {
    state.nav = nav;
    state.edit = null;
    state.cursor = 0;
    state.keyNav = false;
    if (nav.type === 'dir') for (let d = nav.dir; d; d = dirOf(d)) openDirs.add(d);
    saveOpenDirs();
    if (state.q) { state.q = ''; if (state.searchEl) state.searchEl.value = ''; loadList('').then(() => { paintTree(); paintContent(); }); return; }
    paintTree();
    paintContent();
  }

  async function fileOp(route, body, okText) {
    try {
      const res = await api('POST', route, body);
      state.edit = null;
      await refreshAll();
      say(okText?.(res) ?? '');
      return true;
    } catch (err) {
      say(S.fileErr[err.message] ?? S.failed + err.message);
      state.edit = null;
      paintContent();
      return false;
    }
  }
  const moveTo = (from, destDir, name) => fileOp('/api/vault/move', { from, to: join(destDir, name) }, (res) => S.moved(join(destDir, name)) + S.linksFixed(res.links?.links, res.links?.files));

  function dropTarget(el, destDir) {
    el.addEventListener('dragover', (e) => { if (state.drag) { e.preventDefault(); el.classList.add('drop'); } });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drop');
      const src = state.drag;
      state.drag = null;
      if (!src || dirOf(src) === destDir || src === destDir || destDir.startsWith(`${src}/`)) return;
      moveTo(src, destDir, baseOf(src));
    });
  }

  // ── The tree (left) ──
  function paintTree() {
    const el = state?.treeEl;
    if (!el) return;
    const out = [];
    const pin = (label, active, onclick, small) => h('button', { type: 'button', class: `asa-tnode pin${active ? ' on' : ''}`, onclick }, h('span', { class: 'lab' }, label), small ? h('small', {}, small) : null);
    const ideas = (state.all ?? []).find((n) => n.path === IDEAS);
    out.push(pin(S.recent, state.nav.type === 'recent' && !state.q.trim(), () => go({ type: 'recent' })));
    if (ideas) out.push(pin(S.ideas, state.view === 'note' && state.sel === IDEAS, () => openNote(IDEAS), ideas.open ? String(ideas.open) : ''));
    out.push(h('div', { class: 'asa-tsep' }));
    const node = (dir, name, depth) => {
      const kids = dir ? childrenOf(dir) : (state.folders ?? []).filter((f) => !f.includes('/'));
      const open = !dir || openDirs.has(dir);
      const active = state.nav.type === 'dir' && state.nav.dir === dir && !state.q.trim();
      const caret = h('span', { class: `caret${kids.length ? '' : ' none'}` }, kids.length ? (open ? '▾' : '▸') : '');
      caret.onclick = (e) => { e.stopPropagation(); if (!kids.length || !dir) return; if (open) openDirs.delete(dir); else openDirs.add(dir); saveOpenDirs(); paintTree(); };
      const row = h('button', { type: 'button', class: `asa-tnode${active ? ' on' : ''}`, style: { paddingLeft: `${6 + depth * 14}px` }, title: dir || S.foldHome, onclick: () => go({ type: 'dir', dir }) },
        caret, h('span', { class: 'lab' }, `${dir ? '📁' : '🏠'} ${name}`), h('small', {}, String(countIn(dir))));
      dropTarget(row, dir);
      out.push(row);
      if (open) for (const k of kids) node(k, baseOf(k), depth + 1);
    };
    node('', S.foldHome, 0);
    el.replaceChildren(...out);
    el.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }

  // ── The content (right) ──
  /** What the right side shows: search results, the newest notes, or one folder (its folders first, then its notes). */
  function contentItems() {
    const q = state.q.trim();
    if (q) return [{ kind: 'create-note', text: q }, { kind: 'create-idea', text: q }, ...state.notes.map((n) => ({ kind: 'note', n, showDir: true }))];
    if (state.nav.type === 'recent') return (state.all ?? []).slice(0, 100).map((n) => ({ kind: 'note', n, showDir: true }));
    const dir = state.nav.dir;
    return [...childrenOf(dir).map((path) => ({ kind: 'dir', path, name: baseOf(path), count: countIn(path) })), ...notesIn(dir).map((n) => ({ kind: 'note', n }))];
  }

  function activate(item) {
    if (!item) return;
    if (item.kind === 'note') openNote(item.n.path);
    else if (item.kind === 'dir') go({ type: 'dir', dir: item.path });
    else if (item.kind === 'create-note') newNote(item.text);
    else if (item.kind === 'create-idea') {
      addIdea(item.text).then(async () => { state.q = ''; if (state.searchEl) state.searchEl.value = ''; await refreshAll(); say(S.ideaSaved); }).catch((e) => say(S.failed + e.message));
    }
  }

  /** ✏️ 📂 🗑 for one entry (🔒 for the Bookshelf's own files), and the drag handles. */
  function entryActions(el, kind, rel, name) {
    const locked = PROTECTED.has(rel);
    if (locked) return h('div', { class: 'acts' }, h('span', { class: 'lock', title: S.protectedTip }, '🔒'));
    const trash = h('button', { type: 'button', title: S.trashTip, 'aria-label': S.trashTip }, '🗑');
    trash.onclick = (e) => {
      e.stopPropagation();
      if (state.armed === rel && Date.now() < state.armedUntil) { state.armed = null; return fileOp('/api/vault/trash', { path: rel }, () => S.trashed(name)); }
      state.armed = rel;
      state.armedUntil = Date.now() + 3500;
      trash.textContent = S.sure;
      setTimeout(() => { if (trash.isConnected && state.armed === rel) { state.armed = null; trash.textContent = '🗑'; } }, 3600);
    };
    el.draggable = true;
    el.addEventListener('dragstart', (e) => { state.drag = rel; e.dataTransfer?.setData('text/plain', rel); });
    el.addEventListener('dragend', () => { state.drag = null; });
    return h('div', { class: 'acts' },
      h('button', { type: 'button', title: S.renameTip, 'aria-label': S.renameTip, onclick: (e) => { e.stopPropagation(); state.edit = { kind: 'rename', rel }; paintContent(); } }, '✏️'),
      h('button', { type: 'button', title: S.moveTip, 'aria-label': S.moveTip, onclick: (e) => { e.stopPropagation(); state.edit = { kind: 'move', rel }; paintContent(); } }, '📂'),
      trash);
  }

  /** The inline rename / move box that replaces an entry while it is being changed. */
  function editBox(kind, rel, name) {
    const isDir = kind === 'dir';
    const dir = dirOf(rel);
    const cancel = h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.edit = null; paintContent(); } }, S.cancelShort);
    const box = h('div', { class: 'asa-editbox' }, h('span', {}, isDir ? '📁' : '📝'));
    if (state.edit.kind === 'rename') {
      const shown = isDir ? name : name.replace(/\.md$/i, '');
      const input = h('input', { type: 'text', value: shown, 'aria-label': S.renameTip });
      const doIt = () => {
        const v = input.value.trim().replace(/\.md$/i, '');
        if (!v || v === shown) { state.edit = null; paintContent(); return; }
        fileOp('/api/vault/move', { from: rel, to: join(dir, isDir ? v : `${v}.md`) }, (res) => S.renamed(v) + S.linksFixed(res.links?.links, res.links?.files));
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); doIt(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); state.edit = null; paintContent(); }
      };
      box.append(input, h('button', { type: 'button', class: 'asa-btn primary', onclick: doIt }, S.save), cancel);
      setTimeout(() => { input.focus(); input.select(); }, 0);
    } else {
      const dirs = (state.folders ?? []).filter((f) => f !== rel && !f.startsWith(`${rel}/`) && f !== dir);
      const pick = h('select', { 'aria-label': S.moveHere }, h('option', { value: '__' }, S.moveHere), dir ? h('option', { value: '' }, S.moveRoot) : null, dirs.map((f) => h('option', { value: f }, `📁 ${f}`)));
      pick.onchange = () => { if (pick.value !== '__') moveTo(rel, pick.value, name); };
      box.append(h('b', {}, isDir ? name : name.replace(/\.md$/i, '')), pick, cancel);
    }
    return box;
  }

  function paintContent() {
    const el = state?.contentEl;
    if (!el) return;
    const q = state.q.trim();
    const items = contentItems();
    if (state.cursor >= items.length) state.cursor = Math.max(0, items.length - 1);
    const out = [];

    // Header: where you are
    const head = h('div', { class: 'asa-chead' });
    if (q) head.append(h('b', { class: 'grow' }, `🔍 ${S.results(state.notes.length)}`));
    else if (state.nav.type === 'recent') head.append(h('b', { class: 'grow' }, S.recent));
    else {
      const crumb = (label, dir) => { const b = h('button', { type: 'button', onclick: () => go({ type: 'dir', dir }) }, label); dropTarget(b, dir); return b; };
      const trail = h('span', { class: 'trail grow' }, crumb(`🏠 ${S.foldHome}`, ''));
      crumbsOf(state.nav.dir).forEach((seg, k, arr) => trail.append(h('span', { class: 'sep' }, '/'), crumb(seg, arr.slice(0, k + 1).join('/'))));
      head.append(trail);
    }
    if (!q) {
      head.append(h('button', { type: 'button', class: 'asa-btn', onclick: () => newNote('') }, S.newNoteHere));
      if (state.nav.type === 'dir') head.append(h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.edit = { kind: 'newfolder' }; paintContent(); } }, S.newFolder));
    }
    out.push(head);

    if (state.edit?.kind === 'newfolder' && state.nav.type === 'dir') {
      const input = h('input', { type: 'text', placeholder: S.folderName, 'aria-label': S.folderName });
      input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); const name = input.value.trim(); if (name) fileOp('/api/vault/folder', { path: join(state.nav.dir, name) }, () => S.madeFolder(join(state.nav.dir, name))); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); state.edit = null; paintContent(); }
      };
      out.push(h('div', { class: 'asa-editbox' }, h('span', {}, '📁'), input, h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.edit = null; paintContent(); } }, S.cancelShort)));
      setTimeout(() => input.focus(), 0);
    }

    const grid = state.mode === 'gallery';
    const cards = [];
    items.forEach((it, i) => {
      const cur = state.keyNav && i === state.cursor ? ' cur' : '';
      const click = () => { state.cursor = i; activate(it); };
      if (it.kind === 'create-note' || it.kind === 'create-idea') {
        cards.push(h('button', { type: 'button', class: `asa-shelf-row create${cur}`, style: grid ? { gridColumn: '1 / -1' } : {}, onclick: click }, h('b', {}, it.kind === 'create-note' ? S.createNote(it.text) : S.createIdea(it.text))));
        return;
      }
      const isDir = it.kind === 'dir';
      const rel = isDir ? it.path : it.n.path;
      const name = isDir ? it.name : baseOf(it.n.path);
      if (state.edit?.rel === rel) { cards.push(editBox(it.kind, rel, name)); return; }
      const mins = isDir ? 0 : Math.max(0, Math.round((Date.now() - it.n.mtime) / 60000));
      const where = it.showDir && dirOf(it.n?.path ?? '') ? `📁 ${dirOf(it.n.path)} · ` : '';
      let node;
      if (grid) {
        node = isDir
          ? h('div', { class: `asa-ncard dir${cur}`, onclick: click }, h('b', {}, `📁 ${it.name}`), h('p', {}, S.noteCount(it.count)))
          : h('div', { class: `asa-ncard${cur}`, onclick: click }, h('b', {}, `${it.n.context ? '🔖 ' : ''}${nameOf(it.n)}`), h('p', {}, it.n.preview || S.emptyCard), h('small', {}, `${where}${S.ago(mins)}`));
        node.append(entryActions(node, isDir ? 'dir' : 'note', rel, name));
      } else {
        node = h('div', { class: `asa-fold-row${cur}` });
        node.append(h('button', { type: 'button', class: 'main', onclick: click },
          h('span', {}, isDir ? '📁' : '📝'), h('b', {}, isDir ? it.name : `${it.n.context ? '🔖 ' : ''}${nameOf(it.n)}`),
          h('small', {}, isDir ? S.noteCount(it.count) : `${where}${S.ago(mins)}`)), entryActions(node, isDir ? 'dir' : 'note', rel, name));
      }
      if (isDir) dropTarget(node, rel);
      cards.push(node);
    });
    if (!items.length) cards.push(h('div', { class: 'asa-fold-empty' }, q ? S.noMatch : state.nav.type === 'recent' ? S.empty : S.emptyFolder));
    out.push(h('div', { class: grid ? 'asa-shelf-cards' : 'asa-rows' }, cards));
    if (!q && state.nav.type === 'dir' && items.length) out.push(h('div', { class: 'asa-fold-empty', style: { fontSize: '12px', padding: '8px 4px' } }, S.dropHint));
    el.replaceChildren(...out);
    el.querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
  }

  function listView() {
    const search = h('input', { type: 'search', placeholder: S.search, value: state.q, 'aria-label': S.search });
    state.searchEl = search;
    let timer = null;
    search.oninput = () => {
      state.q = search.value;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await loadList(state.q.trim()); } catch (e) { say(S.failed + e.message); return; }
        state.cursor = 0;
        paintTree();
        paintContent();
      }, 180);
    };
    search.onkeydown = (e) => {
      const grid = state.mode === 'gallery';
      if (['ArrowDown', 'ArrowUp'].includes(e.key) || (grid && ['ArrowLeft', 'ArrowRight'].includes(e.key))) {
        e.preventDefault();
        const n = contentItems().length;
        if (!n) return;
        const cols = grid ? Math.max(1, getComputedStyle(state.contentEl.querySelector('.asa-shelf-cards') ?? state.contentEl).gridTemplateColumns.split(' ').length) : 1;
        const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        const step = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? dir : dir * cols;
        const next = state.keyNav ? state.cursor + step : 0;
        state.keyNav = true;
        state.cursor = next < 0 ? 0 : next >= n ? n - 1 : next;
        paintContent();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activate(contentItems()[state.keyNav || state.q.trim() ? state.cursor : 0]);
      }
    };
    const tree = h('aside', { class: 'asa-tree', 'aria-label': S.folders });
    const content = h('section', { class: 'asa-content' });
    state.treeEl = tree;
    state.contentEl = content;
    state.msg = h('div', { class: 'asa-shelf-msg' });
    const bar = h('div', { class: 'asa-shelf-bar' }, h('span', { class: 'asa-shelf-hint grow' }, S.hint),
      h('button', { type: 'button', class: 'asa-btn', onclick: writeReport }, S.report));
    const modes = h('div', { class: 'asa-shelf-modes', role: 'group' },
      ['gallery', 'list'].map((m) => h('button', { type: 'button', class: `asa-btn${state.mode === m ? ' on' : ''}`, title: m === 'gallery' ? S.gallery : S.listMode, 'aria-label': m === 'gallery' ? S.gallery : S.listMode,
        onclick: () => { state.mode = m; ns.store.set('shelfMode', m); state.cursor = 0; state.edit = null; for (const b of modes.children) b.classList.toggle('on', b === modes.children[m === 'gallery' ? 0 : 1]); paintContent(); } }, m === 'gallery' ? '▦' : '☰')));
    const treeBtn = h('button', { type: 'button', class: 'asa-btn asa-treebtn', title: S.folders, 'aria-label': S.folders, onclick: () => { state.treeOpen = !state.treeOpen; root.classList.toggle('tree-open', state.treeOpen); } }, '📁');
    const root = h('div', { class: `asa-shelf${state.treeOpen ? ' tree-open' : ''}` }, h('div', { class: 'asa-shelf-top' }, treeBtn, search, modes), h('div', { class: 'asa-shelf-split' }, tree, content), bar, state.msg, footer());
    setTimeout(() => { search.focus(); search.setSelectionRange(search.value.length, search.value.length); paintTree(); paintContent(); }, 0);
    return root;
  }

  const startEdit = () => { state.view = 'edit'; state.draft = state.text; rerender(); };

  /** Opens the current note in Obsidian: by vault id when Obsidian knows the vault, else a small guide to getting it known. */
  function openInObsidian() {
    const ob = state.obsidian;
    if (ob?.registered && ob.id) {
      const a = h('a', { href: `obsidian://open?vault=${ob.id}&file=${encodeURIComponent(state.sel.replace(/\.md$/i, ''))}` });
      document.body.append(a);
      a.click();
      a.remove();
      return;
    }
    const box = state.msg;
    if (!box) return;
    const copy = h('button', { type: 'button', class: 'asa-btn', onclick: async () => { try { await navigator.clipboard.writeText(state.vault); box.textContent = S.obCopied; } catch { /* no clipboard */ } } }, S.obCopy);
    const text = h('span', {}, ob?.installed === false ? S.obNotInstalled : S.obNotKnown);
    const actions = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' } });
    if (ob?.installed !== false) {
      const add = h('button', { type: 'button', class: 'asa-btn primary' }, S.obRegister);
      add.onclick = async () => {
        add.disabled = true;
        try {
          const res = await api('POST', '/api/vault/obsidian', {});
          state.obsidian = res.obsidian;
          box.textContent = '';
          openInObsidian();
        } catch (err) {
          box.replaceChildren(h('span', {}, err.message === 'running' ? S.obRunning : err.message === 'notinstalled' ? S.obNotInstalled : S.obFailed), h('div', { style: { marginTop: '6px' } }, copy));
        }
      };
      actions.append(add);
    }
    actions.append(copy);
    box.replaceChildren(text, actions);
  }

  function noteView() {
    const sel = state.notes.find((n) => n.path === state.sel);
    const bar = h('div', { class: 'asa-shelf-bar' },
      h('button', { type: 'button', class: 'asa-btn', onclick: backToList }, `← ${S.back}`),
      h('b', { class: 'grow', title: state.sel }, state.sel === IDEAS ? S.ideas : baseOf(state.sel).replace(/\.md$/i, '')));
    const doc = h('div', { class: 'asa-shelf-doc', title: S.edit });
    renderNote(doc, state.text, state.sel);
    doc.ondblclick = (e) => { if (!e.target.closest('button, input, a')) startEdit(); };
    bar.append(h('button', { type: 'button', class: 'asa-btn', onclick: startEdit }, S.edit));
    if (state.vault) {
      bar.append(h('button', { type: 'button', class: 'asa-btn', title: S.hintVault, onclick: openInObsidian }, S.openObsidian));
    }
    state.msg = h('div', { class: 'asa-shelf-msg' }, sel?.context ? `🔖 ${S.context}` : '');
    return h('div', { class: 'asa-shelf' }, bar, doc, state.msg);
  }

  function editView() {
    const fresh = state.view === 'new';
    const ta = h('textarea', { 'aria-label': S.edit });
    ta.value = state.draft ?? '';
    const flag = h('span', { class: 'asa-shelf-hint' }, '');
    const dirty = () => (fresh ? !['', '#'].includes(ta.value.trim()) : ta.value !== state.text);
    ta.oninput = () => { state.draft = ta.value; flag.textContent = dirty() ? S.unsaved : ''; };
    const save = async () => {
      if (fresh) return saveNew(ta.value);
      try {
        await api('POST', '/api/vault/note', { path: state.sel, text: ta.value });
        await loadList('');
        await openNote(state.sel);
        say(S.saved);
      } catch (err) { say(S.failed + err.message); }
    };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } };
    state.warned = false;
    state.leave = () => {
      if (dirty() && !state.warned) { state.warned = true; say(S.keepEditing); return false; }
      return true;
    };
    state.cancel = () => { if (fresh) backToList(); else { state.view = 'note'; state.draft = null; rerender(); } };
    const bar = h('div', { class: 'asa-shelf-bar' },
      h('b', { class: 'grow' }, fresh ? S.newNoteTitle : state.sel), flag,
      h('button', { type: 'button', class: 'asa-btn primary', onclick: save }, S.save),
      h('button', { type: 'button', class: 'asa-btn', onclick: state.cancel }, S.cancel));
    state.msg = h('div', { class: 'asa-shelf-msg' });
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
    return h('div', { class: 'asa-shelf' }, bar, ta, state.msg);
  }

  /** Where the vault is, with a way to point it at an existing Obsidian vault (an inline field, no popup). */
  function footer() {
    const box = h('div', { class: 'asa-shelf-foot' });
    box.append(h('span', { title: state.vault ?? '' }, `${S.vault}: ${String(state.vault ?? '').replace(/^\/(Users|home)\/[^/]+/, '~')}`));
    if (!state.fromEnv) box.append(h('button', { type: 'button', class: 'asa-chip', onclick: () => { state.pathEdit = !state.pathEdit; rerender(); } }, S.changeVault));
    else box.append(S.vaultFromEnv);
    box.append(h('span', {}, S.contextNote));
    if (state.pathEdit && !state.fromEnv) {
      const input = h('input', { type: 'text', placeholder: S.vaultPlaceholder, value: state.vault ?? '', 'aria-label': S.vaultPlaceholder });
      const err = h('div', { style: { color: '#973a2f', width: '100%' } });
      const go = async () => {
        try {
          await api('POST', '/api/vault/path', { path: input.value });
          state.pathEdit = false;
          state.q = '';
          await loadList('');
          rerender();
        } catch (e) { err.textContent = S.vaultErr[e.message] ?? S.failed + e.message; }
      };
      input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      box.append(input, h('button', { type: 'button', class: 'asa-btn primary', onclick: go }, S.save), err);
    }
    return box;
  }

  function open(startText) {
    if (!document.getElementById('asa-shelf-css')) document.head.appendChild(h('style', { id: 'asa-shelf-css' }, css));
    state = { view: 'list', mode: modeStore(), notes: [], sel: null, text: '', q: '', cursor: 0, vault: null, obsidian: null, nav: { type: 'recent' }, all: [], folders: [], treeOpen: false, newDir: null, edit: null, fromEnv: false, draft: null, panel: null, msg: null, listEl: null, pathEdit: false, warned: false };
    state.panel = ns.panel.open({
      theme: 'cozy',
      dock: 'hud',
      title: `📚 ${S.title}`,
      onClose: () => { state = null; },
      // Esc steps back: editing → note → list → close.
      onEscape: () => {
        if (!state) return false;
        if (state.view === 'edit' || state.view === 'new') {
          if (state.leave && !state.leave()) return true;
          state.cancel?.();
          return true;
        }
        if (state.view === 'note') { backToList(); return true; }
        if (state.view === 'list' && state.pathEdit) { state.pathEdit = false; rerender(); return true; }
        if (state.view === 'list' && !state.q && state.edit) { state.edit = null; paintContent(); return true; }
        if (state.view === 'list' && state.q) { state.q = ''; loadList('').then(rerender); return true; }
        if (state.view === 'list' && state.nav.type === 'dir') { go(state.nav.dir ? { type: 'dir', dir: dirOf(state.nav.dir) } : { type: 'recent' }); return true; }
        return false;
      },
      render(body) {
        if (state.offline) { body.append(h('p', {}, S.offline)); return; }
        body.append(state.view === 'list' ? listView() : state.view === 'note' ? noteView() : editView());
      },
    });
    state.panel.el.classList.add('asa-plain');
    ns.refreshData().then(() => Promise.all([loadList(''), loadFolders()])).then(async () => {
      if (typeof startText === 'string' && startText.trim()) { state.q = startText.trim(); await loadList(state.q); }
      rerender();
    }).catch(() => { if (state) { state.offline = true; rerender(); } });
  }

  ns.onFurnitureClick('COZY_BOOKSHELF', () => open());
  ns.shelf = { open, addIdea };
})();
