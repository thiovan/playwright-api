const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <div class="card"><a>Link 1</a></div>
    <div class="card"><a>Link 2</a></div>
  `);

  try {
    const loc1 = page.locator(".card >> nth=0 > a");
    console.log("loc1 text:", await loc1.textContent());
  } catch (e) {
    console.error("Error with >> nth=0 > a :", e.message);
  }

  try {
    const loc2 = page.locator(".card >> nth=0 >> a");
    console.log("loc2 text:", await loc2.textContent());
  } catch (e) {
    console.error("Error with >> nth=0 >> a :", e.message);
  }
  
  try {
    const loc3 = page.locator(".card:nth-match(1) > a");
    console.log("loc3 text:", await loc3.textContent());
  } catch (e) {
    console.error("Error with :nth-match :", e.message);
  }

  await browser.close();
})();
