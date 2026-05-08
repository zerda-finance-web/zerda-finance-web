const express      = require('express');
const session      = require('express-session');
const fs           = require('fs');
const path         = require('path');
const nodemailer = require('nodemailer');

// ── Email transporter (configura EMAIL_USER y EMAIL_PASS en Render) ──
const mailer = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
  : null;

if (!mailer) console.warn('  ⚠️  EMAIL_USER / EMAIL_PASS no configurados — correos desactivados');

const app   = express();
const PORT  = process.env.PORT || 3000;

// ── Cambia esta contraseña ──────────────────────────────────────
const ADMIN_PASSWORD = 'zerda2025';
// ───────────────────────────────────────────────────────────────

const LEADS_FILE = process.env.LEADS_PATH || path.join(__dirname, 'leads.json');
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]');

function readLeads()       { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
function writeLeads(leads) { fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2)); }
function nextId(leads)     { return leads.length === 0 ? 1 : Math.max(...leads.map(l => l.id)) + 1; }

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
    }
}));
app.use(session({
    secret: 'zf-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

// ── PUBLIC: enviar diagnóstico ──────────────────────────────────
app.post('/api/lead', (req, res) => {
    const { nombre, correo, facturacion, descripcion } = req.body;
    if (!nombre || !correo) {
        return res.status(400).json({ error: 'Nombre y correo son requeridos.' });
    }
    const leads = readLeads();
    const lead = {
        id:          nextId(leads),
        nombre:      nombre.trim(),
        correo:      correo.trim().toLowerCase(),
        facturacion: facturacion || '',
        descripcion: descripcion || '',
        status:      'Nuevo',
        notas:       '',
        fecha:       new Date().toISOString()
    };
    leads.push(lead);
    writeLeads(leads);
    console.log(`[NUEVO LEAD] ${lead.nombre} <${lead.correo}>`);
    res.json({ success: true });
});

// ── ADMIN AUTH ──────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Contraseña incorrecta.' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
    res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

function auth(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ error: 'No autorizado.' });
}

// ── ADMIN: LEADS ────────────────────────────────────────────────
app.get('/api/admin/leads', auth, (_req, res) => {
    const leads = readLeads().slice().reverse();
    res.json(leads);
});

app.patch('/api/admin/leads/:id', auth, (req, res) => {
    const id    = parseInt(req.params.id);
    const leads = readLeads();
    const idx   = leads.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lead no encontrado.' });
    const { status, notas } = req.body;
    if (status !== undefined) leads[idx].status = status;
    if (notas  !== undefined) leads[idx].notas  = notas;
    writeLeads(leads);
    res.json({ success: true, lead: leads[idx] });
});

app.delete('/api/admin/leads/:id', auth, (req, res) => {
    const id    = parseInt(req.params.id);
    const leads = readLeads().filter(l => l.id !== id);
    writeLeads(leads);
    res.json({ success: true });
});

// ── Simulador financiero ────────────────────────────────────────
app.get('/simulador', (_req, res) => {
    res.sendFile(path.join(__dirname, 'simulador.html'));
});

// ── Enviar plan financiero por correo ───────────────────────────
app.post('/api/enviar-plan', async (req, res) => {
    const { nombreUser, correo, empresa, tipo, kpis, eerr } = req.body;
    console.log(`[ENVIAR-PLAN] correo=${correo} empresa=${empresa}`);
    if (!correo) return res.status(400).json({ error: 'Correo requerido.' });

    if (!mailer) {
        console.log(`[PLAN] (sin email) ${nombreUser} <${correo}> — ${empresa}`);
        return res.json({ success: true, skipped: true });
    }

    try {
        await mailer.sendMail({
            from:    `"Zerda Finance" <${process.env.EMAIL_USER}>`,
            to:      correo,
            subject: `Tu Plan Financiero — ${empresa || 'Zerda Finance'}`,
            html:    buildPlanEmail({ nombreUser, empresa, tipo, kpis, eerr })
        });
        console.log(`[PLAN ENVIADO] ${nombreUser} <${correo}>`);
        res.json({ success: true });
    } catch (err) {
        console.error('[EMAIL ERROR]', err.message);
        res.status(500).json({ error: 'No se pudo enviar el correo.' });
    }
});

function buildPlanEmail({ nombreUser, empresa, tipo, kpis, eerr }) {
    const dark = '#0F2035', teal = '#00BDD0', muted = '#64748b';
    const ag = process.env.CALENDLY_URL || 'mailto:oscar@zerdafinance.com?subject=Quiero%20agendar%20una%20sesi%C3%B3n';

    const kpiHtml = kpis.map(k => `
      <td width="25%" style="padding:6px">
        <div style="background:#fff;border-radius:8px;padding:14px 10px;border-top:3px solid ${teal};text-align:center">
          <div style="font-size:11px;color:${muted};font-family:Arial,sans-serif;margin-bottom:6px">${k.l}</div>
          <div style="font-size:15px;font-weight:700;color:${k.neg?'#ef4444':dark};font-family:Arial,sans-serif">${k.v}</div>
        </div>
      </td>`).join('');

    const thHtml = (eerr[0]||[]).map((h,i) => `
      <th style="padding:8px 12px;text-align:${i===0?'left':'right'};font-size:12px;color:#fff;background:${dark};font-family:Arial,sans-serif;font-weight:600">${h}</th>`).join('');

    const trHtml = eerr.slice(1).map((row, ri) => {
        const sec = ['MARGEN BRUTO','EBITDA','COSTOS FIJOS'].some(s => row[0].startsWith(s));
        const bg  = sec ? '#eef2f7' : (ri%2===0 ? '#fff' : '#f8fafc');
        const fw  = sec ? '700' : '400';
        const cells = row.map((c,i) => `
          <td style="padding:7px 12px;text-align:${i===0?'left':'right'};font-size:12px;font-weight:${fw};color:${dark};font-family:Arial,sans-serif">${c}</td>`).join('');
        return `<tr style="background:${bg}">${cells}</tr>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">

  <!-- Header -->
  <tr><td style="background:${dark};border-radius:12px 12px 0 0;padding:26px 32px">
    <div style="font-size:20px;font-weight:700;color:#fff;font-family:Arial,sans-serif">ZERDA FINANCE</div>
    <div style="font-size:13px;color:${teal};margin-top:4px;font-family:Arial,sans-serif">Plan Financiero Proyectado — 12 Meses</div>
    <div style="height:2px;background:${teal};margin-top:14px;border-radius:2px"></div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:28px 32px">

    <p style="font-size:16px;color:${dark};margin:0 0 6px;font-family:Arial,sans-serif">Hola <strong>${nombreUser}</strong>,</p>
    <p style="font-size:14px;color:${muted};margin:0 0 24px;line-height:1.6;font-family:Arial,sans-serif">
      Aquí está el resumen de tu plan financiero para <strong>${empresa}</strong> (${tipo}).
      Puedes descargar el PDF y el Excel completo desde la plataforma.
    </p>

    <!-- KPIs -->
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:12px;font-family:Arial,sans-serif">INDICADORES CLAVE</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>${kpiHtml}</tr></table>
    </div>

    <!-- EERR -->
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:10px;font-family:Arial,sans-serif">ESTADO DE RESULTADOS — MES 1 vs MES 12</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr>${thHtml}</tr>${trHtml}
      </table>
    </div>

    <!-- CTA -->
    <div style="background:#f0feff;border-radius:12px;padding:24px;text-align:center;border:1.5px solid #a5f3fc">
      <div style="font-size:15px;font-weight:700;color:${dark};margin-bottom:8px;font-family:Arial,sans-serif">¿Quieres profundizar en estos números?</div>
      <p style="font-size:13px;color:${muted};margin:0 0 18px;line-height:1.6;font-family:Arial,sans-serif">
        Oscar puede ayudarte a interpretar tu plan, afinar los supuestos y definir las decisiones que lo hacen real.
      </p>
      <a href="${ag}" style="display:inline-block;padding:12px 28px;background:${teal};color:${dark};font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;font-family:Arial,sans-serif">
        Agenda tu sesión →
      </a>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
    <p style="font-size:11px;color:#94a3b8;margin:0;font-family:Arial,sans-serif">
      Zerda Finance &nbsp;·&nbsp; <a href="https://www.zerdafinance.com" style="color:${teal}">www.zerdafinance.com</a> &nbsp;·&nbsp; oscar@zerdafinance.com<br>
      Correo generado automáticamente desde el simulador de Zerda Finance.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

// ── Redirect old blog URLs ──────────────────────────────────────
app.get('/blog/:slug', (req, res) => {
    res.redirect(301, '/blog.html');
});

// ── START ───────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('  🐺  Zerda Finance — servidor activo');
    console.log(`  →  Sitio web : http://localhost:${PORT}`);
    console.log(`  →  Admin CRM : http://localhost:${PORT}/admin.html`);
    console.log(`  →  Contraseña: ${ADMIN_PASSWORD}`);
    console.log('');
});
