// Plays a deck at 1080p, drives the real app inside the phone frames, records video + scene start times.
// DECK=pitch (slides.html) | demo | tech. Needs the app on http://localhost:4173 and http://127.0.0.1:4173.
import { createRequire } from 'module';
import { readFileSync, writeFileSync, renameSync } from 'fs';
const { chromium } = createRequire('/usr/lib/node_modules/')('playwright');
const P = process.env.P, DECK = process.env.DECK || 'pitch', pre = DECK === 'pitch' ? '' : DECK + '.';
const html = DECK === 'pitch' ? 'slides.html' : DECK + '.html';
const ids = JSON.parse(readFileSync(`${P}/${pre}narration.json`, 'utf8')).map((s) => s.id);
const dur = JSON.parse(readFileSync(`${P}/${pre}durations.json`, 'utf8'));   // seconds per scene (from narration audio)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const A = 'http://localhost:4173/', B = 'http://127.0.0.1:4173/';   // two origins = two separate app databases
const frames = { pitch: { f5: A + '#/guest', f6: B }, demo: { fd2: A + '#/guest', fd3: B, fd4: A + '#/teach' }, tech: {}, intro: {} }[DECK];

const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
// 16 px strip below the 1080p frame: its colour flips at each scene, so mix.py can find scene starts in video time.
const ctx = await b.newContext({ viewport: { width: 1920, height: 1096 }, recordVideo: { dir: P + '/rec', size: { width: 1920, height: 1096 } } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`file://${P}/${html}`); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => { const m = document.createElement('div'); m.id = 'mk'; m.style.cssText = 'position:fixed;left:0;top:1080px;width:1920px;height:16px;background:#00ff00;z-index:99;view-transition-name:mk'; document.documentElement.append(m); const st = document.createElement('style'); st.textContent = '::view-transition-group(mk),::view-transition-new(mk){animation:none}::view-transition-old(mk){display:none}'; document.head.append(st); });
await p.evaluate((f) => { for (const [id, url] of Object.entries(f)) document.getElementById(id).src = url; }, frames);
// Wait until every app frame has rendered (a cold server can take a while), then settle.
for (const id of Object.keys(frames)) await (await (await p.$('#' + id)).contentFrame()).waitForFunction(() => document.querySelector('#root')?.childElementCount > 0, null, { timeout: 60000 });
await sleep(2500);
const fr = async (id) => (await p.$('#' + id)).contentFrame();
const step = (l, i) => p.evaluate(([l, i]) => step(l, i), [l, i]);

// Live-app parts. Guest: language → consent → ratings → comment → thanks.
const guest = async (g, list, lang, agree, ratings, text, send) => {
  await sleep(700); await step(list, 0); await g.click(`button:has-text("${lang}")`, { timeout: 8000 }); await sleep(1400);
  await step(list, 1); await sleep(1500); await g.click(`button:has-text("${agree}")`); await sleep(900);
  await step(list, 2);
  for (const r of ratings) { await g.click('button.thumb.' + r); await sleep(1050); }
  await step(list, 3); await g.click('textarea'); await g.type('textarea', text, { delay: 45 });
  await sleep(700); await g.click(`button:has-text("${send}")`);
  await step(list, 4); await g.waitForSelector('.celebrate'); await sleep(1800);
};
// Host: demo insights → scroll cards → evidence sheet → "not sure" list.
const host = async (h, list, at) => {
  await sleep(500); await h.click('button:has-text("Try the demo")'); await h.waitForSelector('.summary'); await step(list, 0); await sleep(3200);
  await step(list, at.cards); await h.evaluate(() => document.querySelectorAll('section.card')[1].scrollIntoView({ behavior: 'smooth', block: 'start' })); await sleep(3200);
  if (at.speak !== undefined) { await step(list, at.speak); await h.evaluate(() => document.querySelectorAll('section.card')[2].scrollIntoView({ behavior: 'smooth', block: 'start' })); await sleep(2400); }
  await step(list, at.evidence); await h.locator('button:has-text("ดูความเห็นจริง")').nth(1).click(); await sleep(4200);
  await h.locator('.sheet').evaluate((s) => s.scrollBy({ top: 400, behavior: 'smooth' })).catch(() => {}); await sleep(1800);
  await p.keyboard.press('Escape'); await sleep(700);
  await step(list, at.unsure); await h.evaluate(() => [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('ไม่แน่ใจ'))?.scrollIntoView({ behavior: 'smooth', block: 'center' })); await sleep(2800);
};
const actions = {
  'pitch:s5': async () => guest(await fr('f5'), 'steps5', '한국어', '동의합니다', ['up', 'up', 'down', 'up', 'up'],
    '커피 시음이 정말 좋았어요! 원두 두 봉지 사고 싶어요. 그런데 농장 찾아오는 길이 어려웠어요.', '보내기'),
  'pitch:s6': async () => host(await fr('f6'), 'steps6', { cards: 1, speak: 2, evidence: 3, unsure: 4 }),
  'demo:d2': async () => guest(await fr('fd2'), 'stepsd2', 'English', 'I agree', ['up', 'up', 'down', 'up', 'up'],
    'Loved the tasting! The walk up was too steep for my parents. Can I buy two bags of beans?', 'Send'),
  'demo:d3': async () => host(await fr('fd3'), 'stepsd3', { cards: 1, evidence: 2, unsure: 3 }),
  'demo:d4': async () => {
    const t = await fr('fd4');
    await sleep(500); await t.click('button:has-text("ตกลง เริ่มสอน")').catch(() => {}); await sleep(800);
    await step('stepsd4', 0); await t.click('a[href="#/teach/starter"]'); await sleep(2200);
    await t.click('button:has-text("✓ ใช่")'); await sleep(1600);
    await t.click('button:has-text("✓ ใช่")'); await sleep(1200);
    await step('stepsd4', 1); await sleep(800);
  },
};

const t0 = Date.now(), log = [];
for (const [i, id] of ids.entries()) {
  const start = Date.now();
  await p.evaluate(([id, i]) => { show(id); mk.style.background = i % 2 ? '#0000ff' : '#ff0000'; }, [id, i]);
  log.push({ id, at: (start - t0) / 1000 });
  if (actions[`${DECK}:${id}`]) await actions[`${DECK}:${id}`]();
  const left = start + dur[id] * 1000 - Date.now(); if (left > 0) await sleep(left);
}
await sleep(1500);
const total = (Date.now() - t0) / 1000;
const vid = await p.video().path(); await ctx.close(); await b.close();
renameSync(vid, P + '/rec/raw.webm');
writeFileSync(`${P}/${pre}timeline.json`, JSON.stringify({ total, scenes: log }, null, 1));
console.log(DECK, 'scenes:', log.map((s) => s.id + '@' + s.at.toFixed(1)).join(' '), '| total', total.toFixed(1), '| errors:', errs.length ? errs : 'none');
