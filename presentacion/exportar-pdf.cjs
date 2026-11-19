/* Exporta la presentación a PDF (una página 16:9 por diapositiva, todo visible).
   Uso:  npx -y http-server -p 8080 .   (en otra terminal, desde esta carpeta)
         node exportar-pdf.cjs http://localhost:8080/index.html
   Requiere Playwright (npm i -D playwright && npx playwright install chromium). */
const { chromium } = require("playwright");

(async () => {
  const url = (process.argv[2] || "http://localhost:8080/index.html") + "?print-pdf";
  const salida = process.argv[3] || "Nutrikowi_Presentacion_Direccion_Nov2026.pdf";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.pdf({ path: salida, width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: false });
  await browser.close();
  console.log("PDF generado:", salida);
})();
