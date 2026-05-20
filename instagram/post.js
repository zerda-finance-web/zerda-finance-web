import puppeteer from 'puppeteer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_DIR = path.join(__dirname, 'slides');
const templateArg = process.argv[2];
const CAROUSEL_HTML = templateArg
  ? path.resolve(__dirname, '..', templateArg)
  : path.join(__dirname, '..', 'carrusel.html');
const TOTAL_SLIDES = 7;

console.log(`📄 Template: ${path.basename(CAROUSEL_HTML)}`);

const { META_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID, IMGBB_API_KEY } = process.env;

// ── 1. Capturar slides como PNG ──────────────────────────────
async function captureSlides() {
  console.log('📸 Capturando slides...');
  if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });

  const fileUrl = `file:///${CAROUSEL_HTML.replace(/\\/g, '/')}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Esperar que carguen las fuentes de Google
  await new Promise(r => setTimeout(r, 2000));

  const slidePaths = [];

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    const selector = `.slide:nth-of-type(${i})`;
    const slideEl = await page.$(selector);
    if (!slideEl) {
      console.warn(`  ⚠️  Slide ${i} no encontrado, saltando`);
      continue;
    }

    const outputPath = path.join(SLIDES_DIR, `slide_${String(i).padStart(2, '0')}.png`);
    await slideEl.screenshot({ path: outputPath, type: 'png' });
    console.log(`  ✓ Slide ${i} → ${path.basename(outputPath)}`);
    slidePaths.push(outputPath);
  }

  await browser.close();
  console.log(`\n✅ ${slidePaths.length} slides capturados\n`);
  return slidePaths;
}

// ── 2. Subir imagen a ImgBB ──────────────────────────────────
async function uploadToImgbb(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  const form = new FormData();
  form.append('image', base64);
  form.append('key', IMGBB_API_KEY);

  const res = await axios.post('https://api.imgbb.com/1/upload', form, {
    headers: form.getHeaders(),
  });

  return res.data.data.url;
}

async function uploadAllSlides(slidePaths) {
  console.log('☁️  Subiendo imágenes a ImgBB...');
  const urls = [];
  for (const [i, slidePath] of slidePaths.entries()) {
    const url = await uploadToImgbb(slidePath);
    console.log(`  ✓ Slide ${i + 1} → ${url}`);
    urls.push(url);
  }
  console.log('\n✅ Todas las imágenes subidas\n');
  return urls;
}

// ── 3. Crear containers de media en Instagram ────────────────
async function createMediaContainer(imageUrl, isCarouselItem = true) {
  const params = {
    image_url: imageUrl,
    access_token: META_ACCESS_TOKEN,
  };
  if (isCarouselItem) params.is_carousel_item = true;

  const res = await axios.post(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_BUSINESS_ID}/media`,
    null,
    { params }
  );
  return res.data.id;
}

// ── 4. Crear container del carrusel ─────────────────────────
async function createCarouselContainer(childContainerIds, caption) {
  const res = await axios.post(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_BUSINESS_ID}/media`,
    null,
    {
      params: {
        media_type: 'CAROUSEL',
        children: childContainerIds.join(','),
        caption,
        access_token: META_ACCESS_TOKEN,
      },
    }
  );
  return res.data.id;
}

// ── 5. Publicar ──────────────────────────────────────────────
async function publishCarousel(carouselContainerId) {
  const res = await axios.post(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_BUSINESS_ID}/media_publish`,
    null,
    {
      params: {
        creation_id: carouselContainerId,
        access_token: META_ACCESS_TOKEN,
      },
    }
  );
  return res.data.id;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  if (!META_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ID || !IMGBB_API_KEY) {
    console.error('❌ Faltan credenciales en el archivo .env');
    console.error('   Copia .env.example como .env y completa los valores');
    process.exit(1);
  }

  // Si existe caption.txt generado por el agente, usarlo; si no, usar el default
  const captionFile = path.join(__dirname, 'caption.txt');
  const caption = fs.existsSync(captionFile)
    ? fs.readFileSync(captionFile, 'utf-8').trim()
    : `¿Tu negocio vende bien pero la caja no alcanza? 💡\n\nEl problema no es cuánto vendes. Es cómo estás estructurado.\n\nEn Zerda Finance ayudamos a emprendedores, startups y PYMEs a entender sus números y tomar mejores decisiones — sin teoría, con implementación.\n\n👉 Desliza para ver qué hacemos y si es para ti.\n\n#ZerdaFinance #FinanzasParaEmprendedores #CFOExterno #Startups #PYME #FinanzasChile #EmprendimientoChile #ControlFinanciero #Rentabilidad #PlanFinanciero`;

  try {
    // Paso 1: Capturar slides
    const slidePaths = await captureSlides();

    // Paso 2: Subir a ImgBB
    const imageUrls = await uploadAllSlides(slidePaths);

    // Paso 3: Crear media containers
    console.log('🔧 Creando media containers en Instagram...');
    const containerIds = [];
    for (const [i, url] of imageUrls.entries()) {
      const id = await createMediaContainer(url);
      console.log(`  ✓ Container slide ${i + 1}: ${id}`);
      containerIds.push(id);
      // Esperar entre requests para no saturar la API
      await new Promise(r => setTimeout(r, 1000));
    }

    // Paso 4: Crear carousel container
    console.log('\n🎠 Creando carousel container...');
    const carouselId = await createCarouselContainer(containerIds, caption);
    console.log(`  ✓ Carousel ID: ${carouselId}`);

    // Esperar 5s antes de publicar (recomendado por Meta)
    console.log('\n⏳ Esperando 5 segundos antes de publicar...');
    await new Promise(r => setTimeout(r, 5000));

    // Paso 5: Publicar
    console.log('🚀 Publicando en Instagram...');
    const postId = await publishCarousel(carouselId);
    console.log(`\n✅ ¡Publicado exitosamente! Post ID: ${postId}`);
    console.log('   Ya puedes verlo en instagram.com/zerdafinance');

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('\n❌ Error:', msg);
    if (err.response?.data) {
      console.error('   Detalle:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
