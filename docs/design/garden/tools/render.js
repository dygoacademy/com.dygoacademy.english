// Renders Word Garden .dc.html artboards to static HTML + PNG at 390x844.
// Usage: node render.js <outDir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const OUT = process.argv[2] || path.join(__dirname, '..', 'reference');
fs.mkdirSync(OUT, { recursive: true });
const fontDir = path.join(__dirname, 'node_modules/@fontsource');
const f = (fam, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(fontDir, fam, 'files', file)).toString('base64');
const frVar = 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')).toString('base64');
const fontCss = `@font-face{font-family:'Fraunces';font-weight:100 900;font-style:normal;src:url(${frVar}) format('woff2');}` + [
  ['DM Sans', 'dm-sans', [400, 500, 600, 700]],
].map(([name, pkg, ws]) => ws.map(w =>
  `@font-face{font-family:'${name}';font-weight:${w};font-style:normal;src:url(${f(pkg, `${pkg}-latin-${w}-normal.woff2`)}) format('woff2');}`
).join('')).join('');

// [file, output name, state overrides]
const JOBS = [
  ['AdultHome.dc.html', 'A1-todays-garden', {}],
  ['AdultReview.dc.html', 'A2-review-question', {}],
  ['AdultReview.dc.html', 'A2-review-answer', { shown: true }],
  ['AdultReview.dc.html', 'A2-review-finished', { i: 3 }],
  ['AdultBloom.dc.html', 'A3-mission-complete', {}],
  ['AdultMissions.dc.html', 'A4-weekly-harvest', {}],
  ['AdultComeback.dc.html', 'A5-welcome-back', {}],
  ['AdultTopics.dc.html', 'A6-topics', {}],
  ['AdultTopicDetail.dc.html', 'A7-topic-bed', {}],
  ['AdultTopicDetail.dc.html', 'A7-topic-bed-filter-sprouts', { stage: 'sprout' }],
  ['AdultMe.dc.html', 'A8-me', {}],
];

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
  for (const [file, name, overrides] of JOBS) {
    let html = fs.readFileSync(path.join(__dirname, '..', 'source', file), 'utf8').replace('<script src="./support.js"></script>', '');
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
