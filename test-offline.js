import puppeteer from 'puppeteer';

(async () => {
  console.log('=== DrishtiAI PWA Offline Verification ===\n');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Load the page online
  console.log('1. Loading page (online)...');
  const resp = await page.goto('http://127.0.0.1:4173', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  console.log(`   HTTP ${resp.status()} – ${resp.statusText()}`);

  // Give React time to render and SW time to install + activate
  await new Promise(r => setTimeout(r, 4000));

  // 2. Check SW registration
  console.log('2. Checking Service Worker...');
  const swInfo = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length === 0) return { registered: false };
    const reg = regs[0];
    return {
      registered: true,
      scope: reg.scope,
      active: !!reg.active,
      installing: !!reg.installing,
      waiting: !!reg.waiting,
    };
  });
  console.log('   SW registered:', swInfo.registered);
  if (swInfo.registered) {
    console.log('   SW scope:', swInfo.scope);
    console.log('   SW active:', swInfo.active, '| installing:', swInfo.installing, '| waiting:', swInfo.waiting);
  }

  // 3. Verify manifest link
  console.log('3. Checking Web App Manifest...');
  const manifestLink = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.getAttribute('href') : null;
  });
  console.log('   Manifest link:', manifestLink || '❌ NOT FOUND');

  // 4. Check theme-color meta
  const themeColor = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    return meta ? meta.getAttribute('content') : null;
  });
  console.log('   Theme color:', themeColor || '❌ NOT FOUND');

  // 5. Take inventory of what rendered online
  const onlineTitle = await page.title();
  const onlineRootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
  console.log(`   Title: "${onlineTitle}"  |  Root HTML length: ${onlineRootLen}`);

  // 6. Go offline
  console.log('\n4. Going OFFLINE via CDP...');
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });

  // 7. Reload offline
  console.log('5. Reloading page (offline)...');
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    const offlineTitle = await page.title();
    const offlineRootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
    console.log(`   Title: "${offlineTitle}"  |  Root HTML length: ${offlineRootLen}`);

    // Check for the Chrome offline dino page indicator
    const isChromeDino = await page.evaluate(() => {
      return document.querySelector('#main-frame-error') !== null ||
             document.title.includes('not reachable') ||
             document.body?.innerText?.includes('ERR_INTERNET_DISCONNECTED');
    });

    console.log('\n=== RESULTS ===');
    console.log(`SW registered:       ${swInfo.registered ? '✅' : '❌'}`);
    console.log(`Manifest present:    ${manifestLink ? '✅' : '❌'}`);
    console.log(`Theme color set:     ${themeColor ? '✅' : '❌'}`);
    console.log(`Online render:       ${onlineRootLen > 100 ? '✅' : '❌'} (${onlineRootLen} chars)`);
    console.log(`Offline shell loads: ${(!isChromeDino && offlineRootLen > 100) ? '✅' : '❌'} (${offlineRootLen} chars)`);

    const pass = swInfo.registered && manifestLink && themeColor && onlineRootLen > 100 && !isChromeDino && offlineRootLen > 100;
    console.log(`\n${pass ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
  } catch (err) {
    console.log('❌ Offline reload threw:', err.message);
  }

  await browser.close();
})();
