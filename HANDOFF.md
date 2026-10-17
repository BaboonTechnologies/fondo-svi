# SVI Fund — Handoff para desarrollo

Web del fondo **Systematic Value Investing US Markets** (UCITS, ISIN Clase A `ES0131444129` / Clase B `ES0131444137`).
Landing informativa + factsheet de resultados en vivo. En vivo: **https://fund.svinvesting.com**

---

## 1. Repositorio

- **GitHub:** `https://github.com/baboon-technologies/fondo-svi` (rama por defecto: `main`)
- Para hacer cambios necesitas ser **colaborador de la org `baboon-technologies`** (pídelo al admin de la cuenta). Con eso, `git clone` + push normal.
- **Un solo repo, DOS apps independientes** que se despliegan por separado en Vercel.

```
fondo-svi/
├── src/            → SPA principal  (fund.svinvesting.com)
├── api/            → funciones serverless de la SPA (Vercel)
├── public/         → imágenes y assets de la SPA
├── resultados/     → sub-app Next.js (resultados-svi.vercel.app), embebida en /resultados
└── HANDOFF.md      → este archivo
```

---

## 2. App principal (SPA) — carpeta raíz

- **Stack:** Vite + React 18 + TypeScript + Tailwind + React Router 7 + framer-motion + recharts.
- **Arrancar en local:**
  ```bash
  npm install
  npm run dev          # http://localhost:5173
  ```
- **Otros comandos:** `npm run build` (genera `dist/`), `npm run typecheck`, `npm run lint`.
- **Rutas** (`src/App.tsx`): `/` Home · `/metodologia` (¿Cómo funciona?) · `/resultados` · `/equipo` · `/recursos` (Media) · `/invertir` (¿Cómo invertir?).
- **Páginas** en `src/pages/`, **componentes** en `src/components/`. La navbar es `src/components/Navigation.tsx`.
- **Colores/fuentes:** definidos en `tailwind.config.js` (`svi-primary #012878`, etc.; fuentes Playfair Display + Inter).

## 3. Sub-app de resultados — carpeta `resultados/`

- **Stack:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- Se muestra dentro de la SPA como **iframe** en la página `/resultados`.
- **Arrancar en local:**
  ```bash
  cd resultados
  npm install
  npx next dev -p 3005    # http://localhost:3005
  ```
- **Contenido del factsheet** (textos, tabla de características, métricas): se edita en
  **`resultados/content/factsheet.json`** — es el sitio principal para actualizar datos del fondo.
- Layout y orden de secciones: `resultados/app/page.tsx`. Componentes en `resultados/components/factsheet/`.

---

## 4. Despliegue (importante)

- **Hosting: Vercel.** Hay **dos proyectos** conectados al mismo repo:
  1. la SPA (raíz) → `fund.svinvesting.com`
  2. `resultados/` → `resultados-svi.vercel.app`
- **Auto-deploy: cada `push` a `main` despliega ambos automáticamente.** No hay pipeline manual.
- **No hacen falta variables de entorno.** Todo funciona sin claves (ver §5).
  - *Nota:* `src/lib/supabase.ts` y las variables `VITE_SUPABASE_*` son **código muerto** (ya no se usan); se puede borrar.

---

## 5. Datos en vivo (sin API keys)

Los widgets dinámicos leen de **funciones serverless propias** que consultan fuentes públicas. No requieren secretos.

**SPA — `api/`** (funciones Vercel):
| Endpoint | Qué hace | Fuente |
|---|---|---|
| `/api/yahoo-quote?symbol=0P0001TB5J.F` | NAV en tiempo real + serie 12 meses | Yahoo Finance (símbolo del fondo: `0P0001TB5J.F`) |
| `/api/media/youtube` | Último vídeo del canal | RSS de YouTube (canal `UCx07t1GEqzzPjdZMXjJmAKA`) |
| `/api/media/substack` | Última newsletter | RSS `svinvesting.substack.com/feed` |

- Lógica compartida en **`api/_lib/core.mjs`**. En local, `vite.config.ts` sirve estos mismos endpoints (middleware dev).

**Resultados — `resultados/app/api/`**:
- `fund-returns` → NAV + rentabilidades YTD/1Y/3Y/5Y (total y CAGR) desde Yahoo.
- `reports` → lista los PDFs del archivo automáticamente (ver §6).

## 6. Reportes mensuales (PDF)

- Para publicar el reporte de un mes, **suelta el PDF** en `resultados/public/documents/` con el nombre exacto:
  **`reporte_SVI_<Mes>_<Año>.pdf`** (ej. `reporte_SVI_Julio_2026.pdf`). El archivo histórico se actualiza solo vía `/api/reports`.
- El botón **"Descarga Reporte Completo (PDF)"** de la navbar apunta a `https://www.svinvesting.com/ultimo-reporte`, que es una URL **externa** (dominio de marketing, gestionado FUERA de este repo). Si cambia, se actualiza en `src/components/Navigation.tsx` y `src/components/ReportCTA.tsx`.
- **Backup de los reportes:** el bucket R2 `svi-reports` (servido en `reports.svinvesting.com`) se
  copia cada día a las 05:30 (Europe/Madrid) a Backblaze `baboon-backups/fondo-svi-reports`
  (solo añade, nunca borra). Vive **fuera de este repo**: Dokploy baboon (workspace Baboon) →
  proyecto **SVI** → compose **"Reports Backup"** (rclone) + Scheduled job, con push a Uptime Kuma
  ("SVI Backups Fondo Reportes"). Credenciales como env del compose en Dokploy (token R2 de solo
  lectura en 1Password: "Cloudflare R2 - svi-reports read-only (S3)").

## 7. Formularios de contacto

- Envían a **Formspree** (sin backend propio). Endpoints hardcodeados en los componentes
  (`ContactForm.tsx`, `Invertir.tsx`, `resultados/.../ContactSection.tsx`). Los correos llegan a la cuenta Formspree del fondo.

---

## 8. Enlaces externos referenciados

- Plataforma de clientes: `https://app.svinvesting.com` · Web de marca: `https://www.svinvesting.com`
- Yahoo Finance del fondo: `https://finance.yahoo.com/quote/0P0001TB5J.F/`
- Folleto CNMV / Morningstar: enlazados desde la página de resultados.

## 9. Flujo típico de un cambio

```bash
git clone https://github.com/baboon-technologies/fondo-svi.git
cd fondo-svi && npm install && npm run dev      # editar SPA
# (o) cd resultados && npm install && npx next dev -p 3005   # editar factsheet
git checkout -b mi-cambio
# ...editar, npm run build para verificar...
git commit -am "descripción" && git push        # PR a main → Vercel despliega
```

Contacto del fondo: `info@svinvesting.com`.
