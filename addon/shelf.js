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
      folders: 'Folder', foldHome: 'Vault', newFolder: '＋ Folder', newNoteHere: '＋ Catatan', folderName: 'Nama folder baru, Enter untuk buat', emptyFolder: 'Folder ini kosong.',
      items: (n) => `${n} isi`, renameTip: 'Ganti nama', moveTip: 'Pindahkan ke folder lain', trashTip: 'Hapus (dipindah ke .trash)', sure: 'Yakin? Klik lagi', protectedTip: 'Bawaan Rak Buku, tidak bisa diubah',
      moveHere: 'Pindahkan ke…', moveRoot: '🏠 (akar vault)', cancelShort: 'Batal', dropHint: 'Seret catatan ke folder buat memindahkan',
      moved: (n) => `Dipindahkan: ${n}`, renamed: (n) => `Diganti jadi: ${n}`, madeFolder: (n) => `Folder dibuat: ${n}`, trashed: (n) => `“${n}” dipindah ke .trash di vault (bisa dikembalikan lewat Finder atau Obsidian).`,
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
      folders: 'Folders', foldHome: 'Vault', newFolder: '＋ Folder', newNoteHere: '＋ Note', folderName: 'New folder name, Enter to create', emptyFolder: 'This folder is empty.',
      items: (n) => `${n} items`, renameTip: 'Rename', moveTip: 'Move to another folder', trashTip: 'Delete (moved to .trash)', sure: 'Sure? Click again', protectedTip: 'Part of the Bookshelf, cannot be changed',
      moveHere: 'Move to…', moveRoot: '🏠 (vault root)', cancelShort: 'Cancel', dropHint: 'Drag a note onto a folder to move it',
      moved: (n) => `Moved: ${n}`, renamed: (n) => `Renamed to: ${n}`, madeFolder: (n) => `Folder created: ${n}`, trashed: (n) => `“${n}” moved to .trash in the vault (restore it from Finder or Obsidian).`,
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
  .asa-fold-crumbs { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; padding: 6px 8px; background: #f4e6c4; border-bottom: 1px solid #e6d3a6; position: sticky; top: 0; z-index: 1; font-size: 13px; }
  .asa-fold-crumbs button { font: inherit; font-size: 13px; background: none; border: 1px solid transparent; padding: 1px 6px; cursor: pointer; color: #973a2f; }
  .asa-fold-crumbs button:hover, .asa-fold-crumbs button.drop { background: #fffbe9; border-color: #c9a877; }
  .asa-fold-crumbs .sep { opacity: 0.5; }
  .asa-fold-crumbs .grow { flex: 1; }
  .asa-fold-row { display: flex; align-items: center; gap: 4px; padding: 0 6px 0 0; border-bottom: 1px solid #f0e4c4; }
  .asa-fold-row:hover { background: #f9f0d6; }
  .asa-fold-row.drop { background: #e8f2d4; outline: 2px dashed #3f8a36; outline-offset: -2px; }
  .asa-fold-row .main { flex: 1; min-width: 0; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 0 8px; align-items: baseline; text-align: left; font: inherit; padding: 7px 8px; background: none; border: 0; color: inherit; cursor: pointer; }
  .asa-fold-row .main b { font-weight: 600; font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-fold-row .main small { font-size: 12px; opacity: 0.6; white-space: nowrap; }
  .asa-fold-row .acts { display: flex; gap: 2px; flex: none; }
  .asa-fold-row .acts button { font: inherit; font-size: 14px; background: none; border: 1px solid transparent; cursor: pointer; padding: 1px 5px; opacity: 0.55; }
  .asa-fold-row .acts button:hover { opacity: 1; border-color: #c9a877; background: #fffbe9; }
  .asa-fold-row .acts .lock { opacity: 0.35; font-size: 13px; padding: 1px 6px; }
  .asa-fold-row.editing { padding: 5px 8px; gap: 6px; }
  .asa-fold-row.editing input[type=text], .asa-fold-row.editing select { flex: 1; min-width: 0; padding: 4px 8px; font-size: 14px; }
  .asa-fold-row.editing select { font: inherit; background: #fffbe9; color: #3a2117; border: 2px solid #744122; }
  .asa-fold-empty { padding: 14px; opacity: 0.6; font-size: 14px; }
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
  const GROUPS = ['ideas', 'notes', 'reports', 'other'];
  const group = (n) => (n.path === IDEAS ? 'ideas' : n.path.startsWith('Laporan/') ? 'reports' : n.path.startsWith('Catatan/') ? 'notes' : 'other');
  const folded = new Set((() => { try { return JSON.parse(ns.store.get('shelfFolded') || '["reports"]'); } catch { return ['reports']; } })());
  const saveFolded = () => ns.store.set('shelfFolded', JSON.stringify([...folded]));
  const modeStore = () => (['list', 'folders'].includes(ns.store.get('shelfMode')) ? ns.store.get('shelfMode') : 'gallery');

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
    state.tree = null;
    try { await loadList(); } catch { /* keep the old list */ }
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
    state.newDir = dir ?? (state.mode === 'folders' ? state.dir : null); // null: the Catatan folder
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

  // ── Views ──
  /** Rows in the order they appear: "create" rows first when something is typed, then the notes (grouped unless searching). */
  function visibleRows() {
    const q = state.q.trim();
    const rows = [];
    if (q) {
      rows.push({ kind: 'create-note', text: q }, { kind: 'create-idea', text: q });
      for (const n of state.notes) rows.push({ kind: 'note', n });
      return { rows, groups: null };
    }
    if (state.mode === 'gallery') {
      // Cards: a "new note" card, Ideas & TODO, then notes and other files; reports stay a foldable list below.
      const cards = [{ kind: 'new' }];
      const ideas = state.notes.find((n) => n.path === IDEAS);
      if (ideas) cards.push({ kind: 'note', n: ideas, g: 'ideas', card: true });
      for (const n of state.notes) if (group(n) === 'notes' || group(n) === 'other') cards.push({ kind: 'note', n, g: group(n), card: true });
      rows.push(...cards);
      const reports = state.notes.filter((n) => group(n) === 'reports');
      if (reports.length && !folded.has('reports')) for (const n of reports) rows.push({ kind: 'note', n, g: 'reports' });
      return { rows, groups: null, gallery: { cards, reports: reports.length } };
    }
    const groups = [];
    for (const g of GROUPS) {
      const items = state.notes.filter((n) => group(n) === g);
      if (!items.length) continue;
      groups.push({ g, count: items.length });
      if (!folded.has(g)) for (const n of items) rows.push({ kind: 'note', n, g });
    }
    return { rows, groups };
  }

  function listView() {
    const search = h('input', { type: 'search', placeholder: S.search, value: state.q, 'aria-label': S.search });
    let timer = null;
    search.oninput = () => {
      state.q = search.value;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await loadList(state.q.trim()); } catch (e) { say(S.failed + e.message); return; }
        paintList();
      }, 180);
    };
    search.onkeydown = (e) => {
      const grid = state.mode === 'gallery' && !state.q.trim(); // the card grid also moves with ← →
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || (grid && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) {
        e.preventDefault();
        const { rows, gallery } = visibleRows();
        const n = rows.length;
        if (!n) return;
        const cols = grid ? Math.max(1, getComputedStyle(state.listEl.querySelector('.asa-shelf-cards')).gridTemplateColumns.split(' ').length) : 1;
        const cards = grid ? gallery.cards.length : 0;
        const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        const step = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? dir : dir * cols;
        let next = state.cursor + step;
        if (grid && e.key === 'ArrowDown' && state.cursor < cards && next >= cards) next = cards < n ? cards : state.cursor; // last card row → the reports
        if (grid && e.key === 'ArrowUp' && state.cursor >= cards) next = cards - 1;
        state.cursor = next < 0 ? 0 : next >= n ? n - 1 : next;
        paintList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activate(visibleRows().rows[state.cursor]);
      }
    };
    const list = h('div', { class: 'asa-shelf-list' });
    state.listEl = list;
    state.msg = h('div', { class: 'asa-shelf-msg' });
    const bar = h('div', { class: 'asa-shelf-bar' }, h('span', { class: 'asa-shelf-hint grow' }, S.hint),
      h('button', { type: 'button', class: 'asa-btn', onclick: writeReport }, S.report));
    setTimeout(() => { search.focus(); search.setSelectionRange(search.value.length, search.value.length); paintList(); }, 0);
    const modes = h('div', { class: 'asa-shelf-modes', role: 'group' },
      ['gallery', 'list', 'folders'].map((m) => h('button', { type: 'button', class: `asa-btn${state.mode === m ? ' on' : ''}`, title: m === 'gallery' ? S.gallery : m === 'list' ? S.listMode : S.folders, 'aria-label': m === 'gallery' ? S.gallery : m === 'list' ? S.listMode : S.folders,
        onclick: () => { state.mode = m; ns.store.set('shelfMode', m); state.cursor = 0; state.tree = null; state.edit = null; rerender(); } }, m === 'gallery' ? '▦' : m === 'list' ? '☰' : '🗂')));
    return h('div', { class: 'asa-shelf' }, h('div', { class: 'asa-shelf-top' }, search, modes), list, bar, state.msg, footer());
  }

  function activate(row) {
    if (!row) return;
    if (row.kind === 'note') openNote(row.n.path);
    else if (row.kind === 'new') newNote('');
    else if (row.kind === 'create-note') newNote(row.text);
    else if (row.kind === 'create-idea') {
      addIdea(row.text).then(async () => { state.q = ''; await loadList(''); rerender(); say(S.ideaSaved); }).catch((e) => say(S.failed + e.message));
    }
  }

  function paintList() {
    const el = state?.listEl;
    if (!el) return;
    if (state.mode === 'folders' && !state.q.trim()) return paintFolders(el);
    const { rows, groups, gallery } = visibleRows();
    if (state.cursor >= rows.length) state.cursor = Math.max(0, rows.length - 1);
    if (gallery) return paintGallery(el, rows, gallery);
    const out = [];
    const index = new Map(rows.map((r, i) => [r, i]));
    const rowEl = (row) => {
      const i = index.get(row);
      const cur = i === state.cursor ? ' cur' : '';
      const click = () => { state.cursor = i; activate(row); };
      if (row.kind === 'create-note') return h('button', { type: 'button', class: `asa-shelf-row create${cur}`, onclick: click }, h('b', {}, S.createNote(row.text)));
      if (row.kind === 'create-idea') return h('button', { type: 'button', class: `asa-shelf-row create${cur}`, onclick: click }, h('b', {}, S.createIdea(row.text)));
      const n = row.n;
      const mins = Math.max(0, Math.round((Date.now() - n.mtime) / 60000));
      return h('button', { type: 'button', class: `asa-shelf-row${cur}`, onclick: click },
        h('b', {}, `${n.context ? '🔖 ' : ''}${n.title}`), h('small', {}, S.ago(mins)), h('span', {}, n.snippet || ''));
    };
    if (groups) {
      for (const { g, count } of groups) {
        out.push(h('button', { type: 'button', class: 'asa-shelf-group', onclick: () => { if (folded.has(g)) folded.delete(g); else folded.add(g); saveFolded(); paintList(); } },
          folded.has(g) ? '▸' : '▾', S[g], h('small', {}, String(count))));
        if (!folded.has(g)) for (const row of rows.filter((r) => r.g === g)) out.push(rowEl(row));
      }
    } else for (const row of rows) out.push(rowEl(row));
    if (!state.notes.length && !state.q.trim()) out.push(h('div', { class: 'asa-muted', style: { padding: '14px' } }, S.empty));
    else if (state.q.trim() && !state.notes.length) out.push(h('div', { class: 'asa-muted', style: { padding: '10px 14px' } }, S.noMatch));
    el.className = 'asa-shelf-list';
    el.replaceChildren(...out);
    el.querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
  }

  function paintGallery(el, rows, gallery) {
    const index = new Map(rows.map((r, i) => [r, i]));
    const cardEl = (row) => {
      const i = index.get(row);
      const cur = i === state.cursor ? ' cur' : '';
      const click = () => { state.cursor = i; activate(row); };
      if (row.kind === 'new') return h('button', { type: 'button', class: `asa-ncard new${cur}`, onclick: click, title: S.newCard }, h('b', {}, '＋'), h('span', {}, S.newCard));
      const n = row.n;
      const mins = Math.max(0, Math.round((Date.now() - n.mtime) / 60000));
      const title = `${n.context ? '🔖 ' : ''}${row.g === 'ideas' ? S.ideas : n.title}`;
      if (row.g === 'ideas') {
        return h('button', { type: 'button', class: `asa-ncard ideas${cur}`, onclick: click },
          h('b', {}, title), h('small', {}, S.openTodos(n.open ?? 0)),
          h('ul', {}, (n.todos ?? []).slice(0, 3).map((t) => h('li', {}, t))), h('small', {}, S.ago(mins)));
      }
      return h('button', { type: 'button', class: `asa-ncard${cur}`, onclick: click },
        h('b', {}, title), h('p', {}, n.preview || S.emptyCard), h('small', {}, S.ago(mins)));
    };
    const out = [h('div', { class: 'asa-shelf-cards' }, gallery.cards.map(cardEl))];
    if (gallery.reports) {
      out.push(h('button', { type: 'button', class: 'asa-shelf-group', style: { marginTop: '10px' }, onclick: () => { if (folded.has('reports')) folded.delete('reports'); else folded.add('reports'); saveFolded(); paintList(); } },
        folded.has('reports') ? '▸' : '▾', S.reports, h('small', {}, String(gallery.reports))));
      for (const row of rows) {
        if (row.g !== 'reports') continue;
        const n = row.n;
        const i = index.get(row);
        const mins = Math.max(0, Math.round((Date.now() - n.mtime) / 60000));
        out.push(h('button', { type: 'button', class: `asa-shelf-row${i === state.cursor ? ' cur' : ''}`, onclick: () => { state.cursor = i; activate(row); } },
          h('b', {}, n.title), h('small', {}, S.ago(mins)), h('span', {}, n.snippet || '')));
      }
    }
    el.className = 'asa-shelf-gal';
    el.replaceChildren(...out);
    el.querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
  }


  // ── Folder view: browse and organise the vault ──
  const PROTECTED = new Set(['Ide-TODO.md', 'Catatan', 'Laporan']);
  const join = (dir, name) => (dir ? `${dir}/${name}` : name);
  const crumbsOf = (dir) => (dir ? dir.split('/') : []);

  async function loadTree(dir = state.dir) {
    const t = await api('GET', `/api/vault/tree?dir=${encodeURIComponent(dir)}`);
    state.tree = t;
    state.dir = t.dir;
  }
  async function refreshTree() {
    state.tree = null;
    paintList();
    await loadList('').catch(() => {});
  }
  async function goDir(dir) {
    state.dir = dir;
    state.tree = null;
    state.edit = null;
    paintList();
  }
  async function fileOp(route, body, okText) {
    try {
      const res = await api('POST', route, body);
      state.edit = null;
      await refreshTree();
      say(okText?.(res) ?? '');
      return true;
    } catch (err) {
      say(S.fileErr[err.message] ?? S.failed + err.message);
      state.edit = null;
      paintList();
      return false;
    }
  }
  const moveTo = (from, destDir, name) => fileOp('/api/vault/move', { from, to: join(destDir, name) }, () => S.moved(join(destDir, name)));

  function dropTarget(el, destDir) {
    el.addEventListener('dragover', (e) => { if (state.drag) { e.preventDefault(); el.classList.add('drop'); } });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drop');
      const src = state.drag;
      state.drag = null;
      if (!src || dirOf(src) === destDir) return;
      moveTo(src, destDir, baseOf(src));
    });
  }

  function paintFolders(el) {
    el.className = 'asa-shelf-list';
    if (!state.tree) {
      el.replaceChildren(h('div', { class: 'asa-fold-empty' }, '…'));
      loadTree().then(() => { if (state?.mode === 'folders' && state.view === 'list' && !state.q.trim()) paintFolders(el); }).catch(async () => {
        if (!state) return;
        if (state.dir) { state.dir = ''; paintList(); } else el.replaceChildren(h('div', { class: 'asa-fold-empty' }, S.offline));
      });
      return;
    }
    const t = state.tree;
    const out = [];
    // Breadcrumbs (each one also takes dropped notes)
    const crumbs = h('div', { class: 'asa-fold-crumbs' });
    const crumb = (label, dir) => {
      const b = h('button', { type: 'button', onclick: () => goDir(dir) }, label);
      dropTarget(b, dir);
      return b;
    };
    crumbs.append(crumb(`🏠 ${S.foldHome}`, ''));
    crumbsOf(t.dir).forEach((seg, k, arr) => crumbs.append(h('span', { class: 'sep' }, '/'), crumb(seg, arr.slice(0, k + 1).join('/'))));
    crumbs.append(h('span', { class: 'grow' }),
      h('button', { type: 'button', onclick: () => newNote('', t.dir) }, S.newNoteHere),
      h('button', { type: 'button', onclick: () => { state.edit = { kind: 'newfolder' }; paintList(); } }, S.newFolder));
    out.push(crumbs);

    if (state.edit?.kind === 'newfolder') {
      const input = h('input', { type: 'text', placeholder: S.folderName, 'aria-label': S.folderName });
      input.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); const name = input.value.trim(); if (name) fileOp('/api/vault/folder', { path: join(t.dir, name) }, () => S.madeFolder(join(t.dir, name))); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); state.edit = null; paintList(); }
      };
      out.push(h('div', { class: 'asa-fold-row editing' }, h('span', {}, '📁'), input, h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.edit = null; paintList(); } }, S.cancelShort)));
      setTimeout(() => input.focus(), 0);
    }

    const item = (kind, name, sub, onOpen) => {
      const rel = join(t.dir, name);
      const locked = !t.dir && PROTECTED.has(name);
      const editing = state.edit?.rel === rel ? state.edit : null;
      const row = h('div', { class: `asa-fold-row${editing ? ' editing' : ''}` });
      if (editing?.kind === 'rename') {
        const shown = kind === 'file' ? name.replace(/\.md$/i, '') : name;
        const input = h('input', { type: 'text', value: shown, 'aria-label': S.renameTip });
        const go = () => {
          const v = input.value.trim().replace(/\.md$/i, '');
          if (!v || v === shown) { state.edit = null; paintList(); return; }
          fileOp('/api/vault/move', { from: rel, to: join(t.dir, kind === 'file' ? `${v}.md` : v) }, () => S.renamed(v));
        };
        input.onkeydown = (e) => {
          if (e.key === 'Enter') { e.preventDefault(); go(); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); state.edit = null; paintList(); }
        };
        row.append(h('span', {}, kind === 'dir' ? '📁' : '📝'), input, h('button', { type: 'button', class: 'asa-btn primary', onclick: go }, S.save), h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.edit = null; paintList(); } }, S.cancelShort));
        setTimeout(() => { input.focus(); input.select(); }, 0);
        return row;
      }
      if (editing?.kind === 'move') {
        const dirs = (t.folders ?? []).filter((f) => f !== rel && !f.startsWith(`${rel}/`));
        const pick = h('select', { 'aria-label': S.moveHere }, h('option', { value: '__' }, S.moveHere), h('option', { value: '' }, S.moveRoot), dirs.map((f) => h('option', { value: f }, `📁 ${f}`)));
        pick.onchange = () => { if (pick.value !== '__') moveTo(rel, pick.value, name); };
        row.append(h('span', {}, kind === 'dir' ? '📁' : '📝'), h('b', { style: { fontWeight: 600 } }, name), pick, h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.edit = null; paintList(); } }, S.cancelShort));
        return row;
      }
      const mins = kind === 'file' ? Math.max(0, Math.round((Date.now() - sub.mtime) / 60000)) : 0;
      const main = h('button', { type: 'button', class: 'main', onclick: onOpen },
        h('span', {}, kind === 'dir' ? '📁' : '📝'), h('b', {}, kind === 'file' ? name.replace(/\.md$/i, '') : name), h('small', {}, kind === 'dir' ? S.items(sub.count) : S.ago(mins)));
      row.append(main);
      if (locked) row.append(h('div', { class: 'acts' }, h('span', { class: 'lock', title: S.protectedTip }, '🔒')));
      else {
        const trash = h('button', { type: 'button', title: S.trashTip, 'aria-label': S.trashTip }, '🗑');
        trash.onclick = () => {
          if (trash.dataset.sure) return fileOp('/api/vault/trash', { path: rel }, () => S.trashed(name));
          trash.dataset.sure = '1';
          trash.textContent = S.sure;
          setTimeout(() => { if (trash.isConnected) { delete trash.dataset.sure; trash.textContent = '🗑'; } }, 3500);
        };
        row.append(h('div', { class: 'acts' },
          h('button', { type: 'button', title: S.renameTip, 'aria-label': S.renameTip, onclick: () => { state.edit = { kind: 'rename', rel }; paintList(); } }, '✏️'),
          h('button', { type: 'button', title: S.moveTip, 'aria-label': S.moveTip, onclick: () => { state.edit = { kind: 'move', rel }; paintList(); } }, '📂'),
          trash));
        row.draggable = true;
        row.addEventListener('dragstart', (e) => { state.drag = rel; e.dataTransfer?.setData('text/plain', rel); });
        row.addEventListener('dragend', () => { state.drag = null; });
      }
      if (kind === 'dir') dropTarget(row, rel);
      return row;
    };
    for (const d of t.dirs) out.push(item('dir', d.name, d, () => goDir(join(t.dir, d.name))));
    for (const f of t.files) out.push(item('file', f.name, f, () => openNote(join(t.dir, f.name))));
    if (!t.dirs.length && !t.files.length) out.push(h('div', { class: 'asa-fold-empty' }, S.emptyFolder));
    else out.push(h('div', { class: 'asa-fold-empty', style: { fontSize: '12px', padding: '8px 12px' } }, S.dropHint));
    el.replaceChildren(...out);
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
      h('b', { class: 'grow', title: state.sel }, sel?.title ?? state.sel));
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
    state = { view: 'list', mode: modeStore(), notes: [], sel: null, text: '', q: '', cursor: 0, vault: null, obsidian: null, dir: '', tree: null, newDir: null, edit: null, fromEnv: false, draft: null, panel: null, msg: null, listEl: null, pathEdit: false, warned: false };
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
        if (state.view === 'list' && state.mode === 'folders' && !state.q && state.edit) { state.edit = null; paintList(); return true; }
        if (state.view === 'list' && state.mode === 'folders' && !state.q && state.dir) { goDir(dirOf(state.dir)); return true; }
        if (state.view === 'list' && state.q) { state.q = ''; loadList('').then(rerender); return true; }
        return false;
      },
      render(body) {
        if (state.offline) { body.append(h('p', {}, S.offline)); return; }
        body.append(state.view === 'list' ? listView() : state.view === 'note' ? noteView() : editView());
      },
    });
    state.panel.el.classList.add('asa-plain');
    ns.refreshData().then(() => loadList('')).then(async () => {
      if (typeof startText === 'string' && startText.trim()) { state.q = startText.trim(); await loadList(state.q); }
      rerender();
    }).catch(() => { if (state) { state.offline = true; rerender(); } });
  }

  ns.onFurnitureClick('COZY_BOOKSHELF', () => open());
  ns.shelf = { open, addIdea };
})();
