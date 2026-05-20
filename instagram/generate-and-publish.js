import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CLAUDE_BIN = 'C:\\Users\\check\\.local\\bin\\claude.exe';

const TEMPLATE_TYPE = process.argv[2];
if (!TEMPLATE_TYPE) {
  console.error('❌ Uso: node generate-and-publish.js <tipo>');
  console.error('   Tipos: tip-financiero | educacion-financiera | caso-cliente | servicios-zerda');
  process.exit(1);
}

// ── Contexto de Zerda Finance ────────────────────────────────
const ZERDA_CONTEXT = `Zerda Finance — CFO externo para emprendedores, startups y PYMEs en Chile.
Founder: Oscar Rincón, +15 años en finanzas (Citibank, Carey, Aramark).
Servicios: diagnóstico financiero, plan financiero, pricing, KPIs, acompañamiento mensual.
Metodología CORE: Claridad → Orden → Rentabilidad → Escalabilidad.
No hace: contabilidad ni conseguir financiamiento.
Ha trabajado con: clínicas, cafeterías, SaaS, e-commerce, estudios legales, producción de alimentos.
Filosofías: "No partimos del Excel, partimos de las decisiones." / "La caja te mantiene vivo hoy, el EBITDA define tu futuro."
Audiencia: dueños de negocios 1–50 empleados, ventas USD 50K–2M, Chile/LATAM.
Errores comunes del cliente: vender más sin orden, no entender márgenes, confundir contabilidad con finanzas.
Tono: directo, humano, sin humo. Como alguien que ya estuvo en la cancha.`;

const TEMPLATE_FOCUS = {
  'tip-financiero': `Un consejo financiero práctico y accionable.
Elige un tip DIFERENTE al ejemplo del template (que usa CAC). Rota entre estos temas semana a semana:
punto de equilibrio, flujo de caja, margen de contribución, payback, burn rate, runway,
cuentas por cobrar, estructura de costos, mezcla de productos, sueldo del dueño como costo,
descuentos y su impacto en margen, estacionalidad, pricing estratégico, etc.
El tip debe ser inmediatamente aplicable — el lector puede actuar hoy.`,

  'educacion-financiera': `Explicar un concepto financiero de forma simple.
Elige un concepto DIFERENTE al ejemplo del template (que usa EBITDA). Rota entre:
punto de equilibrio, flujo de caja libre, CAC, LTV, margen bruto vs neto, runway,
burn rate, capital de trabajo, ratio LTV/CAC, payback period, precio/valor percibido, etc.
Estructura: concepto como héroe → definición simple + analogía → usos → fórmula → ejemplo con números → cuándo usarlo.`,

  'caso-cliente': `Un caso de cliente realista (puede ser compuesto/anónimo).
Elige una industria DIFERENTE al ejemplo del template. Rota entre:
cafetería/restaurante, clínica/médico, e-commerce, SaaS, consultora, estudio legal,
producción de alimentos, retail, academia/cursos, agencia de marketing, transporte, construcción.
El número del resultado debe ser impactante y creíble.
Estructura: resultado impactante → quién era → el problema → acciones concretas → resultado en números → la lección.`,

  'servicios-zerda': `Presenta los servicios de Zerda Finance desde un ángulo DIFERENTE al template base. Rota entre:
- El dolor específico de no tener orden financiero
- Un servicio en profundidad (ej: solo el diagnóstico)
- CFO interno vs CFO externo: la comparación real
- El costo de no saber tus números
- Antes/después de trabajar con Zerda
Elige el ángulo más fresco y desarrolla desde ahí.`
};

// ── Seleccionar foto del banco ───────────────────────────────
function selectWeeklyPhoto(weekOfYear) {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);

  const bankDir = 'C:\\Users\\check\\Desktop\\Proyecto\\Marketing';
  const SKIP_DIRS = new Set(['node_modules', 'instagram', 'templates', 'ICONOS', 'PNG',
                             'Ejemplos', 'Logo y Manual de Uso', 'logos', '.git', '.claude']);

  const photos = [];

  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) scan(path.join(dir, entry.name));
      } else if (/\.(jpg|jpeg)$/i.test(entry.name)) {
        photos.push(path.join(dir, entry.name));
      }
    }
  }

  scan(bankDir);
  photos.sort();

  if (photos.length === 0) return null;

  const absPath = photos[dayOfYear % photos.length];
  return {
    name: path.basename(absPath),
    fileUrl: `file:///${absPath.replace(/\\/g, '/')}`
  };
}

// ── Generar HTML fresco via Claude CLI ──────────────────────
function generateFreshHTML() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const weekOfYear = Math.ceil(
    (today - new Date(today.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)
  );

  const photo = selectWeeklyPhoto(weekOfYear);

  const templatePath = path.join(ROOT, 'templates', `${TEMPLATE_TYPE}.html`);
  const baseHTML = fs.readFileSync(templatePath, 'utf-8');

  if (photo) console.log(`📷 Foto seleccionada: ${photo.name}`);
  console.log(`🤖 Generando contenido fresco — Semana ${weekOfYear} — ${dateStr}`);

  const prompt = `Eres el equipo de contenido de Zerda Finance. Tu tarea es crear un carrusel de Instagram con contenido FRESCO.

FECHA: ${dateStr} (Semana ${weekOfYear} del año)
TEMPLATE: ${TEMPLATE_TYPE}

CONTEXTO DE ZERDA FINANCE:
${ZERDA_CONTEXT}

ENFOQUE PARA ESTA SEMANA:
${TEMPLATE_FOCUS[TEMPLATE_TYPE]}

REGLAS:
- Contenido 100% diferente al ejemplo que ya está en el template
- Usa la semana ${weekOfYear} como semilla para elegir un tema específico y diferente
- Datos concretos con números reales o ilustrativos
- Máximo 40 palabras por slide
- Tono directo, sin academicismo, como Oscar Rincón hablando con un emprendedor
- Slide 1: scroll stopper — una pregunta o afirmación que duela o genere curiosidad inmediata

INSTRUCCIONES TÉCNICAS:
1. Mantén TODA la estructura HTML, clases CSS, elementos decorativos y layout EXACTAMENTE igual
2. Cambia ÚNICAMENTE el texto de contenido visible
3. El resultado debe ser diferente al ejemplo pero usar las mismas clases y estructura
${photo ? `4. FOTO DE OSCAR RINCÓN: integra la siguiente foto en el carrusel.
   URL local (funciona en Puppeteer): ${photo.fileUrl}
   Intégrala en el slide 7 (CTA) como foto circular de perfil de Oscar, usando:
   <img src="${photo.fileUrl}" style="width:160px;height:160px;border-radius:50%;object-fit:cover;object-position:top;border:4px solid var(--cyan);margin-bottom:24px;">
   Colócala dentro del .content del slide 7, justo antes del .eye div.
   Si la composición del slide 7 no lo permite de forma limpia, ponla en el slide 6 donde aparece el sidebar de Zerda.` : ''}
5. Al final del HTML, antes de </body>, agrega este bloque con el caption para Instagram:
<!-- CAPTION
{caption aquí: máx 150 palabras, incluye hashtags relevantes para emprendedores chilenos}
END_CAPTION -->

HTML TEMPLATE BASE (copia y modifica solo el texto):
${baseHTML}

Responde ÚNICAMENTE con el HTML completo. Sin explicaciones. Solo el HTML puro empezando con <!DOCTYPE html>.`;

  const result = spawnSync(CLAUDE_BIN, ['--print', '--output-format', 'text'], {
    input: prompt,
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: 300000
  });

  if (result.error) throw new Error(`Claude CLI error: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Claude CLI salió con código ${result.status}:\n${result.stderr}`);

  const output = result.stdout.trim();
  if (!output.includes('<!DOCTYPE html>')) {
    throw new Error('Claude no devolvió HTML válido. Output:\n' + output.slice(0, 500));
  }

  return output;
}

// ── Extraer caption del HTML ─────────────────────────────────
function extractCaption(html) {
  const match = html.match(/<!--\s*CAPTION\s*([\s\S]*?)END_CAPTION\s*-->/);
  return match ? match[1].trim() : null;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  if (!process.env.META_ACCESS_TOKEN || !process.env.INSTAGRAM_BUSINESS_ID || !process.env.IMGBB_API_KEY) {
    console.error('❌ Faltan credenciales en .env');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const tempHTML = path.join(ROOT, `_temp-${TEMPLATE_TYPE}-${today}.html`);
  const captionFile = path.join(__dirname, 'caption.txt');

  try {
    // 1. Generar HTML fresco con Claude CLI
    const freshHTML = generateFreshHTML();
    fs.writeFileSync(tempHTML, freshHTML, 'utf-8');
    console.log(`✅ HTML generado: ${path.basename(tempHTML)}`);

    // 2. Extraer y guardar caption
    const caption = extractCaption(freshHTML);
    if (caption) {
      fs.writeFileSync(captionFile, caption, 'utf-8');
      console.log(`📝 Caption listo (${caption.length} chars)`);
    } else {
      console.warn('⚠️  Sin caption generado — se usará el default');
      if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);
    }

    // 3. Publicar con el pipeline existente
    console.log('\n🚀 Publicando...\n');
    const relPath = path.relative(ROOT, tempHTML).replace(/\\/g, '/');
    const result = spawnSync('node', ['post.js', relPath], {
      cwd: __dirname,
      stdio: 'inherit',
      encoding: 'utf-8'
    });

    // 4. Limpiar temporales
    if (fs.existsSync(tempHTML)) fs.unlinkSync(tempHTML);
    if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);

    if (result.status !== 0) process.exit(result.status || 1);

  } catch (err) {
    if (fs.existsSync(tempHTML)) fs.unlinkSync(tempHTML);
    if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
