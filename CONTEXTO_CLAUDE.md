# Contexto y Paso a Paso del Proyecto Web: Zerda Finance

> **Instrucción para Claude Code:** Lee este documento para tener todo el contexto de lo que hemos construido hasta el momento en la página web de Zerda Finance, de manera que estemos 100% sincronizados.

## 🎯 Objetivo General
Hemos estado desarrollando la plataforma web, herramientas de captación de leads y plantillas de contenido para **Zerda Finance**, la consultora financiera de Oscar Rincón orientada a startups, pymes y emprendedores.

---

## 🛠️ Paso a Paso de lo que se construyó

### Paso 1: Definición de Marca y Diseño Base (`index.html`)
- **Diseño visual:** Implementamos un diseño "Dark Mode" moderno que transmite profesionalismo y tecnología. Usamos fondo oscuro (`#0F2035`) con un color de acento vibrante (Teal/Cian `#00BDD0`).
- **Tipografía:** Se seleccionó **Plus Jakarta Sans** para darle una estética limpia y legible.
- **Estructura del Landing:** Se estructuró el `index.html` con un Navbar (glassmorphism), un Hero impactante, cintas de industrias, tarjetas con los dolores del cliente, explicación de la **Metodología CORE** (Claridad, Orden, Rentabilidad, Escalabilidad), Servicios, Tabla comparativa (Zerda vs Contador tradicional), y un FAQ.
- **Mobile First:** Todo se hizo responsive usando CSS puro sin frameworks pesados, aplicando Media Queries.

### Paso 2: Desarrollo del Backend y Gestión de Leads (`server.js`, `admin.html`)
- **Backend Express:** Levantamos un servidor en Node.js usando Express (`server.js`) configurado en el puerto 3000.
- **Base de Datos Local:** Implementamos un sistema ligero para guardar los leads en un archivo local llamado `leads.json`.
- **CRM / Admin Panel:** Construimos un dashboard de administración en `admin.html` protegido por contraseña (`zerda2025`) donde Oscar puede ver, editar y eliminar los leads que van ingresando.
- **Integración de Correos:** Configuramos Nodemailer para que al registrarse un usuario, el sistema pueda enviarle automáticamente correos o planes financieros en PDF.

### Paso 3: Herramientas Interactivas para Captación de Leads
- **Simulador Financiero (`simulador.html`):** Desarrollamos una calculadora/simulador interactiva en la que los usuarios pueden proyectar sus números. Sirve como lead magnet.
- **Diagnóstico Financiero (`diagnostico.html`):** Un formulario inteligente por pasos para recolectar información cualitativa del usuario antes de que agende una llamada, enviando toda la información al backend.

### Paso 4: Sistema de Contenido para Redes Sociales (`carrusel.html` y `/templates`)
- **Motor de Carruseles:** Creamos un sistema en HTML/CSS/JS (`carrusel.html`) que permite generar imágenes/slides para LinkedIn e Instagram con la misma estética de la marca.
- **Templates por Día:** En la carpeta `/templates` creamos 5 tipos de publicaciones para la parrilla de contenidos semanal:
  - `educacion-financiera.html` (Conceptos financieros explicados fácil)
  - `tip-financiero.html` (Consejos prácticos y accionables)
  - `estadistica.html` (Datos duros sobre el ecosistema empresarial)
  - `caso-cliente.html` (Historias de éxito "Antes vs Después")
  - `servicios-zerda.html` (Venta directa de los servicios de consultoría)

### Paso 5: Archivo de Memoria Compartida (`PROYECTO.md`)
- Se creó el archivo `PROYECTO.md` en la raíz del proyecto. Este archivo sirve como **fuente de la verdad** para alinear tanto a Claude Code como a Antigravity. Contiene la filosofía, estructura y contraseñas. **Claude Code debe consultar `PROYECTO.md` al iniciar cualquier sesión.**

---

## 🚀 Siguientes Pasos
Con este contexto, Claude Code ahora entiende la arquitectura del proyecto (Frontend estático + Node.js backend), el diseño implementado y el propósito de las herramientas interactivas. 

**Nota para Claude:** A partir de aquí, puedes continuar con la optimización de los carruseles, nuevas secciones o funcionalidades de backend asegurando mantener la coherencia con todo lo descrito.
