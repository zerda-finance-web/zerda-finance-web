# PROYECTO.md — Memoria Compartida: Antigravity + Claude Code
> Este archivo es la **única fuente de verdad** del proyecto.
> Ambas IAs (Antigravity y Claude Code) deben leerlo al inicio de cada sesión y actualizarlo cuando haya cambios importantes.

---

## 📁 Ubicación del Proyecto

```
C:\Users\check\Desktop\Proyecto\Marketing\
```

**Workspace recomendado en Antigravity:** `C:\Users\check\Desktop\Proyecto\Marketing`

---

## 🧠 Quién es Oscar Rincón

- **Founder de Zerda Finance** | Santiago, Chile
- +15 años en finanzas (Citibank, Carey, Aramark, Checkeados como CFO)
- Perfil: CFO con calle — mezcla mundo corporativo con startups
- Decisiones basadas en datos, enfoque práctico (no académico)

---

## 🏢 Qué es Zerda Finance

Ayuda a emprendedores, startups y PYMEs a ordenar sus finanzas, entender sus números y tomar mejores decisiones.

**Sí hace:** diagnóstico financiero, modelos financieros, plan de crecimiento, pricing, KPIs, acompañamiento mensual, preparación para levantamiento de capital.  
**No hace:** contabilidad, conseguir financiamiento directamente.

**Industrias que atiende:** Clínicas, Cafeterías, SaaS, E-commerce, Estudios Legales, Alimentos, Financieras, Startups.

**Contacto:** oscar@zerdafinance.com | WhatsApp: +56976830798  
**Web:** https://www.zerdafinance.com

---

## 🗂️ Estructura del Proyecto (Archivos Clave)

| Archivo | Descripción |
|---|---|
| `index.html` | Página principal del sitio web (78KB, ~1843 líneas) |
| `simulador.html` | Simulador financiero interactivo |
| `diagnostico.html` | Formulario de diagnóstico / captación de leads |
| `admin.html` | Panel CRM de administración de leads |
| `carrusel.html` | Carrusel de contenido |
| `server.js` | Backend Express (Node.js) |
| `leads.json` | Base de datos local de leads |
| `package.json` | Dependencias: express, express-session, nodemailer |

### Backend (server.js)

- **Framework:** Express.js (Node.js)
- **Puerto:** 3000 (local) / variable `PORT` en producción
- **Admin password:** `zerda2025`
- **Email:** nodemailer via Gmail (`EMAIL_USER` / `EMAIL_PASS`)
- **Calendly URL:** variable `CALENDLY_URL`

**Endpoints principales:**
- `POST /api/lead` — Crear nuevo lead (público)
- `POST /api/admin/login` — Autenticación admin
- `GET /api/admin/leads` — Listar leads (requiere auth)
- `PATCH /api/admin/leads/:id` — Editar lead
- `DELETE /api/admin/leads/:id` — Eliminar lead
- `POST /api/enviar-plan` — Enviar plan financiero por email
- `GET /simulador` — Sirve simulador.html

---

## 🎨 Design System (index.html)

### Fuente
- **Plus Jakarta Sans** (Google Fonts) — pesos 400, 500, 600, 700, 800

### Paleta de Colores (CSS variables)
```css
--dark:        #0F2035   /* Fondo oscuro principal */
--dark-mid:    #1A3252
--dark-light:  #243D5E
--accent:      #00BDD0   /* Teal/cian — color principal de marca */
--accent-dark: #009BAB
--accent-bg:   #E4F9FB
--white:       #FFFFFF
--off-white:   #F4F8FB
--gray-100:    #E8EDF3
--gray-200:    #C5CDD8
--gray-400:    #7A8A9A
--text:        #0F2035
--text-mid:    #3D5166
--radius:      16px
```

### Secciones del index.html (en orden)
1. **Navbar** — Fixed, glassmorphism al hacer scroll, hamburger en mobile
2. **Hero** — Dark gradient, h1 con `<em>` en accent, stats (15 años / +50 empresas / 8 industrias)
3. **Industries Strip** — Tags de industrias
4. **Problem Section** — 5 tarjetas de problemas comunes
5. **Quote Break** — Dark, blockquote destacado
6. **Method (CORE)** — Dark bg, 4 pasos: **C**laridad / **O**rden / **R**entabilidad / **E**scalabilidad
7. **Services** — Grid de servicios con iconos SVG y tags
8. **About** — Grid 2 columnas (foto + bio Oscar)
9. **Process** — 3 pasos con línea conectora
10. **Comparison Table** — Dark bg, Zerda vs Contador vs Consultor
11. **Testimonials** — Dark bg, grid de tarjetas
12. **FAQ** — Accordion, fondo blanco
13. **Final CTA** — Dark gradient
14. **Footer** — `#070E1A`, grid 4 columnas
15. **WhatsApp Float** — Botón flotante verde

---

## 🚀 Cómo Correr el Proyecto

```bash
cd "C:\Users\check\Desktop\Proyecto\Marketing"
npm start
# → http://localhost:3000
# → Admin: http://localhost:3000/admin.html  (pass: zerda2025)
```

---

## 📋 Estado Actual / Pendientes

> Actualizar esta sección cada vez que se completen o agreguen tareas.

### ✅ Completado
- Sitio web completo con todas las secciones
- Backend con CRM de leads
- Simulador financiero
- Formulario de diagnóstico
- Email automático de plan financiero
- Panel admin protegido por contraseña
- Diseño responsive (mobile)

### 🔄 En Progreso
*(actualizar aquí)*

### ⏳ Pendiente
*(revisar archivos `Pendientes marketing.docx` y `Pendientes niel marketing.docx` para lista completa)*

---

## 📝 Notas Importantes para las IAs

1. **Tono de comunicación:** Directo, humano, sin humo, sin tecnicismos innecesarios
2. **Filosofía:** "No partimos del Excel, partimos de las decisiones."
3. **No confundir:** Zerda Finance NO hace contabilidad — es consultoría financiera estratégica
4. **Logo:** `logos/Logo oficial white.png` (versión blanca) e `logos/isotipo.png`
5. **Foto Oscar:** `oscar.jpg` en la raíz del proyecto
6. **Metodología CORE:** Claridad → Orden → Rentabilidad → Escalabilidad

---

## 🔄 Historial de Cambios

| Fecha | Herramienta | Cambio |
|---|---|---|
| 2026-05-19 | Antigravity | Creación de este archivo PROYECTO.md de memoria compartida |

> **Instrucción:** Al hacer cualquier cambio relevante al proyecto, agrega una fila en esta tabla indicando la fecha, la IA usada y qué se cambió.
