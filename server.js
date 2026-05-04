const express  = require('express');
const session  = require('express-session');
const fs       = require('fs');
const path     = require('path');

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
