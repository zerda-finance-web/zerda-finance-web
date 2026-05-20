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
    const { nombre, correo, facturacion, descripcion, fuente, nombreUser } = req.body;
    if (!nombre || !correo) {
        return res.status(400).json({ error: 'Nombre y correo son requeridos.' });
    }
    const leads = readLeads();
    const lead = {
        id:          nextId(leads),
        nombre:      nombre.trim(),
        nombreUser:  nombreUser ? nombreUser.trim() : '',
        correo:      correo.trim().toLowerCase(),
        facturacion: facturacion || '',
        descripcion: descripcion || '',
        fuente:      fuente || 'web',
        status:      'Nuevo',
        notas:       '',
        fecha:       new Date().toISOString()
    };
    leads.push(lead);
    writeLeads(leads);
    console.log(`[NUEVO LEAD] ${lead.nombre} <${lead.correo}> [${lead.fuente}]`);
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

function buildPlanEmail({ nombreUser, empresa, tipo, kpis, eerr, meses, escenarios }) {
    const dark = '#0F2035', teal = '#00BDD0', muted = '#64748b', red = '#ef4444', green = '#10b981';
    const ag = process.env.CALENDLY_URL || 'mailto:oscar@zerdafinance.com?subject=Quiero%20agendar%20una%20sesi%C3%B3n';
    const fmt = n => {
        if (n === undefined || n === null) return '—';
        const abs = Math.abs(Math.round(n));
        const s = abs.toLocaleString('es-CL');
        return n < 0 ? `($${s})` : `$${s}`;
    };

    // KPIs — 2 filas de 3 si hay 5+, sino 1 fila
    const kpiCols = kpis.length <= 4 ? kpis.length : Math.ceil(kpis.length / 2);
    const kpiRows = [];
    for (let i = 0; i < kpis.length; i += kpiCols) kpiRows.push(kpis.slice(i, i + kpiCols));
    const kpiHtml = kpiRows.map(row => {
        const cells = row.map(k => `
          <td width="${Math.round(100/kpiCols)}%" style="padding:5px">
            <div style="background:#fff;border-radius:8px;padding:12px 8px;border-top:3px solid ${k.neg?red:teal};text-align:center">
              <div style="font-size:10px;color:${muted};font-family:Arial,sans-serif;margin-bottom:5px">${k.l}</div>
              <div style="font-size:14px;font-weight:700;color:${k.neg?red:dark};font-family:Arial,sans-serif">${k.v}</div>
            </div>
          </td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    // EERR Mes 1 vs Mes 12
    const thHtml = (eerr[0]||[]).map((h,i) =>
      `<th style="padding:8px 12px;text-align:${i===0?'left':'right'};font-size:12px;color:#fff;background:${dark};font-family:Arial,sans-serif;font-weight:600">${h}</th>`).join('');
    const trHtml = eerr.slice(1).map((row, ri) => {
        const isSec = ['MARGEN BRUTO','EBITDA'].some(s => row[0].startsWith(s));
        const bg = isSec ? '#eef2f7' : (ri%2===0?'#fff':'#f8fafc');
        const fw = isSec ? '700' : '400';
        const cells = row.map((c,i) =>
          `<td style="padding:7px 12px;text-align:${i===0?'left':'right'};font-size:12px;font-weight:${fw};color:${dark};font-family:Arial,sans-serif">${c}</td>`).join('');
        return `<tr style="background:${bg}">${cells}</tr>`;
    }).join('');

    // Tabla mensual completa (Ingresos / EBITDA por mes)
    let monthlyHtml = '';
    if (meses && meses.length) {
        const mTh = ['Mes','Ingresos','Margen Bruto','EBITDA'].map((h,i) =>
          `<th style="padding:6px 8px;text-align:${i===0?'left':'right'};font-size:11px;color:#fff;background:${dark};font-family:Arial,sans-serif">${h}</th>`).join('');
        const mTr = meses.map((m,i) => {
            const pos = m.ebit >= 0;
            const bg  = i%2===0?'#fff':'#f8fafc';
            return `<tr style="background:${bg}">
              <td style="padding:5px 8px;font-size:11px;color:${muted};font-family:Arial,sans-serif">${m.label}</td>
              <td style="padding:5px 8px;text-align:right;font-size:11px;color:${dark};font-family:Arial,sans-serif">${fmt(m.ing)}</td>
              <td style="padding:5px 8px;text-align:right;font-size:11px;color:${dark};font-family:Arial,sans-serif">${fmt(m.mb)} <span style="color:${muted}">(${m.mbPct.toFixed(1)}%)</span></td>
              <td style="padding:5px 8px;text-align:right;font-size:11px;font-weight:700;color:${pos?green:red};font-family:Arial,sans-serif">${fmt(m.ebit)}</td>
            </tr>`;
        }).join('');
        monthlyHtml = `
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:10px;font-family:Arial,sans-serif">EVOLUCIÓN MENSUAL — 12 MESES</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr>${mTh}</tr>${mTr}
      </table>
    </div>`;
    }

    // Escenarios P/R/O
    let scenHtml = '';
    if (escenarios && escenarios.length) {
        const colors = { 'Pesimista':'#fef2f2', 'Realista':'#f0fdf4', 'Optimista':'#f0feff' };
        const borders = { 'Pesimista':red, 'Realista':green, 'Optimista':teal };
        const scenCells = escenarios.map(sc => {
            const bg  = colors[sc.label]  || '#f8fafc';
            const bdr = borders[sc.label] || teal;
            const pos = sc.ebit12 >= 0;
            const verdict = sc.mesPosEbit
              ? (sc.mesPosEbit === 1 ? 'Positivo desde mes 1 ✓' : `Positivo desde mes ${sc.mesPosEbit} ✓`)
              : 'Negativo todo el año';
            return `
          <td width="33%" style="padding:6px;vertical-align:top">
            <div style="background:${bg};border-radius:10px;padding:14px 12px;border-top:3px solid ${bdr}">
              <div style="font-size:10px;font-weight:700;color:${bdr};font-family:Arial,sans-serif;margin-bottom:2px">${sc.icon} ${sc.label.toUpperCase()}</div>
              <div style="font-size:10px;color:${muted};font-family:Arial,sans-serif;margin-bottom:10px">${sc.delta}</div>
              <div style="font-size:11px;color:${dark};font-family:Arial,sans-serif;margin-bottom:4px">Ingresos mes 12<br><strong>${fmt(sc.ing12)}</strong></div>
              <div style="font-size:11px;color:${dark};font-family:Arial,sans-serif;margin-bottom:4px">Margen bruto prom.<br><strong>${sc.mbAvg.toFixed(1)}%</strong></div>
              <div style="font-size:11px;color:${dark};font-family:Arial,sans-serif;margin-bottom:8px">EBITDA mes 12<br><strong style="color:${pos?green:red}">${fmt(sc.ebit12)}</strong></div>
              <div style="font-size:10px;color:${pos?green:red};font-weight:700;font-family:Arial,sans-serif">${verdict}</div>
            </div>
          </td>`;
        }).join('');
        scenHtml = `
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:10px;font-family:Arial,sans-serif">ESCENARIOS: ¿TU PLAN ES FRÁGIL O ROBUSTO?</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>${scenCells}</tr></table>
    </div>`;
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 0">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">

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
      Aquí está el plan financiero completo de <strong>${empresa}</strong> (${tipo}) para los próximos 12 meses.
    </p>

    <!-- KPIs -->
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:12px;font-family:Arial,sans-serif">INDICADORES CLAVE</div>
      <table width="100%" cellpadding="0" cellspacing="0">${kpiHtml}</table>
    </div>

    <!-- EERR Mes 1 vs Mes 12 -->
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:10px;font-family:Arial,sans-serif">ESTADO DE RESULTADOS — MES 1 vs MES 12</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr>${thHtml}</tr>${trHtml}
      </table>
    </div>

    ${monthlyHtml}
    ${scenHtml}

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
