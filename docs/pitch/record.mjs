// Plays the deck at 1080p, drives the real app inside the phone frames, records video + scene start times.
import { createRequire } from 'module';
import { readFileSync, writeFileSync, renameSync } from 'fs';
const { chromium } = createRequire('/usr/lib/node_modules/')('playwright');
const P = process.env.P;
const dur = JSON.parse(readFileSync(P + '/durations.json', 'utf8'));   // seconds per scene (from narration audio)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctxStart = Date.now();
// 16 px strip below the 1080p frame: its colour flips at each scene, so mix.py can find scene starts in video time.
const ctx = await b.newContext({ viewport: { width: 1920, height: 1096 }, recordVideo: { dir: P + '/rec', size: { width: 1920, height: 1096 } } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('file://' + P + '/slides.html'); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => { const m = document.createElement('div'); m.id = 'mk'; m.style.cssText = 'position:fixed;left:0;top:1080px;width:1920px;height:16px;background:#00ff00;z-index:99;view-transition-name:mk'; document.documentElement.append(m); const st = document.createElement('style'); st.textContent = '::view-transition-group(mk),::view-transition-new(mk){animation:none}::view-transition-old(mk){display:none}'; document.head.append(st); });
await p.evaluate(() => { f5.src = 'http://localhost:4173/#/guest'; f6.src = 'http://127.0.0.1:4173/'; });
await sleep(4000);
const g = await (await p.$('#f5')).contentFrame(), h = await (await p.$('#f6')).contentFrame();
const step = (l, i) => p.evaluate(([l, i]) => step(l, i), [l, i]);
const scenes = {
  s5: async () => {
    await sleep(800); await step('steps5', 0);
    await g.click('button:has-text("한국어")', { timeout: 8000 }); await sleep(1600);
    await step('steps5', 1); await sleep(1800); await g.click('button:has-text("동의합니다")'); await sleep(1000);
    await step('steps5', 2);
    for (const r of ['up', 'up', 'down', 'up', 'up']) { await g.click('button.thumb.' + r); await sleep(1150); }
    await step('steps5', 3); await g.click('textarea');
    await g.type('textarea', '커피 시음이 정말 좋았어요! 원두 두 봉지 사고 싶어요. 그런데 농장 찾아오는 길이 어려웠어요.', { delay: 75 });
    await sleep(900); await g.click('button:has-text("보내기")');
    await step('steps5', 4); await g.waitForSelector('.celebrate'); await sleep(2000);
  },
  s6: async () => {
    await sleep(600); await h.click('button:has-text("Try the demo")'); await h.waitForSelector('.summary'); await step('steps6', 0); await sleep(3500);
    await step('steps6', 1); await h.evaluate(() => document.querySelectorAll('section.card')[1].scrollIntoView({ behavior: 'smooth', block: 'start' })); await sleep(3500);
    await step('steps6', 2); await h.evaluate(() => document.querySelectorAll('section.card')[2].scrollIntoView({ behavior: 'smooth', block: 'start' })); await sleep(2500);
    await step('steps6', 3); await h.locator('button:has-text("ดูความเห็นจริง")').nth(1).click(); await sleep(4500);
    await h.locator('.sheet').evaluate((s) => s.scrollBy({ top: 400, behavior: 'smooth' })).catch(() => {}); await sleep(2000);
    await p.keyboard.press('Escape'); await sleep(800);
    await step('steps6', 4); await h.evaluate(() => [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('ไม่แน่ใจ'))?.scrollIntoView({ behavior: 'smooth', block: 'center' })); await sleep(3000);
  },
};
const t0 = Date.now(), log = [];
for (let i = 1; i <= 12; i++) {
  const id = 's' + i, start = Date.now();
  await p.evaluate(([id, i]) => { show(id); mk.style.background = i % 2 ? '#ff0000' : '#0000ff'; }, [id, i]);
  log.push({ id, at: (start - t0) / 1000 });
  if (scenes[id]) await scenes[id]();
  const left = start + dur[id] * 1000 - Date.now(); if (left > 0) await sleep(left);
}
await sleep(1500);
const total = (Date.now() - t0) / 1000;
const vid = await p.video().path(); await ctx.close(); await b.close();
renameSync(vid, P + '/rec/raw.webm');
writeFileSync(P + '/timeline.json', JSON.stringify({ lead: (t0 - ctxStart) / 1000, total, scenes: log }, null, 1));
console.log('scenes:', log.map((s) => s.id + '@' + s.at.toFixed(1)).join(' '), '| total', total.toFixed(1), '| errors:', errs.length ? errs : 'none');
