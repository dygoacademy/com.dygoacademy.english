// Renders Word Garden .dc.html artboards to static HTML + PNG at 390x844.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const OUT = process.argv[2] || path.join(__dirname, '..', 'reference');
fs.mkdirSync(OUT, { recursive: true });
const fontDir = path.join(__dirname, 'node_modules/@fontsource');
const f = (fam, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(fontDir, fam, 'files', file)).toString('base64');
const fv = (file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'node_modules/@fontsource-variable/fraunces/files', file)).toString('base64');
// Unicode ranges as Google Fonts / next/font split them, so a Vietnamese letter
// missing from DM Sans falls back to Be Vietnam Pro glyph by glyph (same as the app).
const VI = 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const face = (fam, w, src, range) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;${range ? `unicode-range:${range};` : ''}src:url(${src}) format('woff2');}`;
const W4 = [400, 500, 600, 700];
const fontCss =
  face('Fraunces', '100 900', fv('fraunces-latin-opsz-normal.woff2')) +
  face('Fraunces', '100 900', fv('fraunces-latin-ext-opsz-normal.woff2'), EXT) +
  face('Fraunces', '100 900', fv('fraunces-vietnamese-opsz-normal.woff2'), VI) +
  W4.map(w => face('DM Sans', w, f('dm-sans', `dm-sans-latin-${w}-normal.woff2`)) + face('DM Sans', w, f('dm-sans', `dm-sans-latin-ext-${w}-normal.woff2`), EXT)).join('') +
  W4.map(w => ['latin', 'latin-ext', 'vietnamese'].map(sub => face('Be Vietnam Pro', w, f('be-vietnam-pro', `be-vietnam-pro-${sub}-${w}-normal.woff2`))).join('')).join('');

// [file, output name, state overrides]
// [source file, locale, output name, state overrides]
// en = the English canvas pages, vi = "Adult · Tiếng Việt" and "Adult · Groups · Tiếng Việt";
// AU* (en + vi) come from the canvas page "Adult · Sign in".
// Usage: node render.js [outDir] [filter]   e.g. node render.js ../reference GR   or   node render.js ../reference -vi
const FILTER = process.argv[3] || '';
const JOBS = [
  ['AdultHome.dc.html', 'en', 'A1-todays-garden', {}],
  ['AdultReview.dc.html', 'en', 'A2-review-question', {}],
  ['AdultReview.dc.html', 'en', 'A2-review-answer', { shown: true }],
  ['AdultReview.dc.html', 'en', 'A2-review-finished', { i: 3 }],
  ['AdultBloom.dc.html', 'en', 'A3-mission-complete', {}],
  ['AdultMissions.dc.html', 'en', 'A4-weekly-harvest', {}],
  ['AdultComeback.dc.html', 'en', 'A5-welcome-back', {}],
  ['AdultTopics.dc.html', 'en', 'A6-topics', {}],
  ['AdultTopicDetail.dc.html', 'en', 'A7-topic-bed', {}],
  ['AdultTopicDetail.dc.html', 'en', 'A7-topic-bed-filter-sprouts', { stage: 'sprout' }],
  ['AdultMe.dc.html', 'en', 'A8-me', {}],
  ['AdultGroups.dc.html', 'en', 'GR1-shared-gardens', {}],
  ['AdultGroupGarden.dc.html', 'en', 'GR2-group-garden', {}],
  ['AdultGroupTricky.dc.html', 'en', 'GR3-tricky-patches', {}],
  ['AdultGroupRoster.dc.html', 'en', 'GR4-gardeners', {}],
  ['AdultGroupInvite.dc.html', 'en', 'GR5-invite', {}],
  ['AdultGroupJoin.dc.html', 'en', 'GR6-join', {}],
  ['AdultGroupCreate.dc.html', 'en', 'GR7-create', {}],
  ['AdultLogin.dc.html', 'en', 'AU1-sign-in', {}],
  ['AdultLogin.dc.html', 'en', 'AU1-sign-in-error', { error: true }],
  ['AdultRegister.dc.html', 'en', 'AU2-create-account', {}],
  ['AdultRegisterInvite.dc.html', 'en', 'AU3-create-account-invite', {}],
  ['AdultForgot.dc.html', 'en', 'AU4-reset-password', {}],
  ['AdultForgot.dc.html', 'en', 'AU4-reset-password-sent', { sent: true }],
  ['AdultHomeVi.dc.html', 'vi', 'A1-todays-garden-vi', {}],
  ['AdultReviewVi.dc.html', 'vi', 'A2-review-question-vi', {}],
  ['AdultReviewVi.dc.html', 'vi', 'A2-review-answer-vi', { shown: true }],
  ['AdultReviewVi.dc.html', 'vi', 'A2-review-finished-vi', { i: 3 }],
  ['AdultBloomVi.dc.html', 'vi', 'A3-mission-complete-vi', {}],
  ['AdultMissionsVi.dc.html', 'vi', 'A4-weekly-harvest-vi', {}],
  ['AdultComebackVi.dc.html', 'vi', 'A5-welcome-back-vi', {}],
  ['AdultTopicsVi.dc.html', 'vi', 'A6-topics-vi', {}],
  ['AdultTopicDetailVi.dc.html', 'vi', 'A7-topic-bed-vi', {}],
  ['AdultTopicDetailVi.dc.html', 'vi', 'A7-topic-bed-filter-sprouts-vi', { stage: 'sprout' }],
  ['AdultMeVi.dc.html', 'vi', 'A8-me-vi', {}],
  ['AdultGroupsVi.dc.html', 'vi', 'GR1-shared-gardens-vi', {}],
  ['AdultGroupGardenVi.dc.html', 'vi', 'GR2-group-garden-vi', {}],
  ['AdultGroupTrickyVi.dc.html', 'vi', 'GR3-tricky-patches-vi', {}],
  ['AdultGroupRosterVi.dc.html', 'vi', 'GR4-gardeners-vi', {}],
  ['AdultGroupInviteVi.dc.html', 'vi', 'GR5-invite-vi', {}],
  ['AdultGroupJoinVi.dc.html', 'vi', 'GR6-join-vi', {}],
  ['AdultGroupCreateVi.dc.html', 'vi', 'GR7-create-vi', {}],
  ['AdultLoginVi.dc.html', 'vi', 'AU1-sign-in-vi', {}],
  ['AdultLoginVi.dc.html', 'vi', 'AU1-sign-in-error-vi', { error: true }],
  ['AdultRegisterVi.dc.html', 'vi', 'AU2-create-account-vi', {}],
  ['AdultRegisterInviteVi.dc.html', 'vi', 'AU3-create-account-invite-vi', {}],
  ['AdultForgotVi.dc.html', 'vi', 'AU4-reset-password-vi', {}],
  ['AdultForgotVi.dc.html', 'vi', 'AU4-reset-password-sent-vi', { sent: true }],
].filter(([, , name]) => !FILTER || name.includes(FILTER));

// English pages redrawn with the app's body stack (DM Sans, then Be Vietnam
// Pro for the Vietnamese letters DM Sans lacks), like the -vi sources, instead
// of the English canvas's 'DM Sans', sans-serif (system fallback for those
// letters). Only screens whose English page shows Vietnamese text need it.
// A7-topic-bed: redrawn 2026-09-27 (Dylan's font decision, 2026-09-26).
const APP_FONT_STACK = new Set(['A7-topic-bed']);
const withAppFontStack = (html) => html.replace(/'DM Sans',\s*sans-serif/g, "'DM Sans', 'Be Vietnam Pro', sans-serif");

const RUNTIME = String.raw`
(function (overrides) {
  class DCLogic { constructor(p){ this.props = p || {}; this.state = {}; } setState(p){ Object.assign(this.state, p); } forceUpdate(){} }
  const code = document.querySelector('script[data-dc-script]').textContent;
  const Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
  const inst = new Component({});
  inst.state = Object.assign({}, inst.state, overrides);
  const vals = inst.renderVals();
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const look = (p, scope) => {
    if (p === 'true') return true; if (p === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
    return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  };
  const fill = (s, scope) => s.replace(HOLE, (_, p) => { const v = look(p, scope); return v == null ? '' : (typeof v === 'function' ? '' : String(v)); });
  const whole = (s, scope) => { const m = s.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/); return m ? look(m[1], scope) : fill(s, scope); };
  function render(node, scope, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(fill(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') { if (whole(node.getAttribute('value'), scope)) node.childNodes.forEach(c => render(c, scope, out)); return; }
    if (tag === 'sc-for') {
      const list = whole(node.getAttribute('list'), scope) || []; const as = node.getAttribute('as');
      list.forEach((item, i) => { const s2 = Object.assign({}, scope, { [as]: item, $index: i }); node.childNodes.forEach(c => render(c, s2, out)); });
      return;
    }
    const el = node.cloneNode(false);
    for (const a of Array.from(el.attributes)) {
      if (/^on[A-Z]/.test(a.name) || /^on[a-z]+$/.test(a.name)) { el.removeAttribute(a.name); continue; }
      if (a.value.includes('{{')) el.setAttribute(a.name, fill(a.value, scope));
    }
    const kids = []; node.childNodes.forEach(c => render(c, scope, kids)); kids.forEach(k => el.appendChild(k));
    out.push(el);
  }
  const xdc = document.querySelector('x-dc');
  const helmet = xdc.querySelector('helmet');
  if (helmet) { Array.from(helmet.children).forEach(ch => { if (ch.tagName !== 'LINK') document.head.appendChild(ch); }); helmet.remove(); }
  const out = []; xdc.childNodes.forEach(c => render(c, vals, out));
  xdc.replaceWith(...out);
  document.querySelectorAll('script').forEach(s => s.remove());
  // freeze animations for a stable reference image
  const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st);
})`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, channel: process.env.CHROME_PATH ? undefined : 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const [file, , name, overrides] of JOBS) {
    let html = fs.readFileSync(path.join(__dirname, '..', 'source', file), 'utf8').replace('<script src="./support.js"></script>', '');
    if (APP_FONT_STACK.has(name)) html = withAppFontStack(html);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluate(`${RUNTIME}(${JSON.stringify(overrides)})`);
    await page.addStyleTag({ content: fontCss });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
    const flat = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML)).replace(/@font-face\{[^}]*\}/g, '');
    fs.writeFileSync(path.join(OUT, name + '.html'), flat);
    console.log('ok', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
