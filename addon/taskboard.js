// asaoffice task board: click the cork board on the wall to see what every Claude session from the
// last day is working on, as pinned "quests": session title, your last prompt, project, today's tool
// calls and edited files, which villagers are on it right now, and its to-do list when the session
// keeps one (TodoWrite). A badge on the board counts the sessions working right now.
// Data comes from `npm run office` (tools/lib/claude-stats.mjs → tasks()).
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Papan Tugas', newTask: '✉️ Kirim tugas baru', empty: 'Belum ada pekerjaan dalam 24 jam terakhir.', untitled: 'Sesi tanpa judul',
      tools: (n) => `${n} tool hari ini`, files: (n) => `${n} file diubah`, ago: (m) => (m < 1 ? 'barusan' : m < 60 ? `${m} menit lalu` : `${Math.floor(m / 60)} jam lalu`),
      working: 'sedang bekerja', idle: 'santai', done: (a, b) => `${a}/${b} selesai`,
      nodata: 'Data belum ada. Jalankan kantor lewat app Asa Office atau `npm run office`, lalu tunggu sebentar.',
    },
    en: {
      title: 'Task Board', newTask: '✉️ Send a new task', empty: 'No work in the last 24 hours.', untitled: 'Untitled session',
      tools: (n) => `${n} tools today`, files: (n) => `${n} files edited`, ago: (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`),
      working: 'working', idle: 'relaxing', done: (a, b) => `${a}/${b} done`,
      nodata: 'No data yet. Start the office with the Asa Office app or `npm run office` and give it a moment.',
    },
  });

  const css = `
  .asa-quests { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .asa-quest { background: #fffbe9; border: 1px solid #d9c49a; padding: 14px 12px 10px; position: relative;
    box-shadow: 0 3px 0 rgba(116, 65, 34, 0.25); font-size: 13px; }
  .asa-quest:nth-child(odd) { transform: rotate(-0.6deg); } .asa-quest:nth-child(even) { transform: rotate(0.5deg); }
  .asa-quest::before { content: ''; position: absolute; top: 4px; left: 50%; width: 8px; height: 8px; margin-left: -4px;
    background: #c8503c; box-shadow: inset -2px -2px 0 #973a2f; }
  .asa-quest h3 { font-size: 15px; font-weight: normal; margin: 4px 0 6px; }
  .asa-quest q { display: block; font-style: italic; opacity: 0.8; margin-bottom: 8px; overflow-wrap: anywhere; }
  .asa-quest-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; opacity: 0.75; }
  .asa-quest-who { margin-top: 8px; font-size: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-quest-who span { background: #f4e6c4; border: 1px solid #c9a877; padding: 1px 6px; }
  .asa-quest-who i { display: inline-block; width: 7px; height: 7px; margin-right: 4px; }
  .asa-todos { margin: 8px 0 0; padding: 0; list-style: none; }
  .asa-todos li { padding: 2px 0; display: flex; gap: 6px; }
  .asa-todos li.completed { opacity: 0.55; text-decoration: line-through; }
  .asa-todos li.in_progress { color: #973a2f; }
  .asa-prog { height: 6px; background: #e8d9b5; margin-top: 6px; } .asa-prog i { display: block; height: 100%; background: #6ea84e; }
  `;

  const minutesAgo = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

  /** Villagers currently in the office whose folder matches this session's project. */
  function villagersFor(project) {
    if (!project) return [];
    return [...(ns.view?.office?.characters.values() ?? [])].filter((c) => !c.isSubagent && c.folderName === project);
  }

  function quest(t) {
    const card = h('article', { class: 'asa-quest' });
    card.append(h('h3', {}, t.title || t.project || S.untitled));
    if (t.prompt) card.append(h('q', {}, t.prompt));
    card.append(
      h(
        'div',
        { class: 'asa-quest-meta' },
        t.project ? h('span', {}, `📁 ${t.project}`) : null,
        h('span', {}, `🔧 ${S.tools(t.toolsToday)}`),
        t.filesToday ? h('span', {}, `✎ ${S.files(t.filesToday)}`) : null,
        h('span', {}, `⏱ ${S.ago(minutesAgo(t.lastAt))}`),
      ),
    );
    const who = villagersFor(t.project);
    if (who.length) {
      card.append(
        h('div', { class: 'asa-quest-who' }, who.map((c) =>
          h('span', { title: c.isActive ? S.working : S.idle }, h('i', { style: { background: c.isActive ? '#5aa84a' : '#9a8a7a' } }), ns.villagerName(c)),
        )),
      );
    }
    if (t.todos?.length) {
      const done = t.todos.filter((x) => x.status === 'completed').length;
      card.append(
        h('ul', { class: 'asa-todos' }, t.todos.map((x) =>
          h('li', { class: x.status }, x.status === 'completed' ? '☑' : x.status === 'in_progress' ? '◐' : '☐', h('span', {}, x.status === 'in_progress' && x.activeForm ? x.activeForm : x.content)),
        )),
        h('div', { class: 'asa-prog', title: S.done(done, t.todos.length) }, h('i', { style: { width: `${(done / t.todos.length) * 100}%` } })),
      );
    }
    return card;
  }

  function render(body) {
    if (ns.mailbox) {
      body.append(h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' } },
        h('button', { type: 'button', class: 'asa-btn primary', onclick: () => ns.mailbox.compose() }, S.newTask)));
    }
    if (!ns.data) return body.append(h('div', {}, S.nodata));
    const tasks = ns.data.tasks ?? [];
    if (tasks.length === 0) return body.append(h('div', { class: 'asa-muted' }, S.empty));
    body.append(h('div', { class: 'asa-quests' }, tasks.map(quest)));
  }

  function open() {
    if (!document.getElementById('asa-quest-css')) document.head.appendChild(h('style', { id: 'asa-quest-css' }, css));
    let timer = null;
    const panel = ns.panel.open({ theme: 'cozy', title: S.title, render, onClose: () => clearInterval(timer) });
    const refresh = () => ns.refreshData().then(() => panel.rerender());
    refresh();
    timer = setInterval(refresh, 30_000);
  }

  ns.onFurnitureClick('COZY_TASKBOARD', open);

  // Badge: how many villagers are working right now.
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode) return;
    let working = 0;
    for (const c of office.characters.values()) if (c.isActive && !c.isSubagent && !c.asaNpc) working++;
    if (!working) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of ns.findFurniture('COZY_TASKBOARD')) {
      const x = offX + (f.col * 16 + 28) * zoom;
      const y = offY + (f.row * 16 + 5) * zoom;
      ctx.fillStyle = '#5aa84a';
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
      ctx.fillText(working > 9 ? '9+' : String(working), x, y + zoom * 0.5);
    }
    ctx.restore();
  });
})();
