// asaoffice Markdown reader: turns a note's text into DOM (never innerHTML, so a note can't inject anything into the page).
// Supports what Obsidian notes use: front matter (shown as properties), headings 1–6, paragraphs with line breaks, **bold**, *italic*,
// ~~strike~~, ==highlight==, `code`, fenced code blocks, ordered/unordered/nested lists, task lists (tickable), > quotes and
// > [!callouts], tables, horizontal rules, links, bare URLs, #tags, [[wikilinks]] (with |alias), images ![](…) and ![[…]], %%comments%%.
//   ns.markdown.render(el, text, ctx)     ctx (all optional): { wiki(target), image(src, img), toggle(lineNo, checked),
//                                         taskExtra(li, taskText), dir }
//   ns.markdown.inline(text, ctx)         the inline nodes of one line
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;

  const IMAGE = /\.(png|jpe?g|gif|webp)$/i;
  const httpUrl = (u) => /^(https?:\/\/|mailto:)/i.test(u);
  const CALLOUT_ICON = { note: '📝', info: 'ℹ️', tip: '💡', hint: '💡', important: '❗', warning: '⚠️', caution: '⚠️', danger: '⛔', error: '⛔', bug: '🐛', example: '🧪', quote: '❝', cite: '❝', success: '✅', check: '✅', done: '✅', question: '❓', faq: '❓', failure: '❌', fail: '❌', todo: '☑️', abstract: '📄', summary: '📄', tldr: '📄' };

  const css = `
  .asa-md { font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
  .asa-md h1, .asa-md h2, .asa-md h3, .asa-md h4, .asa-md h5, .asa-md h6 { font-weight: 600; margin: 14px 0 4px; color: #973a2f; }
  .asa-md h1 { font-size: 21px; margin-top: 2px; } .asa-md h2 { font-size: 18px; } .asa-md h3 { font-size: 16px; } .asa-md h4, .asa-md h5, .asa-md h6 { font-size: 15px; }
  .asa-md h5, .asa-md h6 { opacity: 0.8; }
  .asa-md p { margin: 6px 0; }
  .asa-md ul, .asa-md ol { margin: 4px 0; padding-left: 22px; }
  .asa-md ul { list-style: disc; } .asa-md ul ul { list-style: circle; } .asa-md ul ul ul { list-style: square; } .asa-md ol { list-style: decimal; }
  .asa-md li { margin: 3px 0; }
  .asa-md li > ul, .asa-md li > ol { margin: 2px 0; }
  .asa-md code { background: #f0e2bb; padding: 0 3px; font-family: ui-monospace, Menlo, monospace; font-size: 0.92em; }
  .asa-md pre { background: #f0e2bb; border: 1px solid #d9c49a; padding: 8px 10px; margin: 8px 0; overflow: auto; position: relative; }
  .asa-panel.asa-plain .asa-md code, .asa-panel.asa-plain .asa-md pre code { font-family: ui-monospace, Menlo, monospace; }
  .asa-md pre code { background: none; padding: 0; font-size: 13px; line-height: 1.45; white-space: pre; }
  .asa-md pre .lang { position: absolute; top: 2px; right: 6px; font-size: 11px; opacity: 0.55; }
  .asa-md blockquote { margin: 8px 0; padding: 2px 12px; border-left: 4px solid #c9a877; background: rgba(244,230,196,0.5); }
  .asa-md .callout { margin: 8px 0; padding: 6px 12px 8px; border-left: 4px solid #4a86d8; background: rgba(74,134,216,0.1); }
  .asa-md .callout.warning, .asa-md .callout.caution { border-color: #d8942a; background: rgba(216,148,42,0.12); }
  .asa-md .callout.danger, .asa-md .callout.error, .asa-md .callout.failure, .asa-md .callout.fail, .asa-md .callout.bug { border-color: #c8503c; background: rgba(200,80,60,0.1); }
  .asa-md .callout.tip, .asa-md .callout.hint, .asa-md .callout.success, .asa-md .callout.check, .asa-md .callout.done { border-color: #3f8a36; background: rgba(63,138,54,0.1); }
  .asa-md .callout-title { font-weight: 600; margin-bottom: 2px; }
  .asa-md hr { border: 0; border-top: 2px dashed #c9a877; margin: 12px 0; }
  .asa-md a { color: #2f6fc4; cursor: pointer; text-decoration: underline; }
  .asa-md a.wiki { color: #7a4fb8; text-decoration: none; border-bottom: 1px dotted #7a4fb8; }
  .asa-md .tag { color: #4a86d8; }
  .asa-md mark { background: #ffe27a; color: inherit; padding: 0 2px; }
  .asa-md img { max-width: 100%; height: auto; display: block; margin: 6px 0; border: 1px solid #d9c49a; }
  .asa-md .tablewrap { overflow: auto; margin: 8px 0; }
  .asa-md table { border-collapse: collapse; font-size: 14px; }
  .asa-md th, .asa-md td { border: 1px solid #d9c49a; padding: 4px 9px; vertical-align: top; }
  .asa-md th { background: #f4e6c4; text-align: left; }
  .asa-md .props { margin: 0 0 10px; border: 1px solid #d9c49a; background: rgba(244,230,196,0.5); padding: 4px 10px; font-size: 13px; }
  .asa-md .props summary { cursor: pointer; opacity: 0.75; }
  .asa-md .props div { display: flex; gap: 8px; margin: 2px 0; } .asa-md .props b { font-weight: 600; min-width: 90px; }
  .asa-md li.asa-shelf-task { list-style: none; margin-left: -18px; }
  `;
  let styled = false;
  const ensureCss = () => {
    if (styled) return;
    styled = true;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  };

  // ── Inline ──
  const PATTERNS = [
    ['comment', /%%[\s\S]*?%%/],
    ['code', /`([^`\n]+)`/],
    ['embed', /!\[\[([^\]\n]+)\]\]/],
    ['image', /!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/],
    ['wiki', /\[\[([^\]\n]+)\]\]/],
    ['link', /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/],
    ['bold', /\*\*(.+?)\*\*|__(.+?)__/],
    ['strike', /~~(.+?)~~/],
    ['mark', /==(.+?)==/],
    ['italic', /\*([^*\s][^*]*?)\*|(?<![\w])_([^_\s][^_]*?)_(?![\w])/],
    ['url', /https?:\/\/[^\s<>)\]]+/],
    ['tag', /(?<![\w&/])#[\p{L}\p{N}_/-]*\p{L}[\p{L}\p{N}_/-]*/u],
  ];

  function image(src, alt, ctx, width) {
    const img = h('img', { alt: alt || '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    if (width) img.style.width = `${width}px`;
    if (/^https?:\/\//i.test(src)) img.src = src;
    else if (ctx.image) ctx.image(src, img);
    else return h('span', { class: 'tag' }, `🖼 ${alt || src}`);
    return img;
  }

  function build(kind, m, ctx) {
    switch (kind) {
      case 'comment': return [];
      case 'code': return [h('code', {}, m[1])];
      case 'embed': {
        const [target, size] = m[1].split('|');
        if (IMAGE.test(target)) return [image(target.trim(), '', ctx, /^\d+$/.test(size ?? '') ? Number(size) : 0)];
        return [h('a', { class: 'wiki', onclick: () => ctx.wiki?.(target.replace(/#.*$/, '').trim()) }, `📄 ${target}`)];
      }
      case 'image': return [image(decodeURIComponentSafe(m[2]), m[1], ctx)];
      case 'wiki': {
        const [target, alias] = m[1].split('|');
        return [h('a', { class: 'wiki', title: target, onclick: () => ctx.wiki?.(target.replace(/#.*$/, '').trim()) }, (alias ?? target).trim())];
      }
      case 'link': {
        const url = m[2];
        if (httpUrl(url)) return [h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, ...inline(m[1], ctx))];
        if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return [m[1]]; // some other scheme: plain text
        return [h('a', { class: 'wiki', onclick: () => ctx.wiki?.(decodeURIComponentSafe(url).replace(/#.*$/, '').replace(/\.md$/i, '').trim()) }, ...inline(m[1], ctx))];
      }
      case 'bold': return [h('b', {}, ...inline(m[1] ?? m[2], ctx))];
      case 'strike': return [h('s', {}, ...inline(m[1], ctx))];
      case 'mark': return [h('mark', {}, ...inline(m[1], ctx))];
      case 'italic': return [h('i', {}, ...inline(m[1] ?? m[2], ctx))];
      case 'url': {
        const url = m[0].replace(/[.,;:!?]+$/, '');
        return [h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url), m[0].slice(url.length)];
      }
      case 'tag': return [h('span', { class: 'tag' }, m[0])];
      default: return [m[0]];
    }
  }
  const decodeURIComponentSafe = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

  function inline(text, ctx = {}) {
    const out = [];
    let rest = String(text);
    while (rest) {
      let best = null;
      for (const [kind, re] of PATTERNS) {
        const m = re.exec(rest);
        if (m && (!best || m.index < best.m.index)) best = { kind, m };
      }
      if (!best) { out.push(rest); break; }
      if (best.m.index > 0) out.push(rest.slice(0, best.m.index));
      out.push(...build(best.kind, best.m, ctx));
      rest = rest.slice(best.m.index + best.m[0].length);
    }
    return out;
  }
  /** Inline nodes for a paragraph's lines, joined by line breaks (Obsidian shows single newlines as line breaks). */
  const lineNodes = (lines, ctx) => lines.flatMap((l, k) => (k ? [h('br'), ...inline(l, ctx)] : inline(l, ctx)));

  // ── Blocks ──
  const RE = {
    fence: /^(\s*)(`{3,}|~{3,})\s*([^`]*)$/,
    heading: /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/,
    hr: /^ {0,3}([-*_])( *\1){2,} *$/,
    quote: /^ {0,3}>\s?(.*)$/,
    item: /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,
    task: /^\[( |x|X)\]\s+(.*)$/,
    sep: /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/,
  };
  const indentOf = (s) => s.replace(/\t/g, '    ').length - s.replace(/\t/g, '    ').trimStart().length;
  const cells = (line) => {
    let t = line.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
    return t.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
  };
  const isTableStart = (lines, i) => lines[i]?.includes('|') && lines[i + 1] != null && RE.sep.test(lines[i + 1]) && lines[i + 1].includes('-') && cells(lines[i]).length >= 2;
  const startsBlock = (lines, i) => {
    const l = lines[i];
    return RE.fence.test(l) || RE.heading.test(l) || RE.hr.test(l) || RE.quote.test(l) || RE.item.test(l) || isTableStart(lines, i) || /^\s*\$\$/.test(l);
  };

  function properties(el, lines) {
    const rows = lines.map((l) => /^([^:#\s][^:]*):\s*(.*)$/.exec(l)).filter(Boolean);
    const extra = lines.filter((l) => !/^([^:#\s][^:]*):\s*(.*)$/.test(l) && l.trim());
    el.append(h('details', { class: 'props' }, h('summary', {}, 'Properti'),
      ...rows.map(([, k, v]) => h('div', {}, h('b', {}, k), h('span', {}, v.replace(/^[[\]"']+|[[\]"']+$/g, '')))),
      extra.length ? h('div', { class: 'tag' }, extra.join(' ')) : null));
  }

  function renderList(el, lines, i, ctx, base) {
    const levels = []; // { indent, el, lastLi }
    let last = null; // the last <li>
    let k = i;
    for (; k < lines.length; k++) {
      const line = lines[k];
      const m = RE.item.exec(line);
      if (!m) {
        if (!line.trim()) { // a blank line ends the list unless the next line carries on with an item or an indented line
          const nxt = lines[k + 1];
          if (nxt != null && (RE.item.test(nxt) || /^\s{2,}\S/.test(nxt)) && levels.length) continue;
          break;
        }
        if (/^\s{2,}\S/.test(line) && last && !RE.fence.test(line)) { last.append(h('br'), ...inline(line.trim(), ctx)); continue; }
        break;
      }
      const indent = indentOf(m[1]);
      const ordered = /\d/.test(m[2]);
      while (levels.length && indent < levels.at(-1).indent) levels.pop();
      if (levels.length && indent === levels.at(-1).indent && ordered !== levels.at(-1).ordered) levels.pop(); // 1. after a bullet at the same level: a new list
      if (!levels.length || indent > levels.at(-1).indent) {
        const list = ordered ? h('ol', ordered && Number.parseInt(m[2], 10) !== 1 ? { start: String(Number.parseInt(m[2], 10)) } : {}) : h('ul');
        (levels.length ? levels.at(-1).lastLi ?? el : el).append(list);
        levels.push({ indent, ordered, el: list, lastLi: null });
      }
      const level = levels.at(-1);
      const task = RE.task.exec(m[3]);
      let li;
      if (task) {
        const done = task[1] !== ' ';
        const lineNo = base + k;
        const box = h('input', { type: 'checkbox' });
        box.checked = done;
        if (ctx.toggle) box.onchange = () => ctx.toggle(lineNo, box.checked); else box.disabled = true;
        li = h('li', { class: `asa-shelf-task${done ? ' done' : ''}` }, box, h('span', {}, ...inline(task[2].replace(/\s*#konteks\b/g, ''), ctx)));
        if (!done) ctx.taskExtra?.(li, task[2]);
      } else li = h('li', {}, ...inline(m[3], ctx));
      level.el.append(li);
      level.lastLi = li;
      last = li;
    }
    return k;
  }

  function blocks(el, lines, ctx, base = 0) {
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = RE.fence.exec(line)) && !(m[2][0] === '`' && m[3].includes('`'))) {
        const fence = m[2];
        const body = [];
        i++;
        while (i < lines.length && !new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(lines[i])) body.push(lines[i++]);
        i++;
        const lang = m[3].trim().split(/\s+/)[0];
        el.append(h('pre', {}, lang ? h('span', { class: 'lang' }, lang) : null, h('code', {}, body.join('\n'))));
        continue;
      }
      if (/^\s*\$\$/.test(line)) { // a math block: shown as it is
        const body = [line.replace(/^\s*\$\$/, '')];
        if (!/\$\$\s*$/.test(line) || line.trim() === '$$') { i++; while (i < lines.length && !/\$\$\s*$/.test(lines[i])) body.push(lines[i++]); if (i < lines.length) body.push(lines[i].replace(/\$\$\s*$/, '')); }
        i++;
        el.append(h('pre', {}, h('code', {}, body.join('\n').replace(/\$\$\s*$/, '').trim())));
        continue;
      }
      if (line.trim().startsWith('<!--')) { while (i < lines.length && !lines[i].includes('-->')) i++; i++; continue; }
      if ((m = RE.heading.exec(line))) {
        el.append(h(`h${m[1].length}`, {}, ...inline(m[2].replace(/\s*#konteks\b/g, ''), ctx)));
        i++;
        continue;
      }
      if (RE.hr.test(line)) { el.append(h('hr')); i++; continue; }
      if (RE.quote.test(line)) {
        const inner = [];
        while (i < lines.length && RE.quote.test(lines[i])) inner.push(RE.quote.exec(lines[i++])[1]);
        const callout = /^\[!([\w-]+)\][+-]?\s*(.*)$/.exec(inner[0]);
        const sub = { ...ctx, toggle: null };
        if (callout) {
          const type = callout[1].toLowerCase();
          const box = h('div', { class: `callout ${type}` }, h('div', { class: 'callout-title' }, `${CALLOUT_ICON[type] ?? '📌'} `, ...(callout[2] ? inline(callout[2], ctx) : [type[0].toUpperCase() + type.slice(1)])));
          blocks(box, inner.slice(1), sub);
          el.append(box);
        } else {
          const box = h('blockquote');
          blocks(box, inner, sub);
          el.append(box);
        }
        continue;
      }
      if (isTableStart(lines, i)) {
        const head = cells(line);
        const aligns = cells(lines[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : ''));
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(cells(lines[i++]));
        const cell = (tag, text, c) => h(tag, aligns[c] ? { style: `text-align:${aligns[c]}` } : {}, ...inline(text, ctx));
        el.append(h('div', { class: 'tablewrap' }, h('table', {},
          h('thead', {}, h('tr', {}, head.map((t, c) => cell('th', t, c)))),
          h('tbody', {}, rows.map((r) => h('tr', {}, head.map((_, c) => cell('td', r[c] ?? '', c))))))));
        continue;
      }
      if (RE.item.test(line)) { i = renderList(el, lines, i, ctx, base); continue; }
      // a paragraph: until a blank line or the start of another block
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) para.push(lines[i++].trim());
      el.append(h('p', {}, ...lineNodes(para, ctx)));
    }
  }

  function render(el, text, ctx = {}) {
    ensureCss();
    el.classList.add('asa-md');
    let lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    let base = 0;
    if (lines[0]?.trim() === '---') {
      const end = lines.findIndex((l, k) => k > 0 && /^(---|\.\.\.)\s*$/.test(l));
      if (end > 0) { properties(el, lines.slice(1, end)); lines = lines.slice(end + 1); base = end + 1; }
    }
    blocks(el, lines, ctx, base);
  }

  ns.markdown = { render, inline };
})();
