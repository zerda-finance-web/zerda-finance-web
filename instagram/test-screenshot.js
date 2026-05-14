// Test: captura el slide 1 para verificar que Puppeteer funciona
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAROUSEL_HTML = path.join(__dirname, '..', 'carrusel.html');
const OUT = path.join(__dirname, 'test_slide1.png');

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });

const fileUrl = `file:///${CAROUSEL_HTML.replace(/\\/g, '/')}`;
console.log('Cargando:', fileUrl);
await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));

const slide = await page.$('.slide:nth-of-type(1)');
await slide.screenshot({ path: OUT, type: 'png' });

await browser.close();
console.log('✅ Screenshot guardado en:', OUT);
