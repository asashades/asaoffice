// asaoffice inbound mail: a prompt you type in Claude Code (any terminal or app on this Mac) shows up in the office as a little
// "Pesan masuk" popup, folds into a paper plane and flies to the mailbox on the wall (the same plane and thud as sending from the
// mailbox). Tasks sent from the mailbox itself are skipped: they have their own courier. ?claudeMail=off turns it off (remembered).
// A prompt whose session is still busy ~45 s later is a long task: Shades calls the staff to a meeting (director.js `rally`) and they
// then work at their desks until the session goes quiet. Quick ones never get that far. ?claudeMeeting=off keeps the plane but skips this.
// The office server notes each session's latest prompt (tools/lib/claude-stats.mjs `ask`); this polls the data file every few seconds.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  if (ns.setting('claudeMail', ['on', 'off'], 'on') !== 'on') return;
  const h = ns.h;

  const meetingsOn = ns.setting('claudeMeeting', ['on', 'off'], 'on') === 'on';
  const POLL_MS = 4000;
  const RALLY_AFTER_MS = 45_000; // a task still going this long after the prompt counts as a long one
  const RALLY_GIVE_UP_MS = 5 * 60_000; // …and if Shades couldn't meet by then, forget it
  const BUSY_MS = 15_000; // activity this recent when the 45 s are up = still working (a quick task that ended at 20 s is not)
  const QUIET_MS = 40_000; // no activity for this long once the meeting is on = the session is done (or waiting for you)
  const FRESH_MS = 90_000; // a prompt older than this arrived while the tab was away: not worth a plane
  const HOLD_MS = 2300;
  const MAX_QUEUE = 3;

  const css = `
  .asa-inmail { position: fixed; left: 50%; top: 74px; z-index: 1150; width: min(320px, calc(100vw - 24px)); box-sizing: border-box; pointer-events: none;
    padding: 8px 12px 9px; background: #fffbe9; color: #3a2117; border: 3px solid #744122; box-shadow: 0 4px 0 rgba(58, 33, 23, 0.35);
    font-family: "FS Pixel Sans", sans-serif; font-size: 13px; line-height: 1.35; transform: translate(-50%, -14px); opacity: 0; transition: transform 0.28s ease-out, opacity 0.28s ease-out; }
  .asa-inmail.in { transform: translate(-50%, 0); opacity: 1; }
  .asa-inmail.out { transform: translate(-50%, 6px) scale(0.12); opacity: 0; transition-duration: 0.32s; transition-timing-function: ease-in; }
  .asa-inmail b { display: block; font-size: 12px; margin-bottom: 2px; }
  .asa-inmail span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
  @media (prefers-reduced-motion: reduce) { .asa-inmail, .asa-inmail.out { transition: opacity 0.2s; transform: translate(-50%, 0); } }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const S = {
    title: (project) => `✉️ Pesan masuk${project ? ` · ${project}` : ''}`,
  };

  const seen = new Map(); // session id -> the prompt time already handled
  const watch = new Map(); // session id -> { at, text } of a fresh prompt that may turn out to be a long task
  const queue = [];
  let primed = false; // the first look only records what is already there
  let busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function show(item) {
    const el = h('div', { class: 'asa-inmail', role: 'status' }, h('b', {}, S.title(item.project)), h('span', {}, item.text));
    document.body.append(el);
    ns.notify?.sfx?.('send');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    await wait(HOLD_MS);
    const flight = ns.mailbox?.flyPlane ? ns.mailbox.flyPlane(el) : wait(300); // starts from where the popup is
    el.classList.add('out');
    await flight;
    el.remove();
    ns.mailbox?.dropLetter?.();
  }

  async function pump() {
    if (busy) return;
    busy = true;
    try {
      while (queue.length) await show(queue.shift()).catch(() => {});
    } finally { busy = false; }
  }

  function consider(data) {
    if (!data) return;
    const mine = new Set((data.mail ?? []).map((l) => l.sessionId)); // sent from the mailbox: the courier handles those
    const now = Date.now();
    for (const s of data.sessions ?? []) {
      const at = s.ask?.at;
      if (!at || seen.get(s.id) === at) continue;
      seen.set(s.id, at);
      if (!primed || mine.has(s.id) || now - at > FRESH_MS) continue;
      queue.push({ project: s.project, text: s.ask.text });
      if (queue.length > MAX_QUEUE) queue.shift();
      watch.set(s.id, { at, text: s.ask.text });
    }
    primed = true;
    pump();
    if (meetingsOn) tendWatch(data);
  }

  const lastActive = (data, id) => {
    const s = (data.sessions ?? []).find((x) => x.id === id);
    return s ? Date.parse(s.at) : 0;
  };
  /** Prompts still being worked on after RALLY_AFTER_MS get a meeting (once each). */
  function tendWatch(data) {
    const now = Date.now();
    for (const [id, w] of watch) {
      const cur = (data.sessions ?? []).find((x) => x.id === id)?.ask?.at;
      if (cur !== w.at || now - w.at > RALLY_GIVE_UP_MS) { watch.delete(id); continue; } // a newer prompt took over, or too late
      if (now - w.at < RALLY_AFTER_MS || now - lastActive(data, id) > BUSY_MS) continue; // still quick, or already finished
      const live = () => ns.data && Date.now() - lastActive(ns.data, id) < QUIET_MS;
      if (ns.director?.rally?.({ prompt: w.text, live })) watch.delete(id);
      return; // one meeting at a time; the rest wait for a later poll
    }
  }

  const poll = () => {
    if (document.hidden) return;
    ns.refreshData?.().then(consider).catch(() => {});
  };
  poll();
  setInterval(poll, POLL_MS);

  ns.inbound = { test: (project, text) => { queue.push({ project, text }); pump(); } }; // console: __asaoffice.inbound.test('asaoffice', 'halo')
})();
