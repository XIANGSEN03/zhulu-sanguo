// 自动试玩 + 截图：用无界面的 Edge 打开 index.html，走一遍主要流程，收集报错。
// 用法：node tools/tour.cjs <playwright-core 路径> <截图输出目录>
const path = require('path');
const { chromium } = require(process.argv[2]);
const out = process.argv[3];
const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '#nostory'; // 关掉剧情对话

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const shot = async (page, name) => page.screenshot({ path: path.join(out, name + '.png') });
  const watch = page => {
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  };

  // 桌面
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(url);
  await page.waitForTimeout(2500);
  await shot(page, '1-title');
  await page.click('.lord.f-shu');
  await page.waitForTimeout(600);
  await shot(page, '2-intro');
  await page.click('#overlay .primary');
  await page.waitForTimeout(300);
  await shot(page, '3-overview');
  await page.click('g.city[data-city="xiapi"]');
  await page.click('[data-act="gen"][data-gen="guanyu"]');
  await page.waitForTimeout(200);
  await shot(page, '4-city');
  await page.click('[data-act="cmd"][data-cmd="attack"][data-gen="guanyu"]');
  await page.click('[data-act="pick"][data-target="shouchun"]');
  await page.check('input[data-act="dep"][value="mizhu"]');
  await page.waitForTimeout(200);
  await shot(page, '5-attack-form');
  await page.click('[data-act="confirm"]');
  await page.waitForTimeout(2200);
  await shot(page, '6-battle-mid');
  await page.waitForSelector('#bt-done:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, '7-battle-end');
  await page.click('#bt-done');
  await page.click('[data-act="end"]');
  await page.waitForTimeout(500);
  await shot(page, '8-report');
  await page.click('#overlay .primary');
  // 连打若干季，只结束回合，看会不会报错
  for (let t = 0; t < 14; t++) {
    await page.click('[data-act="end"]');
    await page.waitForTimeout(80);
    await page.click('#overlay .primary');
    await page.waitForTimeout(80);
    if (await page.$('.modal.over')) { console.log('第', t + 2, '次结束回合后对局结束'); await shot(page, '9b-over'); await page.click('.modal.over .ghost'); break; }
  }
  await page.waitForTimeout(300);
  await shot(page, '9-later');
  await page.click('[data-act="chronicle"]');
  await page.waitForTimeout(300);
  await shot(page, '10-chronicle');

  // 手机
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  watch(phone);
  await phone.goto(url);
  await phone.waitForTimeout(2000);
  await shot(phone, 'm1-title');
  await phone.click('.lord.f-wu');
  await phone.waitForTimeout(500);
  await shot(phone, 'm1b-intro');
  await phone.click('#overlay .primary');
  await phone.waitForTimeout(400);
  await shot(phone, 'm2-main');
  await phone.evaluate(() => document.querySelector('#panel').scrollIntoView());
  await phone.waitForTimeout(300);
  await shot(phone, 'm3-panel');
  await phone.click('g.city[data-city="jianye"]');
  await phone.waitForTimeout(600);
  await shot(phone, 'm4-city');
  const wide = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('手机页面横向溢出像素:', wide);

  console.log(errors.length ? errors.join('\n') : '没有报错');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
