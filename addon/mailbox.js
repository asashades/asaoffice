// asaoffice mailbox: click the mailbox on the wall to send work to Claude Code and read the results as letters.
//   - "Tugas baru": pick who (plain Claude or an installed staff member), which project, and what to do. The office
//     runs it headless on this Mac (tools/lib/task-server.mjs); the villager shows up and works like any session.
//   - Every task becomes a letter: your request, the answer, and a Reply box to keep the conversation going.
//   - A daily report letter sums up yesterday (sessions, tool calls, files, tokens, streak).
//   - A red badge on the mailbox counts unread letters; a chime + toast when a task finishes.
// Sending needs the office's local task API, so it works from the Mac only; on the phone the letters are read-only.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Kotak Surat', compose: '✉️ Tugas baru', back: '← Kembali', empty: 'Belum ada surat. Kirim tugas pertama lewat tombol di atas!',
      who: 'Siapa yang ngerjain?', general: 'Claude (umum)', project: 'Proyek', task: 'Tugasnya apa?',
      placeholder: 'Tulis tugasnya… (@nama pilih orang · Enter kirim · Shift+Enter baris baru)', send: 'Kirim', sending: 'Ngirim…',
      access: { read: 'baca file', web: 'cari di web', edit: 'ngedit file', git: 'lihat git', test: 'jalanin test' },
      canDo: (list) => `Boleh: ${list}. Selain itu ditolak otomatis.`,
      running: '⏳ Lagi dikerjain', done: '✅ Selesai', error: '⚠️ Gagal', stopped: '⏹ Dihentikan',
      reply: 'Balas', replyPh: 'Tulis balasan atau tugas lanjutan…', stop: 'Hentikan', archive: 'Arsipkan', you: 'Kamu',
      noApi: 'Kirim tugas cuma bisa dari Mac yang lagi nyalain kantor (bukan dari HP / tunnel), dan kantornya harus dinyalain lewat app Asa Office atau `npm run office`.',
      noClaude: 'Perintah `claude` gak ketemu di Mac ini, jadi tugas belum bisa dikirim.',
      noProject: 'Belum ada proyek. Pakai Claude Code sekali di folder proyekmu, terus coba lagi.',
      busy: 'Lagi ada 3 tugas jalan. Tunggu salah satunya selesai dulu ya.',
      failed: 'Gagal ngirim', finished: (n, p) => `${n} selesai: ${p}`, failedTask: (n) => `Tugas ${n} gagal`,
      openBox: 'Buka kotak surat buat baca hasilnya.', report: 'Laporan harian', reportFrom: 'Kantor',
      reportBody: (d) => `Kemarin (${d.day}) ada ${d.sessions} sesi Claude, ${d.tools} tool call, dan ${d.files} file diedit.`,
      reportMix: (d) => `Rinciannya: ${d.edit} edit, ${d.search} baca/cari, ${d.command} command, ${d.web} web, ${d.agent} sub-agent.`,
      reportTokens: (i, o) => `Token: ${i} masuk, ${o} keluar.`, reportModel: (m) => `Model paling sering: ${m}.`,
      reportTasks: (n) => `Tugas dari kotak surat: ${n} selesai.`, reportStreak: (n) => `Streak kerja: ${n} hari 🔥`,
      reportNone: 'Kemarin kantor sepi, gak ada sesi Claude. Selamat istirahat! 🌻', cost: (c) => `biaya ±$${c.toFixed(2)}`,
      awaiting: '📝 Nunggu persetujuan', rejected: '❌ Ditolak', mode: 'Cara kerja',
      modes: { plan: '📝 Rencana dulu — kamu setujui dulu', auto: '⚡ Langsung jalan', report: '👀 Cuma laporan — gak ngubah apa-apa' },
      modeShort: { plan: 'rencana dulu', meeting: 'rapat dulu', auto: 'langsung jalan', report: 'cuma laporan' },
      style: 'Gaya kerja Shades',
      styles: { solo: '💰 Hemat — Shades kerja sendiri, timnya akting', delegate: '👥 Delegasi beneran — manggil staf satu-satu (lebih boros kuota)' },
      approve: '✅ Setujui', revise: '✏️ Revisi', reject: '❌ Tolak', revisePh: 'Apa yang perlu diubah dari rencananya?',
      planReady: (n) => `${n}: rencananya siap, nunggu persetujuanmu`, planLabel: '📝 Rencana', reportLabel: '📜 Laporan untuk Komisaris',
      directorBusy: 'Shades lagi ngerjain tugas lain. Tunggu selesai dulu ya.',
      progress: (t) => `⏳ ${t}`, starting: '⏳ Lagi mulai…', writing: 'Nulis jawaban',
      copyCmd: '📋 Salin perintah Terminal', copied: '✅ Tersalin! Tempel di Terminal',
      copyNote: 'Buat lanjut ngobrol di sesi yang sama dari Terminal.',
      tabLetters: '📮 Surat', tabSessions: '🗂 Semua sesi', search: 'Cari judul, proyek, atau isi…',
      fAll: 'Semua', fRunning: '⏳ Jalan', fAwaiting: '📝 Nunggu', fDone: '✅ Selesai', allProjects: 'Semua proyek', allWho: 'Semua orang',
      noMatch: 'Gak ada yang cocok.', noSessions: 'Belum ada sesi Claude Code di Mac ini.', live: '● lagi jalan', ago: (m) => (m < 1 ? 'barusan' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`),
      fromMailbox: '📮 dari kotak surat', sessionsNote: 'Semua sesi Claude Code di Mac ini (Terminal, Desktop, dan kotak surat), 30 hari terakhir.',
      rename: 'Judul surat', copySmall: '📋 Salin', copiedSmall: '✅',
      queued: '📮 Diantar', queuedShort: '📮 Nunggu diambil Shades…', queuedNote: (n) => (n ? `📮 Suratmu lagi diantar Shades ke ${n}…` : '📮 Suratmu lagi diambil Shades…'),
      newChat: '＋ Chat baru', newChatSub: 'Tulis tugasnya, pilih cara kerjanya di bawah', tabChats: '💬 Chat', tabSessions: '🗂 Sesi',
      commitChip: '🔀 Boleh commit', commitTip: 'Boleh git add dan git commit (tanpa push) selama tugas ini', commitShort: 'boleh commit',
      attach: 'Lampirkan gambar', attachTip: 'Lampirkan gambar (atau tempel / seret ke sini)', attachFail: 'Gambar gak bisa dilampirkan (png, jpg, gif, webp; maks 8 MB, 4 gambar).', lookAtImages: 'Tolong lihat gambar terlampir.', remove: 'Hapus',
      denied: (n) => `⛔ ${n} langkah ditolak otomatis (di luar izin tugas ini)`, allowOnce: 'Izinkan sekali', cantAllow: 'terlalu berisiko dari sini, jalankan sendiri di Terminal', copyCmd: 'Salin', copied: 'Tersalin ✓', allowExact: 'Izinkan persis…', exactTitle: 'Perintah lengkap yang dibuka, sekali, persis seperti ini:', exactRun: 'Yang dijalankan (tanpa cd):', exactYes: 'Ya, izinkan sekali', exactNo: 'Batal', cantAllowRo: 'Downloads baca-saja, jalankan sendiri di Terminal', dismiss: 'Abaikan', dismissAll: 'Abaikan semua',
      schedBtn: '⏰ Jadwal', schedTip: 'Tugas yang jalan sendiri pada jam tertentu',
      folderLocked: 'Foldernya tetap: satu sesi tinggal di satu folder. Buat chat baru kalau mau folder lain.', sideHide: 'Ciutkan daftar chat', sideShow: 'Tampilkan daftar chat', filterTip: 'Tampilkan: semua, berjalan, menunggu, selesai, atau arsip', menuBtn: 'Alat', menuTip: 'Jadwal, batas biaya, dan merapikan Downloads', menuSched: 'Jadwal tugas', menuBudget: 'Batas biaya', menuTidy: 'Rapikan Downloads',
      soulTip: 'Jiwa (kepribadian) dan ingatan staf', budgetTip: 'Batas biaya per tugas dan per hari', budgetFull: 'Batas biaya hari ini sudah tercapai, jadi tugas baru belum bisa dimulai. Naikkan batasnya di 💰 atau coba lagi besok.',
      tidyBtn: '🧹', tidyTip: 'Tanya atau rapikan folder Downloads (file baru dipindah setelah kamu setujui)', dlName: 'Downloads', tidyDraft: 'Rapikan file lepas di Downloads', dlPh: 'Tanya soal Downloads atau minta dirapikan, mis. "cari invoice bulan lalu" atau "rapikan file PDF"', tidyNoFolder: 'Folder Downloads tidak ditemukan di Mac ini.',
      tidyMoves: (n) => `📦 ${n} file akan dipindah (hilangkan centang yang tidak mau dipindah)`, tidyTo: 'ke', tidyUndo: '↩️ Kembalikan semua', tidyUndone: 'Sudah dikembalikan.',
      meetRound: (n) => `putaran ${n}`, meetTip: 'Shades memimpin rapat: dia memilih 2-3 staf, masing-masing menjawab sebagai dirinya sendiri (dua putaran), lalu Shades menulis rencananya dari isi rapat. Butuh beberapa menit dan beberapa panggilan Claude.',
      permChips: { manual: '🔐 Tanya dulu', acceptEdits: '✏️ Terima edit', auto: '🤖 Auto', bypass: '⚡ Bypass izin', strict: '🔒 Ketat' },
      permTip: 'Cara izin ditangani saat tugas jalan. Tanya dulu: kamu jawab tiap langkah di luar daftar. Terima edit: ubah file langsung jalan, sisanya tanya. Auto: Claude menilai sendiri, tanya kalau ragu. Bypass: tanpa tanya sama sekali. Ketat: langkah di luar daftar ditolak otomatis (cara lama).',
      permShort: { manual: 'tanya dulu', acceptEdits: 'terima edit', auto: 'auto', bypass: 'bypass izin', strict: 'ketat' },
      permBypassAsk: 'Aktifkan mode Bypass izin? Claude akan menjalankan apa saja tanpa bertanya (hapus file, git, perintah apa pun) selama tugas itu jalan. Pakai hanya di folder yang aman.', permBypassYes: 'Aktifkan', permBypassNo: 'Batal',
      askTitle: 'Claude minta izin', askAllow: 'Izinkan', askAlways: 'Izinkan terus di obrolan ini', askDeny: 'Tolak', askGone: 'Pertanyaan ini sudah tidak aktif (tugasnya selesai atau dihentikan).', askWaitShort: '🔐 menunggu izinmu',
      isoChips: { off: '📂 Langsung di folder', on: '🌿 Cabang terpisah' },
      isoTip: 'Langsung di folder: Claude bekerja di folder proyekmu. Cabang terpisah: Claude bekerja di cabang git sendiri (folder salinan dari commit terakhir), jadi nggak bentrok dengan yang lagi kamu kerjakan; hasilnya kamu gabung, jadikan PR, atau buang. Perubahan yang belum di-commit tidak ikut.',
      wtTitle: (b) => `🌿 Hasil di cabang ${b}`, wtNone: 'Belum ada perubahan.', wtFiles: (n, a, d, c) => `${n} file · +${a} −${d}${c ? ` · ${c} commit` : ''}`,
      wtView: 'Lihat perubahan', wtHide: 'Tutup perubahan', wtMerge: (into) => `Gabung${into ? ` ke ${into}` : ''}`, wtPr: 'Buka PR', wtPrSure: 'Yakin? Ini mendorong cabang ke GitHub. Klik lagi', wtDiscard: 'Buang', wtDiscardSure: 'Yakin? Hasilnya hilang. Klik lagi',
      wtErr: { git: 'Folder ini bukan repo git, jadi tidak bisa memakai cabang terpisah.', worktree: 'Gagal membuat cabang terpisah.', conflict: 'Ada konflik saat menggabung. Tidak ada yang berubah: balas surat ini supaya Claude menyelesaikannya, atau gabungkan sendiri di Terminal.', merge: 'Git menolak menggabung (mungkin ada perubahan yang belum di-commit di folder aslinya). Tidak ada yang berubah.', detached: 'Folder aslinya tidak sedang di sebuah branch, jadi tidak bisa digabung.', gone: 'Folder cabang itu sudah tidak ada.' },
      modelDefault: '🧠 Model default', modelTip: 'Model Claude yang dipakai (default = pengaturan Claude Code di Mac)', sesModelOrig: (n) => `🧠 Sesi asli (${n})`, sesModelDefault: '🧠 Default',
      archiveAllSessions: (n) => `🗄 Arsipkan ${n} sesi dari luar kantor`, archiveSure: 'Yakin? Klik lagi', archiveRow: 'Arsipkan', unarchiveRow: 'Keluarkan dari arsip', archiveFailed: 'Gagal mengarsipkan.',
      fArchived: '🗄 Arsip', unarchive: 'Keluarkan dari arsip', deletePerm: '🗑 Hapus permanen', deleteSure: 'Yakin? Klik lagi', emptyArchive: 'Belum ada chat yang diarsipkan. Pakai tombol 🗄 di chat buat menyimpannya di sini.',
      sesFirst: 'Pesan pertama', sesContinue: 'Lanjutkan sesi ini dari kantor', sesNote: 'Sesi ini dimulai di luar kantor (Terminal atau Desktop). Tulis di bawah buat lanjutin dari sini.',
      sesContinueHint: 'Tulis lanjutannya…', sesSend: 'Kirim', sesLive: 'Sesi ini lagi dipakai di tempat lain. Tunggu sebentar biar nggak tabrakan.', sesCopy: '📋 Salin perintah Terminal',
      gToday: 'Hari ini', gYesterday: 'Kemarin', gWeek: '7 hari terakhir', gOlder: 'Lebih lama',
      pickChat: 'Pilih chat di kiri, atau mulai yang baru.',
      greeting: (n) => `Halo Komisaris! Mau dikerjain apa hari ini${n ? `, biar ${n} yang pegang` : ''}?`,
      suggestions: ['Cek status proyek ini', 'Jalanin semua test terus laporin yang gagal', 'Review perubahan terakhir'],
      chipModes: { plan: '📝 Rencana dulu', meeting: '🗣 Rapat dulu', auto: '⚡ Langsung jalan', report: '👀 Cuma laporan' },
      chipStyles: { solo: '💰 Hemat', delegate: '👥 Delegasi' },
      approvedNote: '✅ Rencana disetujui', rejectedNote: '❌ Rencana ditolak', revisedNote: '✏️ Minta revisi', reviseHint: 'atau tulis revisinya di bawah',
      busyPh: (n) => `${n} lagi kerja… tunggu jawabannya ya`,
      sentUndo: '📮 Terkirim! Salah kirim?', undo: '↩ Batalkan',
    },
    en: {
      title: 'Mailbox', compose: '✉️ New task', back: '← Back', empty: 'No letters yet. Send your first task with the button above!',
      who: 'Who should do it?', general: 'Claude (general)', project: 'Project', task: 'What should they do?',
      placeholder: 'Write the task… (@name picks who · Enter sends · Shift+Enter new line)', send: 'Send', sending: 'Sending…',
      access: { read: 'read files', web: 'search the web', edit: 'edit files', git: 'look at git', test: 'run tests' },
      canDo: (list) => `Allowed: ${list}. Anything else is refused automatically.`,
      running: '⏳ In progress', done: '✅ Done', error: '⚠️ Failed', stopped: '⏹ Stopped',
      reply: 'Reply', replyPh: 'Write a reply or a follow-up task…', stop: 'Stop', archive: 'Archive', you: 'You',
      noApi: 'Tasks can only be sent from the Mac running the office (not from the phone / tunnel), with the office started by the Asa Office app or `npm run office`.',
      noClaude: 'The `claude` command wasn’t found on this Mac, so tasks can’t be sent yet.',
      noProject: 'No projects yet. Use Claude Code once in your project folder, then try again.',
      busy: '3 tasks are already running. Wait for one to finish.',
      failed: 'Couldn’t send', finished: (n, p) => `${n} finished: ${p}`, failedTask: (n) => `${n}'s task failed`,
      openBox: 'Open the mailbox to read the result.', report: 'Daily report', reportFrom: 'The office',
      reportBody: (d) => `Yesterday (${d.day}) there were ${d.sessions} Claude sessions, ${d.tools} tool calls and ${d.files} files edited.`,
      reportMix: (d) => `Breakdown: ${d.edit} edits, ${d.search} reads/searches, ${d.command} commands, ${d.web} web, ${d.agent} sub-agents.`,
      reportTokens: (i, o) => `Tokens: ${i} in, ${o} out.`, reportModel: (m) => `Most used model: ${m}.`,
      reportTasks: (n) => `Tasks from the mailbox: ${n} done.`, reportStreak: (n) => `Work streak: ${n} days 🔥`,
      reportNone: 'The office was quiet yesterday, no Claude sessions. Enjoy the rest! 🌻', cost: (c) => `cost ≈ $${c.toFixed(2)}`,
      awaiting: '📝 Waiting for approval', rejected: '❌ Rejected', mode: 'How to work',
      modes: { plan: '📝 Plan first — you approve it', auto: '⚡ Just do it', report: "👀 Report only — doesn't change anything" },
      modeShort: { plan: 'plan first', meeting: 'meeting first', auto: 'just do it', report: 'report only' },
      style: "Shades' way of working",
      styles: { solo: '💰 Thrifty — Shades works alone, the team acts it out', delegate: '👥 Real delegation — calls staff one at a time (uses more quota)' },
      approve: '✅ Approve', revise: '✏️ Revise', reject: '❌ Reject', revisePh: 'What should change in the plan?',
      planReady: (n) => `${n}: the plan is ready for your approval`, planLabel: '📝 Plan', reportLabel: '📜 Report for the Commissioner',
      directorBusy: 'Shades is on another task. Wait for it to finish.',
      progress: (t) => `⏳ ${t}`, starting: '⏳ Starting…', writing: 'Writing the answer',
      copyCmd: '📋 Copy Terminal command', copied: '✅ Copied! Paste it in Terminal',
      copyNote: 'To keep talking in the same session from Terminal.',
      tabLetters: '📮 Letters', tabSessions: '🗂 All sessions', search: 'Search title, project or text…',
      fAll: 'All', fRunning: '⏳ Running', fAwaiting: '📝 Waiting', fDone: '✅ Finished', allProjects: 'All projects', allWho: 'Everyone',
      noMatch: 'Nothing matches.', noSessions: 'No Claude Code sessions on this Mac yet.', live: '● running now', ago: (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`),
      fromMailbox: '📮 from the mailbox', sessionsNote: 'Every Claude Code session on this Mac (Terminal, Desktop and the mailbox), last 30 days.',
      rename: 'Letter title', copySmall: '📋 Copy', copiedSmall: '✅',
      queued: '📮 Delivering', queuedShort: '📮 Waiting for Shades…', queuedNote: (n) => (n ? `📮 Shades is delivering your letter to ${n}…` : '📮 Shades is picking up your letter…'),
      newChat: '＋ New chat', newChatSub: 'Write the task, pick how to work below', tabChats: '💬 Chats', tabSessions: '🗂 Sessions',
      commitChip: '🔀 May commit', commitTip: 'Allow git add and git commit (never push) for this task', commitShort: 'may commit',
      attach: 'Attach an image', attachTip: 'Attach an image (or paste / drag it here)', attachFail: 'Could not attach the image (png, jpg, gif, webp; max 8 MB, 4 images).', lookAtImages: 'Please look at the attached images.', remove: 'Remove',
      denied: (n) => `⛔ ${n} step(s) refused automatically (outside this task's permissions)`, allowOnce: 'Allow once', cantAllow: 'too risky from here, run it yourself in Terminal', copyCmd: 'Copy', copied: 'Copied ✓', allowExact: 'Allow exactly…', exactTitle: 'The full command being opened, once, exactly as written:', exactRun: 'What will run (without the cd):', exactYes: 'Yes, allow once', exactNo: 'Cancel', cantAllowRo: 'Downloads is read-only, run it yourself in Terminal', dismiss: 'Dismiss', dismissAll: 'Dismiss all',
      schedBtn: '⏰ Schedules', schedTip: 'Tasks that run by themselves at a set time',
      folderLocked: 'The folder stays: a session lives in its folder. Start a new chat for another one.', sideHide: 'Collapse the chat list', sideShow: 'Show the chat list', filterTip: 'Show: all, running, waiting, done, or archived', menuBtn: 'Tools', menuTip: 'Schedules, cost limits and tidying Downloads', menuSched: 'Schedules', menuBudget: 'Cost limits', menuTidy: 'Tidy Downloads',
      soulTip: 'Staff souls (personality) and memories', budgetTip: 'Cost limits per task and per day', budgetFull: 'Today\'s cost limit is reached, so no new task can start. Raise it in 💰 or try again tomorrow.',
      tidyBtn: '🧹', tidyTip: 'Ask about or tidy the Downloads folder (files only move after you approve)', dlName: 'Downloads', tidyDraft: 'Tidy the loose files in Downloads', dlPh: 'Ask about Downloads or ask for a tidy-up, e.g. "find last month\'s invoice" or "tidy the PDFs"', tidyNoFolder: 'The Downloads folder was not found on this Mac.',
      tidyMoves: (n) => `📦 ${n} file(s) will be moved (untick the ones to leave)`, tidyTo: 'to', tidyUndo: '↩️ Put everything back', tidyUndone: 'Put back.',
      meetRound: (n) => `round ${n}`, meetTip: 'Shades leads the meeting: he picks 2-3 staff, each answers as themselves (two rounds), then Shades writes the plan from what was said. It takes a few minutes and several Claude calls.',
      permChips: { manual: '🔐 Ask first', acceptEdits: '✏️ Accept edits', auto: '🤖 Auto', bypass: '⚡ Bypass permissions', strict: '🔒 Strict' },
      permTip: 'How permissions are handled while the task runs. Ask first: you answer each step outside the list. Accept edits: file edits go through, the rest asks. Auto: Claude judges, asks when unsure. Bypass: nothing asks. Strict: steps outside the list are refused automatically (the old way).',
      permShort: { manual: 'ask first', acceptEdits: 'accept edits', auto: 'auto', bypass: 'bypass', strict: 'strict' },
      permBypassAsk: 'Turn on Bypass permissions? Claude will run anything without asking (delete files, git, any command) while that task runs. Only use it in a safe folder.', permBypassYes: 'Turn on', permBypassNo: 'Cancel',
      askTitle: 'Claude asks permission', askAllow: 'Allow', askAlways: 'Always allow in this chat', askDeny: 'Deny', askGone: 'This question is no longer active (the task finished or was stopped).', askWaitShort: '🔐 waiting for you',
      isoChips: { off: '📂 Directly in the folder', on: '🌿 Separate branch' },
      isoTip: 'Directly in the folder: Claude works in your project folder. Separate branch: Claude works on its own git branch in a copy of the folder (made from the last commit), so it never collides with what you are doing; you then merge it, open a PR, or throw it away. Uncommitted changes are not included.',
      wtTitle: (b) => `🌿 Result on branch ${b}`, wtNone: 'No changes yet.', wtFiles: (n, a, d, c) => `${n} files · +${a} −${d}${c ? ` · ${c} commits` : ''}`,
      wtView: 'View changes', wtHide: 'Hide changes', wtMerge: (into) => `Merge${into ? ` into ${into}` : ''}`, wtPr: 'Open PR', wtPrSure: 'Sure? This pushes the branch to GitHub. Click again', wtDiscard: 'Discard', wtDiscardSure: 'Sure? The result is lost. Click again',
      wtErr: { git: 'This folder is not a git repo, so a separate branch is not possible.', worktree: 'Could not create the separate branch.', conflict: 'There was a conflict while merging. Nothing changed: reply to this letter so Claude resolves it, or merge it yourself in Terminal.', merge: 'Git refused to merge (maybe uncommitted changes in the original folder). Nothing changed.', detached: 'The original folder is not on a branch, so it cannot be merged.', gone: 'That branch folder no longer exists.' },
      modelDefault: '🧠 Default model', modelTip: 'The Claude model to use (default = your Claude Code setting on this Mac)', sesModelOrig: (n) => `🧠 Original (${n})`, sesModelDefault: '🧠 Default',
      archiveAllSessions: (n) => `🗄 Archive ${n} sessions from outside the office`, archiveSure: 'Sure? Click again', archiveRow: 'Archive', unarchiveRow: 'Take out of the archive', archiveFailed: 'Could not archive.',
      fArchived: '🗄 Archive', unarchive: 'Take out of the archive', deletePerm: '🗑 Delete for good', deleteSure: 'Sure? Click again', emptyArchive: 'No archived chats yet. Use the 🗄 button in a chat to keep it here.',
      sesFirst: 'First message', sesContinue: 'Continue this session from the office', sesNote: 'This session was started outside the office (Terminal or Desktop). Write below to continue it from here.',
      sesContinueHint: 'Write the follow-up…', sesSend: 'Send', sesLive: 'This session is in use elsewhere. Wait a moment to avoid clashing.', sesCopy: '📋 Copy Terminal command',
      gToday: 'Today', gYesterday: 'Yesterday', gWeek: 'Last 7 days', gOlder: 'Older',
      pickChat: 'Pick a chat on the left, or start a new one.',
      greeting: (n) => `Hello Commissioner! What should we get done today${n ? `, with ${n} on it` : ''}?`,
      suggestions: ['Check this project’s status', 'Run all the tests and report what fails', 'Review the latest changes'],
      chipModes: { plan: '📝 Plan first', meeting: '🗣 Meeting first', auto: '⚡ Just do it', report: '👀 Report only' },
      chipStyles: { solo: '💰 Thrifty', delegate: '👥 Delegate' },
      approvedNote: '✅ Plan approved', rejectedNote: '❌ Plan rejected', revisedNote: '✏️ Asked for a revision', reviseHint: 'or write the revision below',
      busyPh: (n) => `${n} is working… wait for the answer`,
      sentUndo: '📮 Sent! Sent by mistake?', undo: '↩ Undo',
    },
  });

  const css = `
  .asa-mail-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; }
  .asa-letters { display: flex; flex-direction: column; gap: 8px; }
  .asa-letter { display: flex; gap: 10px; align-items: center; background: #fffbe9; border: 1px solid #d9c49a; padding: 8px 10px;
    cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; box-shadow: 0 2px 0 rgba(116,65,34,0.2); }
  .asa-letter.unread { border-color: #c8503c; box-shadow: inset 3px 0 0 #c8503c, 0 2px 0 rgba(116,65,34,0.2); }
  .asa-letter-body { flex: 1; min-width: 0; }
  .asa-letter-body b { font-weight: normal; font-size: 15px; }
  .asa-letter-body div { font-size: 12px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .asa-letter-status { font-size: 12px; white-space: nowrap; }
  .asa-face { width: 32px; height: 52px; flex: none; image-rendering: pixelated; background-repeat: no-repeat;
    background-size: 224px 192px; background-position: -32px -4px; background-color: #dca05f; border: 2px solid #744122; }
  .asa-face.envelope { background: #f4e6c4; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .asa-form label { display: block; font-size: 13px; margin: 10px 0 4px; }
  .asa-form select, .asa-form textarea { width: 100%; font: inherit; font-size: 14px; padding: 6px; background: #fffbe9;
    color: #3a2117; border: 2px solid #744122; box-sizing: border-box; }
  .asa-form textarea { min-height: 90px; resize: vertical; }
  .asa-note { font-size: 12px; opacity: 0.75; margin-top: 6px; }
  .asa-warn { font-size: 13px; background: #ffe0d0; border: 1px solid #c8503c; padding: 8px; margin: 8px 0; }
  .asa-thread { display: flex; flex-direction: column; gap: 8px; margin: 10px 0; }
  .asa-msg { padding: 8px 10px; border: 1px solid #d9c49a; background: #fffbe9; white-space: pre-wrap; overflow-wrap: anywhere;
    font-size: 13px; line-height: 1.4; max-height: 50vh; overflow: auto; }
  .asa-msg.you { background: #e6f0d8; border-color: #9ab87a; align-self: flex-end; max-width: 85%; }
  .asa-msg small { display: block; opacity: 0.6; font-size: 11px; margin-bottom: 3px; }
  .asa-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .asa-panel.asa-wide { max-width: min(960px, 100%); }
  .asa-chat { display: grid; grid-template-columns: 270px minmax(0, 1fr); gap: 12px; height: min(74vh, 640px); }
  .asa-side { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow: hidden; border-right: 2px dashed #c9a877; padding-right: 12px; }
  .asa-side { position: relative; }
  .asa-sidehead { display: flex; gap: 6px; align-items: stretch; }
  .asa-sidehead .asa-newchat { flex: 1; min-width: 0; position: relative; }
  .asa-sidehead .asa-collapse { flex: none; padding: 3px 8px; }
  .asa-sidehead .asa-menu-btn { flex: none; white-space: nowrap; }
  .asa-sidebadge { position: absolute; top: -7px; right: -7px; min-width: 17px; height: 17px; padding: 0 3px; background: #c8503c; color: #fff6dc; font-style: normal; font-size: 11px; line-height: 17px; text-align: center; border: 2px solid #973a2f; box-sizing: content-box; display: none; }
  .asa-toolrow { display: flex; gap: 6px; }
  .asa-toolrow input[type="search"] { flex: 1; min-width: 0; }
  .asa-toolrow .asa-statussel { flex: none; max-width: 44%; }
  .asa-menu { position: absolute; z-index: 6; top: 44px; left: 0; right: 12px; background: #fffbe9; border: 3px solid #744122; box-shadow: 0 4px 0 rgba(58, 33, 23, 0.35); padding: 4px; display: flex; flex-direction: column; }
  .asa-menu-item { display: flex; gap: 10px; align-items: center; text-align: left; font: inherit; color: inherit; background: none; border: 0; padding: 7px 8px; cursor: pointer; }
  .asa-menu-item:hover, .asa-menu-item:focus { background: #f4e6c4; outline: none; }
  .asa-menu-item .mi { flex: none; font-size: 18px; width: 22px; text-align: center; }
  .asa-menu-item b { display: block; font-weight: 600; font-size: 14px; }
  .asa-menu-item small { display: block; font-size: 11.5px; opacity: 0.7; line-height: 1.25; }
  .asa-chat { transition: grid-template-columns 0.18s ease; }
  .asa-chat[data-side="min"] { grid-template-columns: 54px minmax(0, 1fr); }
  .asa-chat[data-side="min"] .asa-side { padding-right: 8px; align-items: center; }
  .asa-chat[data-side="min"] .asa-side > :not(.asa-sidehead) { display: none; }
  .asa-chat[data-side="min"] .asa-sidehead { flex-direction: column; width: 100%; }
  .asa-chat[data-side="min"] .asa-newchat .l, .asa-chat[data-side="min"] .asa-menu-btn { display: none; }
  .asa-chat[data-side="min"] .asa-newchat { padding: 6px 0; }
  .asa-side .asa-letters { overflow-y: auto; flex: 1; min-height: 0; }
  .asa-side .asa-letter { padding: 6px 8px; gap: 8px; }
  .asa-side .asa-letter.on { border-color: #744122; background: #f4e6c4; box-shadow: inset 3px 0 0 #744122; }
  .asa-side .asa-face { width: 26px; height: 42px; background-size: 182px 156px; background-position: -26px -3px; }
  .asa-side .asa-letter-status { display: none; }
  .asa-side .asa-filters { margin: 0; }
  .asa-side input[type="search"] { font: inherit; font-size: 13px; padding: 5px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #744122; min-width: 0; }
  .asa-newchat.on { box-shadow: 0 2px 0 #973a2f, 0 0 0 3px #f2c94c; }
  .asa-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .asa-chat-head { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 2px dashed #c9a877; }
  .asa-chat-head .asa-face { width: 26px; height: 42px; background-size: 182px 156px; background-position: -26px -3px; flex: none; }
  .asa-chat-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .asa-chat-title b { font-weight: normal; font-size: 16px; }
  .asa-chat-title .asa-muted { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
  .asa-chat-head .asa-title-input { margin: 0; padding: 2px 6px; font-size: 15px; border-color: transparent; background: transparent; }
  .asa-chat-head .asa-title-input:hover, .asa-chat-head .asa-title-input:focus { border-color: #d9c49a; background: #fffbe9; }
  .asa-head-actions { display: flex; gap: 6px; flex: none; }
  .asa-head-actions .asa-btn { padding: 3px 8px; }
  .asa-back { display: none; padding: 3px 9px; }
  .asa-thread-box { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 2px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: #b8935c transparent; }
  .asa-brow { display: flex; gap: 8px; align-items: flex-end; max-width: 92%; }
  .asa-face.sm { width: 24px; height: 38px; background-size: 168px 144px; background-position: -24px -3px; flex: none; }
  .asa-b { padding: 8px 10px; border: 1px solid #d9c49a; background: #fffbe9; font-size: 13.5px; line-height: 1.4; min-width: 0; }
  .asa-b.you { align-self: flex-end; max-width: 85%; background: #e6f0d8; border-color: #9ab87a; }
  .asa-b.meeting { border-color: #b88a4a; background: #fdf3da; }
  .asa-b.plan { border-color: #4a8ac8; box-shadow: inset 3px 0 0 #4a8ac8; }
  .asa-b .asa-b-text { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 46vh; overflow: auto; }
  .asa-b .asa-b-text.asa-md { white-space: normal; font-size: inherit; line-height: inherit; }
  .asa-b .asa-md > :first-child { margin-top: 0; } .asa-b .asa-md > :last-child { margin-bottom: 0; }
  .asa-b .asa-md h1, .asa-b .asa-md h2, .asa-b .asa-md h3 { font-size: 1.1em; }
  .asa-b .asa-md pre code { font-size: 12px; }
  .asa-b small { display: block; opacity: 0.6; font-size: 11px; margin-top: 4px; }
  .asa-b em { display: block; font-style: normal; margin-bottom: 4px; }
  .asa-b.typing { display: flex; gap: 8px; align-items: center; }
  .asa-working { align-self: flex-start; max-width: 100%; margin-left: 32px; display: inline-flex; gap: 7px; align-items: center; padding: 2px 10px; font-size: 12px; line-height: 1.3; background: #fffbe9; border: 1px solid #d9c49a; }
  .asa-working-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.85; }
  .asa-dots { display: inline-flex; gap: 3px; } .asa-dots i { width: 5px; height: 5px; background: #744122; animation: asa-dot 1.2s infinite; }
  .asa-dots i:nth-child(2) { animation-delay: 0.2s; } .asa-dots i:nth-child(3) { animation-delay: 0.4s; }
  @keyframes asa-dot { 0%, 60%, 100% { opacity: 0.25; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }
  .asa-sys { align-self: center; font-size: 12px; padding: 2px 10px; background: #e6d3a6; border: 1px solid #c9a877; }
  .asa-lwrap { position: relative; }
  .asa-lwrap .asa-rowact { position: absolute; top: 6px; right: 6px; font: inherit; font-size: 13px; line-height: 1; padding: 3px 5px; cursor: pointer; background: #fffbe9; border: 1px solid #c9a877; opacity: 0; transition: opacity 0.12s; z-index: 1; }
  .asa-lwrap:hover .asa-rowact, .asa-lwrap:focus-within .asa-rowact { opacity: 0.95; }
  @media (hover: none) { .asa-lwrap .asa-rowact { opacity: 0.7; } }
  .asa-plan-actions { align-items: center; margin: -2px 0 0 32px; }
  .asa-tidy { flex: none; margin: 4px 0 4px 32px; padding: 8px 10px; background: #fffbe9; border: 2px solid #c9a877; display: flex; flex-direction: column; gap: 4px; max-height: 260px; overflow: auto; }
  .asa-tidy label { display: flex; gap: 6px; align-items: baseline; font-size: 13px; cursor: pointer; }
  .asa-tidy .f { overflow-wrap: anywhere; } .asa-tidy .to { opacity: 0.75; white-space: nowrap; } .asa-tidy small { opacity: 0.6; }
  .asa-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 32px; }
  .asa-comp { border-top: 2px dashed #c9a877; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; position: relative; }
  .asa-mention { position: absolute; left: 0; bottom: 100%; margin-bottom: 4px; z-index: 5; min-width: 240px; max-width: 100%; background: #fffbe9;
    border: 2px solid #744122; box-shadow: 0 3px 0 rgba(0,0,0,0.25); display: flex; flex-direction: column; }
  .asa-mention[hidden] { display: none; }
  .asa-mention button { font: inherit; font-size: 13px; text-align: left; background: none; border: 0; padding: 5px 10px; cursor: pointer; color: inherit; }
  .asa-mention button b { font-weight: normal; } .asa-mention button span { opacity: 0.65; font-size: 12px; }
  .asa-mention button.on, .asa-mention button:hover { background: #f4e6c4; }
  .asa-undo { position: relative; overflow: hidden; display: flex; align-items: center; gap: 10px; padding: 6px 10px 9px; margin-top: 6px; background: #fff6dc; border: 2px solid #744122; font-size: 13px; }
  .asa-undo span { flex: 1; }
  .asa-undo .asa-btn { padding: 3px 10px; }
  .asa-undo-bar { position: absolute; left: 0; bottom: 0; height: 4px; width: 100%; background: #c8503c; transform-origin: left; animation: asa-undo linear forwards; }
  @keyframes asa-undo { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  .asa-flash { animation: asa-flash 0.9s ease-out; }
  @keyframes asa-flash { 0%, 40% { border-color: #f2c94c; box-shadow: 0 0 0 3px #f2c94c; } 100% { box-shadow: 0 0 0 0 transparent; } }
  .asa-comp-box { display: flex; gap: 8px; align-items: flex-end; }
  .asa-comp textarea { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 6px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #744122;
    resize: none; max-height: 150px; }
  .asa-send { flex: none; width: 40px; height: 40px; font: inherit; font-size: 18px; cursor: pointer; background: #c8503c; color: #fff6dc; border: 2px solid #973a2f; box-shadow: 0 2px 0 #973a2f; }
  .asa-send:disabled { opacity: 0.45; cursor: default; }
  .asa-send.stop { background: #fffbe9; color: #3a2117; border-color: #744122; box-shadow: 0 2px 0 #744122; }
  .asa-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-chipsel { font: inherit; font-size: 12.5px; padding: 3px 6px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; max-width: 48%; cursor: pointer; }
  .asa-chipsel:hover, .asa-chipsel:focus { border-color: #744122; }
  .asa-pill { font-size: 12px; padding: 2px 8px; background: #e6d3a6; border: 1px solid #c9a877; }
  .asa-plane { position: fixed; left: 0; top: 0; z-index: 1200; width: 28px; height: 28px; pointer-events: none; will-change: transform; }
  .asa-spark { position: fixed; z-index: 1199; width: 5px; height: 5px; background: #f2c94c; pointer-events: none; animation: asa-spark 0.6s ease-out forwards; }
  @keyframes asa-spark { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(10px) scale(0.3); } }
  @media (max-width: 720px) {
    .asa-chat { grid-template-columns: 1fr; height: min(78vh, 640px); }
    .asa-sidehead .asa-collapse { display: none; }
    .asa-side { border-right: 0; padding-right: 0; }
    .asa-chat[data-show="list"] .asa-main, .asa-chat[data-show="chat"] .asa-side { display: none; }
    .asa-back { display: block; }
    .asa-side .asa-letter-status { display: block; }
    .asa-chipsel { max-width: 46%; }
  }
  @media (prefers-reduced-motion: reduce) { .asa-dots i, .asa-spark { animation: none; } }
  .asa-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .asa-tabs .asa-btn.on { background: #744122; color: #fff6dc; }
  .asa-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .asa-filters input, .asa-filters select { font: inherit; font-size: 13px; padding: 4px 6px; background: #fffbe9; color: #3a2117;
    border: 2px solid #744122; box-sizing: border-box; min-width: 0; }
  .asa-filters input { flex: 1 1 100%; }
  .asa-filters select { flex: 1 1 120px; }
  .asa-side .asa-filters .asa-chip { padding: 2px 7px; font-size: 12.5px; }
  .asa-imgs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .asa-imgs figure { margin: 0; max-width: min(100%, 360px); }
  .asa-imgs img { display: block; max-width: 100%; max-height: 230px; border: 2px solid #d9c49a; background: #fff; cursor: zoom-in; }
  .asa-imgs figcaption { font-size: 11.5px; opacity: 0.6; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-lightbox { position: fixed; inset: 0; z-index: 1300; display: flex; align-items: center; justify-content: center; background: rgba(20,12,6,0.82); cursor: zoom-out; padding: 16px; }
  .asa-lightbox img { max-width: 94vw; max-height: 90vh; border: 3px solid #f4e6c4; background: #fff; box-shadow: 0 6px 0 rgba(0,0,0,0.35); }
  .asa-dock .asa-chat { height: max(380px, min(1100px, var(--asa-dockbody, calc(100vh - 330px)))); }
  .asa-attach { display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-attach figure { position: relative; margin: 0; }
  .asa-attach img { display: block; width: 56px; height: 56px; object-fit: cover; border: 2px solid #744122; background: #fff; }
  .asa-attach button { position: absolute; top: -7px; right: -7px; width: 19px; height: 19px; padding: 0; line-height: 15px; font-size: 13px; cursor: pointer;
    background: #c8503c; color: #fff6dc; border: 2px solid #973a2f; }
  .asa-attach .busy { opacity: 0.45; }
  .asa-comp.drop { outline: 3px dashed #4a86d8; outline-offset: 2px; }
  .asa-deny { border: 2px solid #c8503c; background: #ffe9e0; padding: 8px 10px; font-size: 13.5px; }
  .asa-deny b { display: block; font-weight: 600; margin-bottom: 4px; }
  .asa-deny-exact { margin-top: 4px; padding: 4px 6px; background: #fff6dc; border: 1px dashed #c8503c; }
  .asa-wt { align-self: stretch; padding: 8px 10px; border: 2px solid #4a8a52; background: #eaf6e4; box-shadow: inset 4px 0 0 #4a8a52; display: flex; flex-direction: column; gap: 6px; }
  .asa-wt pre { margin: 0; padding: 6px; background: #fffbe9; white-space: pre-wrap; word-break: break-all; font-size: 12px; max-height: 38vh; overflow: auto; }
  .asa-wt .asa-ask-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-ask { align-self: stretch; padding: 8px 10px; border: 2px solid #c8801f; background: #fff3d6; box-shadow: inset 4px 0 0 #c8801f; display: flex; flex-direction: column; gap: 6px; }
  .asa-ask pre { margin: 0; padding: 6px; background: #fffbe9; white-space: pre-wrap; word-break: break-all; font-size: 12.5px; max-height: 30vh; overflow: auto; }
  .asa-ask .asa-ask-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-permbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; width: 100%; padding: 6px 8px; background: #fde7c8; border: 2px solid #c8801f; font-size: 12.5px; }
  .asa-deny-exact pre { margin: 4px 0; padding: 6px; background: #fffbe9; white-space: pre-wrap; word-break: break-all; font-size: 12.5px; }
  .asa-deny-head { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
  .asa-deny-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
  .asa-deny-row code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #fff6dc; padding: 1px 5px; }
  .asa-deny-row small { opacity: 0.7; }
  .asa-group { font-size: 12px; opacity: 0.65; margin: 8px 2px 0; text-transform: none; }
  .asa-plain .asa-letter-body b { font-size: 15px; font-weight: 600; }
  .asa-plain .asa-letter-body div, .asa-plain .asa-letter-status, .asa-plain .asa-note, .asa-plain .asa-muted { font-size: 13px; }
  .asa-plain .asa-chat-title b { font-size: 17px; font-weight: 600; }
  .asa-plain .asa-b, .asa-plain .asa-msg { font-size: 15px; line-height: 1.5; }
  .asa-plain .asa-btn, .asa-plain .asa-chip, .asa-plain .asa-chipsel, .asa-plain .asa-filters select, .asa-plain .asa-filters input,
  .asa-plain .asa-side input[type="search"], .asa-plain .asa-comp textarea, .asa-plain .asa-mention button { font-size: 14px; }
  .asa-plain .asa-comp textarea { font-size: 15px; }
  .asa-chip { font: inherit; font-size: 12px; padding: 3px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; cursor: pointer; }
  .asa-chip.on { border-color: #744122; background: #f4e6c4; }
  .asa-live { color: #3f8a36; }
  .asa-title-input { width: 100%; font: inherit; font-size: 14px; padding: 4px 6px; margin-top: 8px; background: #fffbe9; color: #3a2117;
    border: 2px solid #d9c49a; box-sizing: border-box; }
  .asa-msg.plan { border-color: #4a8ac8; box-shadow: inset 3px 0 0 #4a8ac8; }
  .asa-msg em { display: block; font-style: normal; font-weight: bold; margin-bottom: 4px; }
  `;

  // ── Task API (local only) ──
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

  // ── Letters ──
  const readReports = new Set(JSON.parse(ns.store.get('readReports') || '[]'));
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtK = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

  function dailyReport() {
    const stats = ns.data?.stats;
    if (!stats) return null;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const key = dayKey(y);
    const d = stats.days?.[key];
    const lines = [];
    if (!d || !d.tools) lines.push(S.reportNone);
    else {
      lines.push(S.reportBody({ day: key, ...d }), S.reportMix(d));
      if (d.tokens) lines.push(S.reportTokens(fmtK(d.tokens.input + d.tokens.cacheRead + d.tokens.cacheWrite), fmtK(d.tokens.output)));
      const model = Object.keys(d.models ?? {})[0];
      if (model) lines.push(S.reportModel(model));
    }
    const doneTasks = (ns.data?.mail ?? []).filter((l) => l.status === 'done' && l.finishedAt?.startsWith(key)).length;
    if (doneTasks) lines.push(S.reportTasks(doneTasks));
    if (stats.streak) lines.push(S.reportStreak(stats.streak));
    return { id: `report-${key}`, report: true, day: key, read: readReports.has(key), archived: (ns.data?.archive?.reports ?? []).includes(key), text: lines.join('\n\n') };
  }

  const letters = () => {
    const list = [...(ns.data?.mail ?? [])];
    const report = dailyReport();
    return report ? [report, ...list] : list;
  };
  const unread = () => letters().filter((l) => !l.read && !l.archived && l.status !== 'running').length;
  const staffFor = (l) => (l.agent ? (ns.data?.staff ?? []).find((m) => m.agent === l.agent) : null);
  const who = (l) => (l.report ? S.reportFrom : l.name ?? S.general);
  const face = (l) => {
    const m = staffFor(l);
    if (!m) return h('div', { class: 'asa-face envelope' }, l.report ? '📰' : '✉️');
    const el = h('div', { class: 'asa-face' });
    el.style.backgroundImage = `url(${ns.portraitUrl({ palette: m.palette })})`;
    return el;
  };
  const timeOf = (iso) => new Date(iso).toLocaleString(ns.lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ── Panel state ──
  let panel = null;
  let sel = null; // 'new' (the composer), a letter id, or null (narrow screens: showing the list)
  let options = null; // the task API's options (who / projects), fetched when the mailbox opens
  let notice = '';
  let sending = false;
  const prefs = (() => { try { return JSON.parse(ns.store.get('chatPrefs') || '{}'); } catch { return {}; } })();
  const savePrefs = () => ns.store.set('chatPrefs', JSON.stringify(prefs));
  /** 'claude-opus-5-5' → 'Opus 5.5', 'claude-haiku-4-5-20251001' → 'Haiku 4.5', an alias → its name. */
  const modelName = (m) => {
    if (!m) return '';
    const fam = /(opus|sonnet|haiku)/i.exec(m)?.[1];
    if (!fam) return String(m).replace(/^claude-/, '');
    const nums = (m.slice(m.toLowerCase().indexOf(fam.toLowerCase()) + fam.length).match(/-(\d{1,2})(?=-|$)/g) ?? []).slice(0, 2).map((x) => x.slice(1));
    return `${fam[0].toUpperCase()}${fam.slice(1).toLowerCase()}${nums.length ? ` ${nums.join('.')}` : ''}`;
  };
  const MODEL_CHOICES = [['opus', 'Opus'], ['sonnet', 'Sonnet'], ['haiku', 'Haiku']];
  // Drafts survive closing the panel and reloading the page (one per chat, the newest 20).
  const drafts = (() => { try { return JSON.parse(ns.store.get('chatDrafts') || '{}'); } catch { return {}; } })();
  const draftKey = () => sel ?? 'new';
  const getDraft = (key = draftKey()) => drafts[key] ?? '';
  let draftTimer = null;
  const flushDrafts = () => {
    clearTimeout(draftTimer);
    const keys = Object.keys(drafts);
    for (const k of keys.slice(0, Math.max(0, keys.length - 20))) delete drafts[k];
    ns.store.set('chatDrafts', JSON.stringify(drafts));
  };
  const setDraft = (text, key = draftKey()) => {
    delete drafts[key]; // re-insert last so the newest are kept
    if (text) drafts[key] = text;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(flushDrafts, 300);
  };
  let pendingUndo = null; // resolves 'go' | 'undo' while the undo bar shows
  const ui = {}; // root, side, main, head, thread, comp, refill, keys
  const fx = { drop: 0 };
  const narrow = () => matchMedia('(max-width: 720px)').matches;

  const progressText = (l) => (l.progress ? S.progress(l.progress === 'Writing the answer' ? S.writing : ns.translateStatus?.(l.progress) ?? l.progress) : S.starting);
  /** Shell command that continues this letter's session in Terminal. */
  const terminalCommand = (l) => `cd '${String(l.cwd).replace(/'/g, `'\\''`)}' && claude --resume ${l.sessionId}`;
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand?.('copy');
    ta.remove();
    return !!ok;
  }

  // ── Helpers ──
  const filter = { status: 'all', project: '', who: '', q: '' };
  const home = (p) => String(p ?? '').replace(/^\/(Users|home)\/[^/]+/, '~');
  const letterTitle = (l) => l.title || (l.thread?.[0]?.text ?? '').split('\n')[0].slice(0, 50) || who(l);
  const statusGroup = (l) => (l.status === 'running' || l.status === 'queued' ? 'running' : l.status === 'awaiting' ? 'awaiting' : 'done');
  const has = (text, q) => String(text ?? '').toLowerCase().includes(q);
  const pickLang = (v) => (v && typeof v === 'object' ? v[ns.lang] ?? v.en : v);
  const errorText = (err) => ({ busy: S.busy, noApi: S.noApi, 'director busy': S.directorBusy, gone: S.askGone, budget: S.budgetFull, ...S.wtErr })[err.message] ?? `${S.failed} (${err.message})`;
  const memberOf = (agent) => (agent ? (options?.staff ?? ns.data?.staff ?? []).find((m) => m.agent === agent) ?? null : null);
  const isDirector = (agent) => !!memberOf(agent)?.director;
  const current = () => (sel && sel !== 'new' ? letters().find((l) => l.id === sel) ?? null : null);
  const busy = (l) => l?.status === 'running' || l?.status === 'queued';
  const smallFace = (l) => { const el = face(l); el.classList.add('sm'); return el; };

  // ── Pictures in answers: a path to a screenshot in Claude's text shows up as a thumbnail (loaded through the local API) ──
  const IMG_RE = /[^\s`'"()[\]<>]+\.(?:png|jpe?g|gif|webp)\b/gi;
  const imageCache = new Map(); // absolute path -> Promise<object URL | null>
  function imagePaths(text, cwd) {
    const found = [];
    for (const raw of String(text ?? '').match(IMG_RE) ?? []) {
      let p = raw.replace(/^file:\/\//, '').replace(/[.,;:]+$/, '');
      if (/^https?:/i.test(p) || /^[a-z]+:\/\//i.test(p)) continue;
      const homeDir = /^(\/Users\/[^/]+|\/home\/[^/]+)/.exec(String(cwd ?? ''))?.[1];
      if (p.startsWith('~/')) p = homeDir ? `${homeDir}${p.slice(1)}` : '';
      else if (!p.startsWith('/')) p = cwd ? `${String(cwd).replace(/\/$/, '')}/${p.replace(/^\.\//, '')}` : '';
      if (p && !found.includes(p)) found.push(p);
    }
    return found.slice(0, 4);
  }
  function imageUrl(p) {
    if (!imageCache.has(p)) {
      const port = ns.data?.taskServer?.port;
      imageCache.set(p, !port || !token ? Promise.resolve(null)
        : fetch(`http://127.0.0.1:${port}/api/image?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.blob() : null)).then((b) => (b ? URL.createObjectURL(b) : null)).catch(() => null));
    }
    return imageCache.get(p);
  }
  function lightbox(src) {
    const box = h('div', { class: 'asa-lightbox' }, h('img', { src, alt: '' }));
    const close = () => { box.remove(); removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
    addEventListener('keydown', onKey, true);
    box.onclick = close;
    document.body.append(box);
  }
  /** The pictures an answer mentions (only those that load: a missing file just doesn't show). */
  const imageStrip = (text, cwd) => imageStripFor(imagePaths(text, cwd));
  function imageStripFor(paths) {
    if (!paths?.length) return null;
    const strip = h('div', { class: 'asa-imgs' });
    for (const p of paths) {
      imageUrl(p).then((src) => {
        if (!src) return;
        const img = h('img', { src, alt: p.split('/').pop(), loading: 'lazy' });
        img.onclick = () => lightbox(src);
        strip.append(h('figure', {}, img, h('figcaption', { title: p }, p.split('/').pop())));
      });
    }
    return strip;
  }

  // ── Attaching pictures (pasted, dragged or picked) ──
  let att = []; // [{ path, url, busy }] for the composer on screen
  const clearAtt = () => { for (const a of att) URL.revokeObjectURL(a.url); att = []; };
  async function uploadImage(file) {
    const port = ns.data?.taskServer?.port;
    if (!port || !token) throw new Error('noApi');
    const res = await fetch(`http://127.0.0.1:${port}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || String(res.status));
    return json.path;
  }
  /**
   * Wires a composer for pictures: paste into the textarea, drop on the composer, or the 📎 button. Returns { strip, button }:
   * the thumbnails (with a ✕ each) and the button to put in the chips row. `changed()` runs when the list changes.
   */
  function attachControls(ta, composer, changed) {
    const strip = h('div', { class: 'asa-attach' });
    const draw = () => {
      strip.replaceChildren(...att.map((a) => h('figure', { class: a.busy ? 'busy' : '' }, h('img', { src: a.url, alt: '' }),
        h('button', { type: 'button', title: S.remove, 'aria-label': S.remove, onclick: () => { URL.revokeObjectURL(a.url); att = att.filter((x) => x !== a); draw(); changed(); } }, '×'))));
      strip.hidden = !att.length;
    };
    async function add(files) {
      const images = [...files].filter((f) => /^image\/(png|jpe?g|gif|webp)$/.test(f.type));
      if (!images.length && files.length) { notice = S.attachFail; return; }
      for (const file of images) {
        if (att.length >= 4 || file.size > 8 * 1024 * 1024) { notice = S.attachFail; break; }
        const item = { path: null, url: URL.createObjectURL(file), busy: true };
        att.push(item);
        draw();
        changed();
        try { item.path = await uploadImage(file); item.busy = false; } catch { att = att.filter((x) => x !== item); URL.revokeObjectURL(item.url); notice = S.attachFail; }
        draw();
        changed();
      }
      if (notice === S.attachFail) { const n = h('div', { class: 'asa-note' }, notice); strip.after(n); setTimeout(() => n.remove(), 4000); notice = ''; }
    }
    ta.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); add(files); }
    });
    composer.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types ?? [])].includes('Files')) { e.preventDefault(); composer.classList.add('drop'); } });
    composer.addEventListener('dragleave', () => composer.classList.remove('drop'));
    composer.addEventListener('drop', (e) => {
      composer.classList.remove('drop');
      if (e.dataTransfer?.files?.length) { e.preventDefault(); add(e.dataTransfer.files); }
    });
    const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', multiple: '', hidden: '' });
    input.onchange = () => { add(input.files); input.value = ''; };
    const button = h('button', { type: 'button', class: 'asa-chip', title: S.attachTip, 'aria-label': S.attach, onclick: () => input.click() }, '📎');
    draw();
    return { strip, button: h('span', {}, button, input), ready: () => att.every((a) => !a.busy && a.path) };
  }
  const pendingImages = () => att.filter((a) => a.path).map((a) => a.path);

  async function ensureOptions() {
    if (options) return options;
    try { options = await api('GET', '/api/options'); } catch { options = { error: true }; }
    return options;
  }

  // ── Paper plane and the letter landing in the mailbox ──
  function mailboxPoint() {
    const v = ns.view;
    const f = ns.findFurniture('COZY_MAILBOX')[0];
    if (!v || !f) return null;
    const r = v.canvas.getBoundingClientRect();
    const k = r.width / v.canvas.width;
    return { x: r.left + (v.offX + (f.col * 16 + 8) * v.zoom) * k, y: r.top + (v.offY + (f.row * 16 + 8) * v.zoom) * k };
  }
  const PLANE = '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><path d="M2 5 L26 14 L2 23 L8 14 Z" fill="#fff6dc" stroke="#744122" stroke-width="2" stroke-linejoin="round"/><path d="M8 14 L26 14" stroke="#744122" stroke-width="2"/></svg>';
  function spark(x, y) {
    const el = h('i', { class: 'asa-spark', style: { left: `${x}px`, top: `${y}px` } });
    document.body.append(el);
    setTimeout(() => el.remove(), 600);
  }
  /** A paper plane from `fromEl` to the mailbox on the wall; resolves when it lands (never rejects). */
  function flyPlane(fromEl) {
    return new Promise((resolve) => {
      const end = mailboxPoint();
      const r = fromEl?.getBoundingClientRect();
      if (!end || !r || matchMedia('(prefers-reduced-motion: reduce)').matches) return void setTimeout(resolve, 250);
      const a = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const c = { x: (a.x + end.x) / 2 - 60, y: Math.min(a.y, end.y) - 170 };
      const plane = h('div', { class: 'asa-plane' });
      plane.innerHTML = PLANE;
      document.body.append(plane);
      const t0 = performance.now();
      const DUR = 1000;
      let lastSpark = 0;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        const x = (1 - e) ** 2 * a.x + 2 * (1 - e) * e * c.x + e * e * end.x;
        const y = (1 - e) ** 2 * a.y + 2 * (1 - e) * e * c.y + e * e * end.y;
        const dx = 2 * (1 - e) * (c.x - a.x) + 2 * e * (end.x - c.x);
        const dy = 2 * (1 - e) * (c.y - a.y) + 2 * e * (end.y - c.y);
        plane.style.transform = `translate(${x - 14}px, ${y - 14}px) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg) scale(${1.35 - 0.7 * e})`;
        if (now - lastSpark > 45) { lastSpark = now; spark(x, y); }
        if (t < 1) requestAnimationFrame(step);
        else { plane.remove(); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }
  const dropLetter = () => { fx.drop = performance.now(); ns.notify?.sfx?.('drop'); };

  // ── Sidebar: chats and sessions ──
  function pickLetter(id) { select(id); }

  /** One list like Claude's own: your mailbox chats and every other Claude Code session, newest first, grouped by day. */
  const dayGroup = (ms) => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const t = midnight.getTime();
    return ms >= t ? S.gToday : ms >= t - 86_400_000 ? S.gYesterday : ms >= t - 6 * 86_400_000 ? S.gWeek : S.gOlder;
  };
  function chatItems() {
    const q = filter.q.trim().toLowerCase();
    const mailSessions = new Set((ns.data?.mail ?? []).map((l) => l.sessionId));
    const items = [];
    const archive = filter.status === 'archived';
    for (const l of letters()) {
      if (l.report) {
        if (l.archived ? archive : filter.status === 'all' && !q) items.push({ kind: 'report', l, at: archive ? Date.parse(l.day) || 0 : Infinity });
        continue;
      }
      if (!!l.archived !== archive) continue; // archived chats only show under 🗄
      if (!archive && filter.status !== 'all' && statusGroup(l) !== filter.status) continue;
      if (q && ![letterTitle(l), l.project, who(l), ...(l.thread ?? []).map((m) => m.text)].some((t) => has(t, q))) continue;
      items.push({ kind: 'letter', l, at: Date.parse(l.finishedAt ?? l.createdAt) || 0 });
    }
    const archivedSessions = new Set(ns.data?.archive?.sessions ?? []);
    for (const x of ns.data?.sessions ?? []) {
      if (mailSessions.has(x.id)) continue; // already a mailbox chat
      if (archivedSessions.has(x.id) !== archive) continue;
      const live = Date.now() - Date.parse(x.at) < 90_000;
      if (!archive && filter.status !== 'all' && filter.status !== (live ? 'running' : 'done')) continue;
      if (q && ![x.title, x.prompt, x.project, x.cwd].some((t) => has(t, q))) continue;
      items.push({ kind: 'session', x, live, at: Date.parse(x.at) || 0 });
    }
    return items.sort((a, b) => b.at - a.at);
  }

  /** Archive or restore a chat that is a mailbox letter, an outside Claude Code session or the daily report. */
  async function setArchive(target, archived) {
    notice = '';
    try {
      if (target.t === 'letter') await api('POST', `/api/tasks/${target.id}/${archived ? 'archive' : 'unarchive'}`);
      else await api('POST', '/api/archive', { kind: target.t === 'session' ? 'sessions' : 'reports', id: target.id, archived });
      if (sel === target.id || sel === `session:${target.id}` || sel === `report-${target.id}`) { sel = null; syncLayout(); buildMain(); }
      await ns.refreshData();
      refreshAll?.();
    } catch (err) {
      notice = errorText(err);
    }
    ui.refill?.();
  }
  /** The 🗄 (or ↩️) button in a chat's header. */
  const headArchive = (target, archived) => h('div', { class: 'asa-head-actions' },
    h('button', { type: 'button', class: 'asa-btn', title: archived ? S.unarchiveRow : S.archiveRow, 'aria-label': archived ? S.unarchiveRow : S.archiveRow, onclick: () => setArchive(target, !archived) }, archived ? '↩️' : '🗄'));
  /** A list row with a small 🗄 (or ↩️ in the archive) that shows on hover, so no chat has to be opened just to archive it. */
  function rowWrap(row, target, restore) {
    const btn = h('button', { type: 'button', class: 'asa-rowact', title: restore ? S.unarchiveRow : S.archiveRow, 'aria-label': restore ? S.unarchiveRow : S.archiveRow }, restore ? '↩️' : '🗄');
    btn.onclick = (e) => { e.stopPropagation(); setArchive(target, !restore); };
    return h('div', { class: 'asa-lwrap' }, row, btn);
  }

  let bulkArmedUntil = 0;
  function chatRows(container) {
    const archiveMode = filter.status === 'archived';
    const items = chatItems();
    const out = [];
    // Outside sessions can pile up: one button archives all the ones that aren't running now.
    const idleSessions = items.filter((it) => it.kind === 'session' && !it.live).map((it) => it.x.id);
    if (!archiveMode && filter.status === 'all' && !filter.q.trim() && idleSessions.length >= 3) {
      // The list is rebuilt every few seconds, so "armed" lives here and not on the button.
      const armed = Date.now() < bulkArmedUntil;
      const all = h('button', { type: 'button', class: 'asa-chip', style: { margin: '2px 0 6px' } }, armed ? S.archiveSure : S.archiveAllSessions(idleSessions.length));
      all.onclick = async () => {
        if (Date.now() >= bulkArmedUntil) {
          bulkArmedUntil = Date.now() + 5000;
          all.textContent = S.archiveSure;
          setTimeout(() => { if (all.isConnected && Date.now() >= bulkArmedUntil) all.textContent = S.archiveAllSessions(idleSessions.length); }, 5100);
          return;
        }
        bulkArmedUntil = 0;
        all.disabled = true;
        try { await api('POST', '/api/archive', { kind: 'sessions', ids: idleSessions.slice(0, 500), archived: true }); await ns.refreshData(); } catch (err) { notice = errorText(err); }
        ui.refill?.();
      };
      out.push(all);
    }
    let group = null;
    for (const it of items) {
      if (it.kind !== 'report' && dayGroup(it.at) !== group) {
        group = dayGroup(it.at);
        out.push(h('div', { class: 'asa-group' }, group));
      }
      if (it.kind === 'session') {
        const { x, live } = it;
        const mins = Math.max(0, Math.round((Date.now() - Date.parse(x.at)) / 60_000));
        const row = h('button', { type: 'button', class: `asa-letter${sel === `session:${x.id}` ? ' on' : ''}`, onclick: () => select(`session:${x.id}`) },
          h('div', { class: 'asa-face envelope' }, '💬'),
          h('div', { class: 'asa-letter-body' },
            h('b', {}, x.title || x.project || x.id.slice(0, 8)),
            h('div', { title: x.cwd ?? '' }, [x.project, live ? S.live : S.ago(mins)].filter(Boolean).join(' · '))));
        out.push(live ? row : rowWrap(row, { t: 'session', id: x.id }, archiveMode));
        continue;
      }
      const l = it.l;
      const status = l.report ? '' : S[l.status] ?? '';
      const row = h('button', { type: 'button', class: `asa-letter${l.read || busy(l) ? '' : ' unread'}${sel === l.id ? ' on' : ''}`, onclick: () => pickLetter(l.id) },
        face(l),
        h('div', { class: 'asa-letter-body' },
          h('b', {}, l.report ? S.report : letterTitle(l)),
          h('div', {}, l.report ? l.day : [who(l), l.project, l.createdAt ? timeOf(l.createdAt) : null].filter(Boolean).join(' · ')),
          busy(l) ? h('div', {}, l.status === 'queued' ? S.queuedShort : progressText(l)) : null),
        h('div', { class: 'asa-letter-status' }, status));
      out.push(busy(l) ? row : rowWrap(row, l.report ? { t: 'report', id: l.day } : { t: 'letter', id: l.id }, archiveMode));
    }
    container.replaceChildren(...(out.length ? out : [h('p', { class: 'asa-muted' }, filter.status === 'archived' && !filter.q ? S.emptyArchive : letters().length || ns.data?.sessions?.length ? S.noMatch : S.empty)]));
  }

  function fillSide() {
    const rows = h('div', { class: 'asa-letters' });
    const badge = h('i', { class: 'asa-sidebadge' });
    const paintBadge = () => { const n = unread(); badge.textContent = n > 9 ? '9+' : String(n); badge.style.display = n ? '' : 'none'; };
    ui.refill = () => { chatRows(rows); paintBadge(); };
    const search = h('input', { type: 'search', placeholder: S.search, value: filter.q, 'aria-label': S.search });
    search.oninput = () => { filter.q = search.value; ui.refill(); };
    // The status filter is one small menu next to the search box (five chips used to take two rows).
    const statusSel = h('select', { class: 'asa-chipsel asa-statussel', title: S.filterTip, 'aria-label': S.filterTip },
      [['all', S.fAll], ['running', S.fRunning], ['awaiting', S.fAwaiting], ['done', S.fDone], ['archived', S.fArchived]].map(([v, t]) => h('option', { value: v }, t)));
    statusSel.value = filter.status;
    statusSel.onchange = () => { filter.status = statusSel.value; ui.refill(); };
    // Collapsing the list gives the chat the whole panel; only "new chat" and the way back stay.
    const toggle = h('button', { type: 'button', class: 'asa-btn asa-collapse' });
    const paintToggle = () => { toggle.textContent = prefs.sideMin ? '»' : '«'; toggle.title = prefs.sideMin ? S.sideShow : S.sideHide; toggle.setAttribute('aria-label', toggle.title); };
    toggle.onclick = () => { prefs.sideMin = !prefs.sideMin; savePrefs(); paintToggle(); syncLayout(); };
    paintToggle();
    // The tools (schedules, cost limits, tidy Downloads) live in one labelled menu instead of a row of icon-only buttons.
    const closeMenu = () => ui.side.querySelector('.asa-menu')?.remove();
    const menuItems = [
      { icon: '⏰', label: S.menuSched, desc: S.schedTip, run: () => ns.schedule?.open() },
      { icon: '💰', label: S.menuBudget, desc: S.budgetTip, run: () => ns.budget?.open() },
      { icon: '🧹', label: S.menuTidy, desc: S.tidyTip, run: () => { prefs.cwd = '@downloads'; savePrefs(); setDraft(S.tidyDraft, 'new'); select('new'); setTimeout(() => ui.comp?.querySelector('textarea')?.focus(), 60); } },
    ];
    const menuBtn = h('button', { type: 'button', class: 'asa-btn asa-menu-btn', title: S.menuTip, 'aria-label': S.menuTip, 'aria-haspopup': 'menu' }, '☰ ', S.menuBtn);
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      if (ui.side.querySelector('.asa-menu')) return closeMenu();
      const menu = h('div', { class: 'asa-menu', role: 'menu' }, menuItems.map((it) => {
        const b = h('button', { type: 'button', class: 'asa-menu-item', role: 'menuitem' }, h('span', { class: 'mi' }, it.icon), h('span', {}, h('b', {}, it.label), h('small', {}, it.desc)));
        b.onclick = () => { closeMenu(); it.run(); };
        return b;
      }));
      ui.side.append(menu);
      setTimeout(() => { const off = (ev) => { if (!menu.contains(ev.target)) { closeMenu(); document.removeEventListener('click', off, true); } }; document.addEventListener('click', off, true); }, 0);
    };
    ui.side.replaceChildren(
      h('div', { class: 'asa-sidehead' }, toggle,
        h('button', { type: 'button', class: `asa-btn primary asa-newchat${sel === 'new' ? ' on' : ''}`, title: S.newChat, onclick: () => select('new') }, h('span', { class: 'p' }, '＋'), h('span', { class: 'l' }, ` ${S.newChat.replace(/^[+＋]\s*/, '')}`), badge),
        menuBtn),
      h('div', { class: 'asa-toolrow' }, search, statusSel),
      rows);
    ui.refill();
  }

  // ── Main: header, thread, composer ──
  function select(id) {
    pendingUndo?.('go');
    if (id !== sel) clearAtt();
    sel = id;
    notice = '';
    const l = current();
    if (l) markRead(l);
    syncLayout();
    ui.refill?.();
    ui.side?.querySelector('.asa-newchat')?.classList.toggle('on', sel === 'new');
    buildMain();
  }
  function syncLayout() { if (ui.root) { ui.root.dataset.show = narrow() ? (sel ? 'chat' : 'list') : 'both'; ui.root.dataset.side = prefs.sideMin && !narrow() ? 'min' : 'open'; } }

  const sessionOf = (id) => (ns.data?.sessions ?? []).find((x) => `session:${x.id}` === id) ?? null;

  /** A Claude Code session started outside the office (Terminal, Desktop): shown as a chat you can continue. */
  function showSession(x) {
    const live = Date.now() - Date.parse(x.at) < 90_000;
    const back = h('button', { type: 'button', class: 'asa-btn asa-back', onclick: () => { sel = null; syncLayout(); ui.refill?.(); }, 'aria-label': S.back }, '←');
    const head = h('div', { class: 'asa-chat-head' }, back, h('div', { class: 'asa-face envelope' }, '💬'),
      h('div', { class: 'asa-chat-title' }, h('b', {}, x.title || x.project || x.id.slice(0, 8)),
        h('span', { class: 'asa-muted', title: x.cwd ?? '' }, [x.project, x.cwd ? home(x.cwd) : null, live ? S.live : timeOf(x.at)].filter(Boolean).join(' · '))),
      live ? null : headArchive({ t: 'session', id: x.id }, (ns.data?.archive?.sessions ?? []).includes(x.id)));
    const thread = h('div', { class: 'asa-thread-box' },
      h('div', { class: 'asa-sys' }, S.sesNote),
      h('div', { class: 'asa-b you' }, h('div', { class: 'asa-b-text' }, x.prompt || x.title || x.id), h('small', {}, `${S.sesFirst} · ${timeOf(x.at)}`)));
    const comp = h('div', { class: 'asa-comp' });
    if (x.cwd) {
      const key = sel;
      const ta = h('textarea', { rows: '1', placeholder: live ? S.sesLive : S.sesContinueHint, 'aria-label': S.sesContinue });
      ta.value = getDraft(key);
      const attach = attachControls(ta, comp, () => { sendBtn.disabled = live || sendBusy() ; });
      const sendBusy = () => (!ta.value.trim() && !pendingImages().length) || !attach.ready();
      const sendBtn = h('button', { type: 'button', class: 'asa-send', title: S.sesSend, 'aria-label': S.sesSend }, '➤');
      const mode = h('select', { class: 'asa-chipsel', 'aria-label': S.mode }, ['auto', 'plan', 'report'].map((m) => h('option', { value: m }, S.chipModes[m])));
      // Continuing a session: by default on the model it was last answered with (when known), or pick another.
      const modelPick = h('select', { class: 'asa-chipsel', title: S.modelTip, 'aria-label': S.modelTip },
        x.model ? h('option', { value: x.model }, S.sesModelOrig(modelName(x.model))) : null, h('option', { value: '' }, S.sesModelDefault), MODEL_CHOICES.map(([v, t]) => h('option', { value: v }, `🧠 ${t}`)));
      modelPick.value = x.model ?? '';
      const commitBox = h('input', { type: 'checkbox', id: 'asa-commit-s' });
      const commitLab = h('label', { class: 'asa-chipsel', for: 'asa-commit-s', title: S.commitTip, style: { display: 'inline-flex', gap: '4px', alignItems: 'center' } }, commitBox, S.commitChip);
      const copy = h('button', { type: 'button', class: 'asa-chip', title: S.copyCmd }, S.sesCopy);
      copy.onclick = async () => { if (await copyText(terminalCommand({ cwd: x.cwd, sessionId: x.id }))) { copy.textContent = S.copiedSmall; setTimeout(() => { copy.textContent = S.sesCopy; }, 2000); } };
      const msg = h('div', { class: 'asa-note' }, live ? S.sesLive : '');
      const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`; };
      const send = async () => {
        const images = pendingImages();
        const text = ta.value.trim() || (images.length ? S.lookAtImages : '');
        if (!text || sendBtn.disabled) return;
        sendBtn.disabled = true;
        try {
          const { letter } = await api('POST', '/api/tasks', { agent: null, cwd: x.cwd, prompt: text, mode: mode.value, model: modelPick.value || undefined, commit: commitBox.checked, resumeSession: x.id, images });
          clearAtt();
          setDraft('', key);
          dropLetter();
          await ns.refreshData();
          fillSide();
          select(letter.id);
        } catch (err) { msg.textContent = errorText(err); sendBtn.disabled = live; }
      };
      sendBtn.disabled = live || sendBusy();
      sendBtn.onclick = send;
      ta.oninput = () => { setDraft(ta.value, key); grow(); sendBtn.disabled = live || sendBusy(); };
      ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
      comp.append(attach.strip, h('div', { class: 'asa-comp-box' }, ta, sendBtn), h('div', { class: 'asa-chips' }, attach.button, mode, modelPick, commitLab, copy), msg);
      setTimeout(grow, 0);
    }
    ui.main.replaceChildren(head, thread, comp);
  }

  function buildMain() {
    if (String(sel).startsWith('session:')) {
      const x = sessionOf(sel);
      return x ? showSession(x) : (sel = null, syncLayout(), buildMain());
    }
    ui.head = h('div', { class: 'asa-chat-head' });
    ui.thread = h('div', { class: 'asa-thread-box' });
    ui.comp = h('div', { class: 'asa-comp' });
    ui.keys = {};
    ui.main.replaceChildren(ui.head, ui.thread, ui.comp);
    if (!sel) return ui.main.append(h('p', { class: 'asa-muted', style: { padding: '16px' } }, S.pickChat));
    refreshMain(true);
    if (sel === 'new') {
      // The folder list comes from Claude Code's transcripts: look again each time New chat is shown (a session started since the panel opened).
      const had = options;
      api('GET', '/api/options').then((o) => {
        const changed = !had || JSON.stringify(o.projects) !== JSON.stringify(had.projects);
        options = o;
        if (sel === 'new' && changed) { ui.keys.comp = null; refreshMain(); }
      }).catch(() => { options ??= { error: true }; if (sel === 'new' && !had) refreshMain(); });
    }
    else if (!narrow()) ui.comp.querySelector('textarea')?.focus();
  }

  function refreshMain(force = false) {
    if (String(sel).startsWith('session:')) return; // a session's page is static
    if (!ui.head || !sel) return;
    const l = current();
    if (sel !== 'new' && !l) { sel = null; syncLayout(); return buildMain(); }
    // Header
    const headKey = JSON.stringify([sel, l?.status, l?.title, l?.cwd]);
    if (force || (ui.keys.head !== headKey && document.activeElement?.className !== 'asa-title-input')) {
      ui.keys.head = headKey;
      fillHead(l);
    }
    // Thread
    const threadKey = JSON.stringify([sel, l?.status, l?.thread?.length, l?.progress, l?.error, l?.cost, notice, options ? 1 : 0, l?.text?.length, (l?.denials ?? []).map((d) => d.id + d.state).join(), (l?.asks ?? []).map((d) => d.id + d.state).join(), l?.wt?.state, JSON.stringify(l?.wtSummary?.files ?? []).length, wtOpen.has(l?.id), [...exactOpen].join()]);
    if (force || ui.keys.thread !== threadKey) {
      ui.keys.thread = threadKey;
      const box = ui.thread;
      const stick = force || box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      fillThread(l);
      if (stick) box.scrollTop = box.scrollHeight;
    }
    // Composer (rebuilt only when what you can do changes, so typing is never interrupted)
    const compKey = JSON.stringify([sel, l ? (busy(l) ? 'busy' : l.status === 'awaiting' ? 'awaiting' : 'idle') : '', options ? (options.error ? 'err' : 'ok') : 'wait']);
    if (force || ui.keys.comp !== compKey) {
      ui.keys.comp = compKey;
      fillComposer(l);
    }
  }

  function fillHead(l) {
    const head = ui.head;
    const back = h('button', { type: 'button', class: 'asa-btn asa-back', onclick: () => { sel = null; syncLayout(); ui.refill?.(); }, 'aria-label': S.back }, '←');
    if (sel === 'new') return head.replaceChildren(back, h('div', { class: 'asa-chat-title' }, h('b', {}, S.newChat.replace(/^＋\s*/, '')), h('span', { class: 'asa-muted' }, S.newChatSub)));
    if (l.report) return head.replaceChildren(back, face(l), h('div', { class: 'asa-chat-title' }, h('b', {}, S.report), h('span', { class: 'asa-muted' }, l.day)), headArchive({ t: 'report', id: l.day }, !!l.archived));
    const m = staffFor(l);
    const titleBox = h('input', { class: 'asa-title-input', value: letterTitle(l), maxlength: '80', title: S.rename, 'aria-label': S.rename });
    titleBox.onchange = () => { if (titleBox.value.trim()) act(() => api('POST', `/api/tasks/${l.id}/rename`, { title: titleBox.value.trim() })); };
    const actions = h('div', { class: 'asa-head-actions' });
    if (busy(l)) actions.append(h('button', { type: 'button', class: 'asa-btn', title: S.stop, 'aria-label': S.stop, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/stop`)) }, '⏹'));
    const copy = h('button', { type: 'button', class: 'asa-btn', title: S.copyCmd, 'aria-label': S.copyCmd }, '📋');
    copy.onclick = async () => { if (await copyText(terminalCommand(l))) { copy.textContent = '✅'; setTimeout(() => { copy.textContent = '📋'; }, 2000); } };
    actions.append(copy);
    const leave = () => { sel = null; syncLayout(); buildMain(); };
    if (!busy(l) && l.archived) {
      actions.append(h('button', { type: 'button', class: 'asa-btn', title: S.unarchive, 'aria-label': S.unarchive, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/unarchive`), leave) }, '↩️'));
      const del = h('button', { type: 'button', class: 'asa-btn', title: S.deletePerm, 'aria-label': S.deletePerm }, '🗑');
      del.onclick = () => {
        if (del.dataset.sure) return act(() => api('DELETE', `/api/tasks/${l.id}`), leave);
        del.dataset.sure = '1';
        del.textContent = S.deleteSure;
        setTimeout(() => { delete del.dataset.sure; del.textContent = '🗑'; }, 4000);
      };
      actions.append(del);
    } else if (!busy(l)) actions.append(h('button', { type: 'button', class: 'asa-btn', title: S.archive, 'aria-label': S.archive, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/archive`), leave) }, '🗄'));
    head.replaceChildren(back, face(l), h('div', { class: 'asa-chat-title' }, titleBox,
      h('span', { class: 'asa-muted' }, [who(l), m ? ns.staffRole(m) : null, l.project, l.mode ? S.modeShort[l.mode] : null, l.commit ? S.commitShort : null, l.perm && l.perm !== 'manual' ? S.permShort[l.perm] : null, l.wt ? `🌿 ${l.wt.branch}` : null, l.usedModel || l.model ? `🧠 ${modelName(l.usedModel || l.model)}` : null, S[l.status]].filter(Boolean).join(' · '))), actions);
  }

  /** Calls the task tried that were refused automatically, each with a one-time "Izinkan sekali" when that's safe to offer. */
  const exactOpen = new Set(); // denial ids whose full command is being shown for confirmation
  function denialBlock(l) {
    const open = (l?.denials ?? []).filter((d) => d.state === 'open');
    if (!open.length || busy(l)) return null;
    const copy = (d, btn) => {
      const done = () => { btn.textContent = S.copied; setTimeout(() => { btn.textContent = S.copyCmd; }, 1800); };
      (navigator.clipboard?.writeText(d.cmd ?? d.text).then(done) ?? Promise.reject()).catch(() => {});
    };
    return h('div', { class: 'asa-deny' },
      h('div', { class: 'asa-deny-head' }, h('b', {}, S.denied(open.length)),
        open.length > 1 ? h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/allow`, { id: 'all', dismiss: true })) }, S.dismissAll) : null),
      open.map((d) => {
        const copyBtn = h('button', { type: 'button', class: 'asa-btn', title: d.cmd ?? d.text }, S.copyCmd);
        copyBtn.onclick = () => copy(d, copyBtn);
        const dismiss = h('button', { type: 'button', class: 'asa-btn', title: S.dismiss, 'aria-label': S.dismiss, onclick: () => { exactOpen.delete(d.id); act(() => api('POST', `/api/tasks/${l.id}/allow`, { id: d.id, dismiss: true })); } }, '✖');
        const row = h('div', { class: 'asa-deny-row' }, h('code', { title: d.cmd ?? d.text }, `${d.tool}${d.text ? `: ${d.text}` : ''}`),
          d.rule
            ? h('button', { type: 'button', class: 'asa-btn', title: d.rule, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/allow`, { id: d.id })) }, S.allowOnce)
            : d.exact?.length
              ? h('button', { type: 'button', class: 'asa-btn', onclick: () => { exactOpen.add(d.id); refreshMain(); } }, S.allowExact)
              : [h('small', {}, d.ro ? S.cantAllowRo : S.cantAllow), d.tool === 'Bash' ? copyBtn : null],
          dismiss);
        if (!exactOpen.has(d.id) || !d.exact?.length) return row;
        return h('div', { class: 'asa-deny-exact' }, row,
          h('div', { class: 'asa-muted' }, S.exactTitle), h('pre', {}, d.cmd),
          d.run !== d.cmd ? h('div', { class: 'asa-muted' }, `${S.exactRun} `, h('code', {}, d.run)) : null,
          h('div', { class: 'asa-deny-row' },
            h('button', { type: 'button', class: 'asa-btn primary', onclick: () => { exactOpen.delete(d.id); act(() => api('POST', `/api/tasks/${l.id}/allow`, { id: d.id, exact: true })); } }, S.exactYes),
            h('button', { type: 'button', class: 'asa-btn', onclick: () => { exactOpen.delete(d.id); refreshMain(); } }, S.exactNo)));
      }));
  }

  /** An answer's text as Markdown (bold, lists, code, tables…). Remote images become links so an answer can't make the page fetch a URL by itself. */
  function mdText(text) {
    const el = h('div', { class: 'asa-b-text' });
    if (!ns.markdown) { el.textContent = text; return el; }
    try { ns.markdown.render(el, String(text ?? '').replace(/!\[([^\]]*)\]\((https?:[^)\s]*)\)/gi, '[$1]($2)')); } catch { el.textContent = text; }
    return el;
  }
  function fillThread(l) {
    const box = ui.thread;
    const out = [];
    if (sel === 'new') {
      const first = memberOf(prefs.agent ?? '')?.name ?? '';
      out.push(h('div', { class: 'asa-brow' }, smallFace({ agent: options?.staff?.find((x) => x.director)?.agent ?? null }), h('div', { class: 'asa-b agent' }, h('div', { class: 'asa-b-text' }, S.greeting(first)))));
      out.push(h('div', { class: 'asa-suggest' }, S.suggestions.map((t) => h('button', { type: 'button', class: 'asa-chip', onclick: () => { setDraft(t); fillComposer(null); ui.comp.querySelector('textarea')?.focus(); } }, t))));
    } else if (l.report) {
      out.push(h('div', { class: 'asa-b agent' }, mdText(l.text)));
    } else {
      const thread = l.thread ?? [];
      const lastAgent = thread.map((m, i) => (m.from === 'agent' ? i : -1)).filter((i) => i >= 0).pop();
      thread.forEach((m, i) => {
        if (m.from === 'you' && (m.kind === 'allow' || m.kind === 'switch')) return out.push(h('div', { class: 'asa-sys' }, m.text));
        if (m.from === 'you' && ['approve', 'reject', 'revise'].includes(m.kind)) {
          return out.push(h('div', { class: 'asa-sys' }, m.kind === 'approve' ? S.approvedNote : m.kind === 'reject' ? S.rejectedNote : `${S.revisedNote}: ${m.text}`));
        }
        if (m.from === 'you') return out.push(h('div', { class: 'asa-b you' }, h('div', { class: 'asa-b-text' }, m.text), imageStripFor(m.images), h('small', {}, timeOf(m.at))));
        if (m.kind === 'meeting') { // a turn of a real team meeting: the speaker's face and name
          const sp = memberOf(m.agent);
          return out.push(h('div', { class: 'asa-brow' }, smallFace({ agent: m.agent }), h('div', { class: 'asa-b agent meeting' }, h('em', {}, `🗣 ${m.name ?? sp?.name ?? ''}${m.round ? ` · ${S.meetRound(m.round)}` : ''}`), mdText(m.text), h('small', {}, timeOf(m.at)))));
        }
        const plan = m.kind === 'plan';
        const label = plan ? S.planLabel : isDirector(l.agent) && m.kind ? S.reportLabel : null;
        out.push(h('div', { class: 'asa-brow' }, smallFace(l),
          h('div', { class: `asa-b agent${plan ? ' plan' : ''}` }, label ? h('em', {}, label) : null, mdText(m.text), imageStrip(m.text, l.cwd), h('small', {}, `${who(l)} · ${timeOf(m.at)}`))));
        if (plan && l.status === 'awaiting' && i === lastAgent) {
          if (l.kind === 'tidy') out.push(tidyBlock(l));
          const yes = h('button', { type: 'button', class: 'asa-btn primary' }, S.approve);
          yes.onclick = () => approve(l, yes);
          out.push(h('div', { class: 'asa-actions asa-plan-actions' }, yes,
            h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/reject`)) }, S.reject),
            h('span', { class: 'asa-muted' }, S.reviseHint)));
        }
      });
      const batches = l.kind === 'tidy' ? l.tidy?.batches ?? (l.tidy?.applied ? [{ applied: l.tidy.applied, undone: l.tidy.undone }] : []) : [];
      const lastBatch = batches.filter((b) => b.applied?.length).pop();
      if (lastBatch && !busy(l) && l.status === 'done') {
        out.push(h('div', { class: 'asa-tidy' }, ...lastBatch.applied.slice(0, 200).map((a) => h('div', { class: 'asa-muted' }, `${a.file} → ${a.to}${a.name !== a.file ? ` (${a.name})` : ''}`))));
        out.push(lastBatch.undone
          ? h('div', { class: 'asa-sys' }, S.tidyUndone)
          : h('div', { class: 'asa-actions asa-plan-actions' }, h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/undo`)) }, S.tidyUndo)));
      }
      for (const a of (l.asks ?? []).filter((x) => x.state === 'open')) out.push(askCard(l, a));
      if (l.wt?.state === 'open' && !busy(l)) out.push(wtCard(l));
      const deny = denialBlock(l);
      if (deny) out.push(deny);
      if (l.status === 'queued') out.push(h('div', { class: 'asa-sys' }, S.queuedNote(isDirector(l.agent) ? '' : l.name ?? '')));
      if (l.status === 'running') out.push(h('div', { class: 'asa-working', role: 'status' }, h('span', { class: 'asa-dots' }, h('i'), h('i'), h('i')), h('span', { class: 'asa-working-t' }, `${l.name ?? S.general} · ${progressText(l).replace(/^⏳\s*/, '')}`)));
      if (l.error) out.push(h('div', { class: 'asa-warn' }, l.error));
      if (l.cost) out.push(h('div', { class: 'asa-note' }, S.cost(l.cost)));
    }
    if (notice) out.push(h('div', { class: 'asa-warn' }, notice));
    box.replaceChildren(...out);
  }

  const PERMS = ['manual', 'acceptEdits', 'auto', 'bypass', 'strict'];
  /** The permission-mode chip. Choosing Bypass the first time asks (inline, no browser dialog) before switching it on in the office. */
  function permSelect(initial, chips, onPick) {
    const sel2 = h('select', { class: 'asa-chipsel', title: S.permTip, 'aria-label': S.permTip }, PERMS.map((v) => h('option', { value: v }, S.permChips[v])));
    let last = PERMS.includes(initial) && !(initial === 'bypass' && !options?.perms?.bypass) ? initial : 'manual';
    sel2.value = last;
    sel2.onchange = () => {
      if (sel2.value !== 'bypass' || options?.perms?.bypass) { last = sel2.value; onPick?.(last); return; }
      const bar = h('div', { class: 'asa-permbar', role: 'alert' }, h('span', {}, S.permBypassAsk));
      const close = () => { bar.remove(); sel2.value = last; };
      const yes = h('button', { type: 'button', class: 'asa-btn primary' }, S.permBypassYes);
      yes.onclick = async () => {
        try { options = { ...options, perms: (await api('POST', '/api/settings', { allowBypass: true })).perms }; } catch { return close(); }
        bar.remove();
        last = 'bypass';
        sel2.value = 'bypass';
        onPick?.(last);
      };
      bar.append(yes, h('button', { type: 'button', class: 'asa-btn', onclick: close }, S.permBypassNo));
      chips.parentElement?.insertBefore(bar, chips) ?? chips.before(bar);
    };
    return sel2;
  }
  const wtOpen = new Set(); // letters whose "view changes" is open
  const wtDiffs = new Map(); // letter id -> diff text
  /** The result of a task that worked on its own branch: what changed, and merge / PR / discard. */
  function wtCard(l) {
    const w = l.wt;
    const sm = l.wtSummary;
    const sure = (btn, label, sureLabel, fn) => {
      btn.onclick = () => {
        if (btn.dataset.sure) return fn();
        btn.dataset.sure = '1';
        btn.textContent = sureLabel;
        setTimeout(() => { delete btn.dataset.sure; btn.textContent = label; }, 4500);
      };
      return btn;
    };
    const post = (action) => act(() => api('POST', `/api/tasks/${l.id}/wt`, { action }));
    const view = h('button', { type: 'button', class: 'asa-btn' }, wtOpen.has(l.id) ? S.wtHide : S.wtView);
    view.onclick = async () => {
      if (wtOpen.has(l.id)) wtOpen.delete(l.id);
      else {
        wtOpen.add(l.id);
        try { wtDiffs.set(l.id, (await api('GET', `/api/tasks/${l.id}/diff`)).diff || S.wtNone); } catch (err) { wtDiffs.set(l.id, errorText(err)); }
      }
      refreshMain(true);
    };
    const files = sm?.files ?? [];
    return h('div', { class: 'asa-wt' },
      h('b', {}, S.wtTitle(w.branch)),
      h('div', { class: 'asa-muted' }, sm && (files.length || sm.commits) ? S.wtFiles(files.length, sm.insertions, sm.deletions, sm.commits) : S.wtNone),
      files.length ? h('div', { class: 'asa-muted' }, files.slice(0, 8).map((f) => `${f.path} (+${f.add} −${f.del})`).join(' · ') + (files.length > 8 ? ' …' : '')) : null,
      wtOpen.has(l.id) ? h('pre', {}, wtDiffs.get(l.id) ?? '…') : null,
      h('div', { class: 'asa-ask-row' },
        h('button', { type: 'button', class: 'asa-btn primary', onclick: () => post('merge') }, S.wtMerge(w.baseBranch)),
        sure(h('button', { type: 'button', class: 'asa-btn' }, S.wtPr), S.wtPr, S.wtPrSure, () => post('pr')),
        view,
        sure(h('button', { type: 'button', class: 'asa-btn' }, S.wtDiscard), S.wtDiscard, S.wtDiscardSure, () => post('discard'))));
  }
  /** A permission question from a running task:  /** A permission question from a running task: the whole command, and the buttons to answer it. */
  function askCard(l, a) {
    const answer = (decision) => act(() => api('POST', `/api/tasks/${l.id}/ask`, { id: a.id, decision }));
    return h('div', { class: 'asa-ask', role: 'alert' },
      h('b', {}, `🔐 ${S.askTitle}: ${a.tool}`),
      h('pre', {}, a.text || a.tool),
      h('div', { class: 'asa-ask-row' },
        h('button', { type: 'button', class: 'asa-btn primary', onclick: () => answer('allow') }, S.askAllow),
        a.always ? h('button', { type: 'button', class: 'asa-btn', onclick: () => answer('always') }, S.askAlways) : null,
        h('button', { type: 'button', class: 'asa-btn', onclick: () => answer('deny') }, S.askDeny)));
  }

  function fillComposer(l) {
    const comp = ui.comp;
    comp.replaceChildren();
    if (sel !== 'new' && l?.report) return;
    if (sel === 'new') {
      if (!options) return comp.append(h('p', { class: 'asa-muted' }, '…'));
      if (options.error) return comp.append(h('div', { class: 'asa-warn' }, S.noApi));
      if (!options.claude) return comp.append(h('div', { class: 'asa-warn' }, S.noClaude));
      if (!options.projects.length) return comp.append(h('div', { class: 'asa-warn' }, S.noProject));
    }
    const existing = sel !== 'new';
    const locked = existing && busy(l);
    const ta = h('textarea', { rows: '2', 'aria-label': S.task,
      placeholder: locked ? S.busyPh(l.name ?? S.general) : existing ? (l.status === 'awaiting' ? S.revisePh : S.replyPh) : S.placeholder });
    ta.value = locked ? '' : getDraft();
    ta.disabled = locked;
    const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight + 2, 150)}px`; };
    const send = h('button', { type: 'button', class: 'asa-send', title: S.send, 'aria-label': S.send }, '➤');
    const attach = locked || (existing && l?.report) ? null : attachControls(ta, comp, () => sync());
    const sync = () => { send.disabled = locked || (!ta.value.trim() && !pendingImages().length) || (attach && !attach.ready()) || sending; };
    ta.oninput = () => { setDraft(ta.value); grow(); sync(); updateMention(); };
    const controls = {};
    const submit = () => (existing ? sendReply(l, ta, send, controls) : sendNew(ta, send, controls));
    // @name in a new chat picks who does it (a small list above the box, like a chat app's mentions).
    const mention = { open: false, idx: 0, items: [], start: -1 };
    const pop = h('div', { class: 'asa-mention', role: 'listbox' });
    pop.hidden = true;
    function closeMention() { mention.open = false; pop.hidden = true; }
    function drawMention() {
      pop.replaceChildren(...mention.items.map((it, i) => h('button', { type: 'button', role: 'option', class: i === mention.idx ? 'on' : '',
        onmousedown: (e) => { e.preventDefault(); chooseMention(i); } }, h('b', {}, `@${it.name}`), it.role ? h('span', {}, ` ${it.role}`) : null)));
      pop.hidden = !mention.items.length;
    }
    function updateMention() {
      if (existing || !controls.setWho) return closeMention();
      const before = ta.value.slice(0, ta.selectionStart ?? ta.value.length);
      const m = /(^|\s)@([\p{L}\d_-]*)$/u.exec(before);
      if (!m) return closeMention();
      const q = m[2].toLowerCase();
      mention.start = before.length - m[2].length - 1;
      const all = [...options.staff.map((x) => ({ agent: x.agent, name: x.name, role: pickLang(x.role) })), { agent: '', name: S.general, role: '' }];
      mention.items = all.filter((x) => !q || x.name.toLowerCase().startsWith(q) || x.agent.startsWith(q));
      mention.idx = Math.min(mention.idx, Math.max(0, mention.items.length - 1));
      mention.open = mention.items.length > 0;
      drawMention();
    }
    function chooseMention(i) {
      const it = mention.items[i];
      if (!it) return;
      const end = ta.selectionStart ?? ta.value.length;
      ta.value = `${ta.value.slice(0, mention.start)}${ta.value.slice(end).replace(/^\s/, '')}`;
      ta.setSelectionRange(mention.start, mention.start);
      controls.setWho(it.agent);
      setDraft(ta.value);
      closeMention();
      grow();
      sync();
      ta.focus();
    }
    ta.onkeydown = (e) => {
      if (mention.open) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          mention.idx = (mention.idx + (e.key === 'ArrowDown' ? 1 : -1) + mention.items.length) % mention.items.length;
          return drawMention();
        }
        if ((e.key === 'Enter' || e.key === 'Tab') && !e.isComposing) { e.preventDefault(); return chooseMention(mention.idx); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return closeMention(); } // don't close the whole panel
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!send.disabled) submit(); }
    };
    ta.onkeyup = (e) => { if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) updateMention(); };
    ta.onblur = () => setTimeout(closeMention, 150);
    send.onclick = submit;
    const chips = h('div', { class: 'asa-chips' });
    if (!existing) {
      const staff = options.staff;
      const whoSel = h('select', { class: 'asa-chipsel', title: S.who, 'aria-label': S.who }, h('option', { value: '' }, `👤 ${S.general}`),
        staff.map((m) => h('option', { value: m.agent }, `👤 ${m.name}`)));
      whoSel.value = staff.some((m) => m.agent === prefs.agent) || prefs.agent === '' ? prefs.agent : staff.find((m) => m.director)?.agent ?? '';
      const projSel = h('select', { class: 'asa-chipsel', title: S.project, 'aria-label': S.project }, options.projects.map((p) => h('option', { value: p.cwd, title: p.cwd }, `📁 ${p.name}`)));
      if (options.downloads) projSel.append(h('option', { value: '@downloads', title: '~/Downloads' }, `📥 ${S.dlName}`));
      projSel.value = options.projects.some((p) => p.cwd === prefs.cwd) || (options.downloads && prefs.cwd === '@downloads') ? prefs.cwd : options.projects[0].cwd;
      const modeSel = h('select', { class: 'asa-chipsel', title: S.mode, 'aria-label': S.mode });
      const modelSel = h('select', { class: 'asa-chipsel', title: S.modelTip, 'aria-label': S.modelTip }, h('option', { value: '' }, S.modelDefault), MODEL_CHOICES.map(([v, t]) => h('option', { value: v }, `🧠 ${t}`)));
      modelSel.value = MODEL_CHOICES.some(([v]) => v === prefs.model) ? prefs.model : '';
      modelSel.onchange = () => { prefs.model = modelSel.value; savePrefs(); };
      const permSel = permSelect(prefs.perm, chips, (v) => { prefs.perm = v; savePrefs(); });
      const isoSel = h('select', { class: 'asa-chipsel', title: S.isoTip, 'aria-label': S.isoTip }, Object.entries(S.isoChips).map(([v, t]) => h('option', { value: v }, t)));
      isoSel.value = prefs.iso === 'on' ? 'on' : 'off';
      isoSel.onchange = () => { prefs.iso = isoSel.value; savePrefs(); };
      const styleSel = h('select', { class: 'asa-chipsel', title: S.style, 'aria-label': S.style }, Object.entries(S.chipStyles).map(([v, t]) => h('option', { value: v }, t)));
      styleSel.value = prefs.style ?? 'solo';
      const commitBox = h('input', { type: 'checkbox', id: 'asa-commit' });
      const commitLab = h('label', { class: 'asa-chipsel', for: 'asa-commit', title: S.commitTip, style: { display: 'inline-flex', gap: '4px', alignItems: 'center' } }, commitBox, S.commitChip);
      const member = () => staff.find((m) => m.agent === whoSel.value) ?? null;
      const defaultMode = () => prefs.modes?.[whoSel.value] ?? (member()?.director ? 'plan' : 'auto');
      // "Rapat dulu" (a real team meeting) is Shades' alone: the others don't get that option.
      const fillModes = () => {
        const cur = modeSel.value;
        const want = Object.keys(S.chipModes).filter((v) => v !== 'meeting' || member()?.director);
        modeSel.replaceChildren(...want.map((v) => h('option', { value: v }, S.chipModes[v])));
        if (want.includes(cur)) modeSel.value = cur;
      };
      const isDl = () => projSel.value === '@downloads';
      // The Downloads folder is one mode: ask anything, or ask for a tidy-up (the office moves files only after you approve the plan).
      const syncDl = () => {
        const dl = isDl();
        if (modeSel.dataset.dl !== String(dl)) {
          modeSel.dataset.dl = String(dl);
          fillModes();
          if (!dl) modeSel.value = defaultMode();
        }
        for (const el of [modeSel, whoSel, commitLab, permSel, isoSel]) el.style.display = dl ? 'none' : '';
        styleSel.style.display = !dl && member()?.director ? '' : 'none';
        ta.placeholder = dl ? S.dlPh : S.placeholder;
      };
      const update = () => {
        fillModes();
        if (!isDl()) modeSel.value = defaultMode();
        styleSel.style.display = member()?.director ? '' : 'none';
        const access = member()?.access ?? options.general?.access ?? ['read'];
        whoSel.title = `${S.who} — ${S.canDo(access.map((a) => S.access[a] ?? a).join(', '))}`;
      };
      whoSel.onchange = () => { prefs.agent = whoSel.value; savePrefs(); update(); syncDl(); };
      const setWho = (agent) => {
        whoSel.value = agent;
        prefs.agent = agent;
        savePrefs();
        update();
        syncDl();
        whoSel.classList.remove('asa-flash');
        void whoSel.offsetWidth; // restart the animation
        whoSel.classList.add('asa-flash');
      };
      projSel.onchange = () => { prefs.cwd = projSel.value; savePrefs(); syncDl(); };
      modeSel.onchange = () => { prefs.modes = { ...prefs.modes, [whoSel.value]: modeSel.value }; savePrefs(); modeSel.title = modeSel.value === 'meeting' ? S.meetTip : S.mode; };
      styleSel.onchange = () => { prefs.style = styleSel.value; savePrefs(); };
      update();
      syncDl();
      Object.assign(controls, { whoSel, projSel, modeSel, modelSel, permSel, isoSel, styleSel, commitBox, member, setWho });
      chips.append(whoSel, projSel, modeSel, modelSel, permSel, isoSel, styleSel, commitLab);
    } else {
      const swappable = !l.readOnlyDir && l.kind !== 'tidy' && !locked;
      if (!swappable) {
        chips.append(h('span', { class: 'asa-pill' }, `👤 ${who(l)}`), h('span', { class: 'asa-pill', title: l.cwd }, `📁 ${l.project}`), l.mode ? h('span', { class: 'asa-pill' }, S.chipModes[l.mode]) : null);
      } else {
        // Between replies everything but the folder can change (each reply is a new run that continues the same session; a session lives in its folder).
        const staff = options?.staff ?? [];
        const whoSel = h('select', { class: 'asa-chipsel', title: S.who, 'aria-label': S.who }, h('option', { value: '' }, `👤 ${S.general}`), staff.map((m) => h('option', { value: m.agent }, `👤 ${m.name}`)));
        whoSel.value = staff.some((m) => m.agent === l.agent) ? l.agent : '';
        const mode0 = l.mode === 'report' ? 'report' : l.phase === 'plan' ? 'plan' : 'auto';
        const modeSel = h('select', { class: 'asa-chipsel', title: S.mode, 'aria-label': S.mode }, ['plan', 'auto', 'report'].map((v) => h('option', { value: v }, S.chipModes[v])));
        modeSel.value = mode0;
        const modelSel = h('select', { class: 'asa-chipsel', title: S.modelTip, 'aria-label': S.modelTip }, h('option', { value: '' }, S.modelDefault), MODEL_CHOICES.map(([v, t]) => h('option', { value: v }, `🧠 ${t}`)));
        modelSel.value = MODEL_CHOICES.some(([v]) => v === l.model) ? l.model : '';
        const styleSel = h('select', { class: 'asa-chipsel', title: S.style, 'aria-label': S.style }, Object.entries(S.chipStyles).map(([v, t]) => h('option', { value: v }, t)));
        styleSel.value = l.style === 'delegate' ? 'delegate' : 'solo';
        const showStyle = () => { styleSel.style.display = staff.find((m) => m.agent === whoSel.value)?.director ? '' : 'none'; };
        whoSel.onchange = showStyle;
        showStyle();
        Object.assign(controls, { whoSel, modeSel, modelSel, styleSel });
        chips.append(whoSel, h('span', { class: 'asa-pill', title: `${l.cwd}\n${S.folderLocked}` }, `📁 ${l.project}`), modeSel, modelSel, styleSel);
      }
      // The permission mode can be changed between replies (it applies to the next run), except in Downloads where it is read-only anyway.
      if (!l.readOnlyDir && l.kind !== 'tidy' && !locked) { controls.permSel = permSelect(l.perm, chips, null); chips.append(controls.permSel); }
    }
    const sendBtn = locked
      ? h('button', { type: 'button', class: 'asa-send stop', title: S.stop, 'aria-label': S.stop, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/stop`)) }, '⏹')
      : send;
    if (attach) { chips.prepend(attach.button); comp.append(pop, attach.strip, h('div', { class: 'asa-comp-box' }, ta, sendBtn), chips); }
    else comp.append(pop, h('div', { class: 'asa-comp-box' }, ta, sendBtn), chips);
    grow();
    sync();
  }

  // ── Sending ──
  const UNDO_MS = 3000;
  /** A bar with "Batalkan" for UNDO_MS; resolves 'undo' if clicked, else 'go' (also if you leave the chat or close the panel). */
  function undoWindow() {
    return new Promise((resolve) => {
      let timer = null;
      const btn = h('button', { type: 'button', class: 'asa-btn' }, S.undo);
      const bar = h('div', { class: 'asa-undo', role: 'status' }, h('span', {}, S.sentUndo), btn, h('i', { class: 'asa-undo-bar', style: { animationDuration: `${UNDO_MS}ms` } }));
      const done = (v) => {
        if (pendingUndo !== done) return;
        pendingUndo = null;
        clearTimeout(timer);
        bar.remove();
        resolve(v);
      };
      pendingUndo = done;
      btn.onclick = () => done('undo');
      if (ui.main?.isConnected && ui.comp?.parentNode === ui.main) ui.main.insertBefore(bar, ui.comp);
      timer = setTimeout(() => done('go'), UNDO_MS);
    });
  }

  async function sendNew(ta, sendBtn, c) {
    const images = pendingImages();
    const text = ta.value.trim() || (images.length ? S.lookAtImages : '');
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    notice = '';
    const agent = c.whoSel.value;
    const member = c.member();
    const director = !!member?.director;
    const cwd = c.projSel.value;
    ns.notify?.sfx?.('send');
    const landed = flyPlane(sendBtn);
    ta.disabled = true;
    if (cwd === '@downloads') return sendDownloads(text, landed, c.modelSel.value);
    try {
      const { letter } = await api('POST', '/api/tasks', {
        agent: agent || null, cwd, prompt: text, mode: c.modeSel.value, model: c.modelSel.value || undefined, perm: c.permSel.value, isolate: c.isoSel.value === 'on' || undefined, style: director ? c.styleSel.value : undefined, commit: c.commitBox.checked, images, hold: true,
      });
      await landed;
      dropLetter();
      // A few seconds to change your mind: the letter is only queued, so nothing has started yet.
      if (panel && (await undoWindow()) === 'undo') {
        try { await api('DELETE', `/api/tasks/${letter.id}`); } catch { /* the hold expires by itself */ }
        await ns.refreshData();
        return;
      }
      setDraft('', 'new');
      clearAtt();
      // Shades takes the letter from the mailbox and hands it over; the task starts when he does (or right away).
      const deliver = async () => {
        if (director) ns.director?.expect({ cwd: letter.cwd, prompt: text, meeting: letter.mode !== 'meeting' }); // a real meeting is played from the letter itself
        try { await api('POST', `/api/tasks/${letter.id}/deliver`); } catch { /* the server starts it by itself after 30 s */ }
        // The office learns who runs the new session from the data feed: look a few times so the face is right early.
        for (const ms of [0, 2500, 5000]) setTimeout(() => ns.refreshData(), ms);
      };
      const walking = ns.director?.courier?.({ agent: agent || null, name: member?.name ?? '', deliver });
      if (!walking) await deliver();
      await ns.refreshData();
      sel = letter.id;
      if (walking && panel) setTimeout(() => ns.panel.close(), 500); // leave the office in view to watch him go
      else select(letter.id);
    } catch (err) {
      await landed;
      notice = errorText(err);
    } finally {
      sending = false;
      if (panel) { ui.keys.comp = null; refreshMain(); }
    }
  }
  async function sendReply(l, ta, sendBtn, controls = {}) {
    const images = pendingImages();
    const text = ta.value.trim() || (images.length ? S.lookAtImages : '');
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    notice = '';
    ns.notify?.sfx?.('send');
    const landed = flyPlane(sendBtn);
    try {
      await api('POST', `/api/tasks/${l.id}/reply`, { text, images, perm: controls.permSel?.value, ...(controls.whoSel ? { agent: controls.whoSel.value, mode: controls.modeSel.value, model: controls.modelSel.value, style: controls.styleSel.value } : {}) });
      clearAtt();
      setDraft('', l.id);
      if (isDirector(controls.whoSel ? controls.whoSel.value : l.agent)) ns.director?.expect({ cwd: l.cwd });
      await landed;
      dropLetter();
    } catch (err) {
      await landed;
      notice = errorText(err);
    }
    await ns.refreshData();
    sending = false;
    if (panel) { ui.keys.comp = null; refreshMain(); }
  }
  /** The files a "Rapikan Downloads" plan would move, each with a tick the Commissioner can remove. */
  const tidyOff = new Map(); // letter id -> indexes left unticked
  function tidyBlock(l) {
    const off = tidyOff.get(l.id) ?? new Set();
    tidyOff.set(l.id, off);
    const moves = l.tidy?.moves ?? [];
    return h('div', { class: 'asa-tidy' }, h('b', {}, S.tidyMoves(moves.length)),
      ...moves.map((m, i) => {
        const box = h('input', { type: 'checkbox' });
        box.checked = !off.has(i);
        box.onchange = () => { if (box.checked) off.delete(i); else off.add(i); };
        return h('label', {}, box, h('span', { class: 'f' }, m.file), h('span', { class: 'to' }, `${S.tidyTo} ${m.to}`), m.why ? h('small', {}, m.why) : null);
      }));
  }
  /** A question or tidy-up request about Downloads: Claude reads, and any moves it proposes wait for your approval. */
  async function sendDownloads(text, landed, model = '') {
    try {
      const { letter } = await api('POST', '/api/tidy', { prompt: text === S.lookAtImages ? '' : text, model: model || undefined, hold: true });
      await landed;
      dropLetter();
      // Same as any new task: a few seconds to change your mind, then Shades carries the letter from the mailbox.
      if (panel && (await undoWindow()) === 'undo') {
        try { await api('DELETE', `/api/tasks/${letter.id}`); } catch { /* the hold expires by itself */ }
        await ns.refreshData();
        return;
      }
      setDraft('', 'new');
      clearAtt();
      const deliver = async () => {
        try { await api('POST', `/api/tasks/${letter.id}/deliver`); } catch { /* the server starts it by itself after 30 s */ }
        for (const ms of [0, 2500, 5000]) setTimeout(() => ns.refreshData(), ms);
      };
      const walking = ns.director?.courier?.({ agent: null, name: '', deliver });
      if (!walking) await deliver();
      await ns.refreshData();
      sel = letter.id;
      if (walking && panel) setTimeout(() => ns.panel.close(), 500);
      else select(letter.id);
    } catch (err) {
      await landed;
      notice = err.message === 'downloads' ? S.tidyNoFolder : errorText(err);
    } finally {
      sending = false;
    }
    await ns.refreshData();
    if (panel) { ui.keys.comp = null; refreshMain(); }
  }
  async function approve(l, btn) {
    btn.disabled = true;
    ns.notify?.sfx?.('send');
    const landed = flyPlane(btn);
    try {
      await api('POST', `/api/tasks/${l.id}/approve`, l.kind === 'tidy' ? { exclude: [...(tidyOff.get(l.id) ?? [])] } : undefined);
      if (isDirector(l.agent)) ns.director?.expect({ cwd: l.cwd });
      await landed;
      dropLetter();
    } catch (err) {
      await landed;
      notice = errorText(err);
    }
    await ns.refreshData();
    if (panel) refreshMain();
  }

  async function act(fn, after) {
    notice = '';
    try {
      await fn();
    } catch (err) {
      notice = errorText(err);
    }
    await ns.refreshData();
    if (after) after();
    ui.refill?.();
    if (panel) refreshMain(true);
  }

  function markRead(l) {
    if (l.read) return;
    l.read = true;
    if (l.report) {
      readReports.add(l.day);
      ns.store.set('readReports', JSON.stringify([...readReports].slice(-30)));
    } else {
      api('POST', `/api/tasks/${l.id}/read`).catch(() => {});
    }
  }

  // ── The panel ──
  function render(body) {
    ui.root = h('div', { class: 'asa-chat' });
    ui.side = h('aside', { class: 'asa-side' });
    ui.main = h('section', { class: 'asa-main' });
    ui.root.append(ui.side, ui.main);
    body.append(ui.root);
    fillSide();
    syncLayout();
    buildMain();
  }
  function refreshAll() {
    if (!panel || !ns.panel.isOpen) return;
    ui.refill?.();
    refreshMain();
  }
  function open(next = {}) {
    if (!document.getElementById('asa-mail-css')) document.head.appendChild(h('style', { id: 'asa-mail-css' }, css));
    notice = '';
    options = null;
    sending = false;
    if (next.name === 'compose' || next === 'new') sel = 'new';
    else if (next.name === 'letter') sel = next.id;
    else sel = narrow() ? null : (letters().find((l) => l.status === 'awaiting' && !l.archived) ?? letters().find((l) => !l.read && !l.report && !l.archived && !busy(l)))?.id ?? 'new';
    if (next.text) setDraft(next.text, 'new');
    let timer = null;
    panel = ns.panel.open({ theme: 'cozy', dock: 'hud', title: `📮 ${S.title}`, render, onClose: () => { pendingUndo?.('go'); flushDrafts(); clearInterval(timer); panel = null; } });
    panel.el.classList.add('asa-wide', 'asa-plain');
    ns.refreshData().then(refreshAll);
    // While open, keep running tasks' chats fresh (the composer is never rebuilt while you type).
    timer = setInterval(() => ns.refreshData().then(refreshAll), 4000);
  }
  ns.onFurnitureClick('COZY_MAILBOX', () => open());
  ns.mailbox = {
    clearDenials: async () => { try { await api('POST', '/api/denials/clear'); } catch { /* the task server is off */ } await ns.refreshData(); },
    open, compose: (text) => open({ name: 'compose', text }), unread,
    /** For inbound.js: a paper plane from any element to the mailbox on the wall, and the thud when it lands. */
    flyPlane, dropLetter,
    /** From the HUD: answer a permission question of a running task ('allow' | 'always' | 'deny'). */
    answerAsk: async (id, askId, decision) => { try { await api('POST', `/api/tasks/${id}/ask`, { id: askId, decision }); } catch { /* it was answered or the task ended */ } await ns.refreshData(); },
    /** From the HUD: approve or reject a waiting plan, or open the letter. */
    approve: (l, btn) => (l.kind === 'tidy' ? open({ name: 'letter', id: l.id }) : approve(l, btn)), // moving files is approved with the list in view
    reject: (l) => act(() => api('POST', `/api/tasks/${l.id}/reject`)),
    openLetter: (id) => open({ name: 'letter', id }),
  };

  // ── A letter drops into the mailbox ──
  function drawDrop(ctx, offX, offY, zoom) {
    const age = performance.now() - fx.drop;
    if (!fx.drop || age > 900) return;
    const k = age / 900;
    const u = Math.max(1, Math.round(zoom));
    for (const f of ns.findFurniture('COZY_MAILBOX')) {
      const cx = offX + (f.col * 16 + 8) * zoom;
      const top = offY + f.row * 16 * zoom;
      const y = Math.round(top - 12 * zoom + Math.min(1, k * 2) * 12 * zoom); // the envelope falls in during the first half
      ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      ctx.fillStyle = '#2b1a10';
      ctx.fillRect(Math.round(cx - 6 * u), y - u, 12 * u, 9 * u);
      ctx.fillStyle = '#fff6dc';
      ctx.fillRect(Math.round(cx - 5 * u), y, 10 * u, 7 * u);
      ctx.fillStyle = '#c8503c';
      for (let i = 0; i < 5; i++) { ctx.fillRect(Math.round(cx - 5 * u) + i * u, y + i * u, u, u); ctx.fillRect(Math.round(cx + 4 * u) - i * u, y + i * u, u, u); }
      ctx.fillStyle = '#f2c94c';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const r = (5 + 12 * k) * zoom;
        ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(top + 8 * zoom + Math.sin(a) * r), 2 * u, 2 * u);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Badge + notifications ──
  const lastStatus = new Map();
  let lastPoll = 0;
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    // Poll faster while a task is running, so the chime comes soon after it finishes.
    const mail = ns.data?.mail ?? [];
    if (mail.some((l) => l.status === 'running') && performance.now() - lastPoll > 5000) {
      lastPoll = performance.now();
      ns.refreshData();
    }
    for (const l of mail) {
      const prev = lastStatus.get(l.id);
      if ((prev === 'running' || prev === 'queued') && l.status !== 'running' && l.status !== 'queued') {
        const name = l.name ?? S.general;
        const first = (l.thread?.[0]?.text ?? '').slice(0, 40);
        const ok = l.status === 'done' || l.status === 'awaiting';
        ns.notify?.message?.({
          icon: l.status === 'awaiting' ? '📝' : ok ? '📬' : '⚠️',
          title: l.status === 'awaiting' ? S.planReady(name) : ok ? S.finished(name, first) : S.failedTask(name),
          body: S.openBox, kind: ok ? 'done' : 'permission',
        });
      }
      lastStatus.set(l.id, l.status);
    }
    if (editMode) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawDrop(ctx, offX, offY, zoom);
    const n = unread();
    if (!n) return void ctx.restore();
    for (const f of ns.findFurniture('COZY_MAILBOX')) {
      const x = offX + (f.col * 16 + 14) * zoom;
      const y = offY + (f.row * 16 + 3) * zoom;
      ctx.fillStyle = '#c8503c';
      ctx.strokeStyle = '#fff6dc';
      ctx.lineWidth = Math.max(1, zoom * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, 4.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff6dc';
      ctx.font = `${Math.round(6.5 * zoom)}px "FS Pixel Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n > 9 ? '9+' : String(n), x, y + zoom * 0.5);
    }
    ctx.restore();
  });
})();
