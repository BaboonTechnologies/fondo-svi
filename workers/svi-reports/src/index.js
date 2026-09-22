// Worker svi-reports: almacena en R2 el histórico de reportes mensuales del fondo SVI.
// Una clave por mes (reporte_SVI_<Mes>_<Año>.pdf) es la ÚNICA fuente de verdad, tanto
// para el archivo histórico de fund.svinvesting.com/resultados como para el botón de
// "último reporte". Subir un PDF una vez alimenta ambos, sin commits ni redeploys.

const MONTH_ORDER = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};
const MONTHS = Object.keys(MONTH_ORDER);

// Nombre canónico de cada reporte. Es también su clave en R2.
const REPORT_NAME_PATTERN = /^reporte_SVI_([A-Za-záéíóúüÁÉÍÓÚÜ]+)_(\d{4})\.pdf$/;

function build_report_key(month, year) {
  return `reporte_SVI_${month}_${year}.pdf`;
}

function parse_report_key(key) {
  const match = key.match(REPORT_NAME_PATTERN);
  if (!match) return null;
  const raw_month = match[1];
  const month = raw_month.charAt(0).toUpperCase() + raw_month.slice(1).toLowerCase();
  if (!(month in MONTH_ORDER)) return null;
  return { key, month, year: match[2], month_order: MONTH_ORDER[month] };
}

// Lista todos los reportes válidos del bucket, ordenados del más reciente al más antiguo.
async function list_reports(env) {
  const listing = await env.REPORTS_BUCKET.list();
  const reports = listing.objects
    .map((object) => parse_report_key(object.key))
    .filter(Boolean);
  reports.sort((first, second) => {
    if (second.year !== first.year) return Number(second.year) - Number(first.year);
    return second.month_order - first.month_order;
  });
  return reports;
}

function check_auth(request, env) {
  const auth_header = request.headers.get("Authorization");
  if (!auth_header || !auth_header.startsWith("Basic ")) return false;
  const decoded = atob(auth_header.slice(6));
  const separator_index = decoded.indexOf(":");
  const user = decoded.slice(0, separator_index);
  const pass = decoded.slice(separator_index + 1);
  return user === env.AUTH_USER && pass === env.AUTH_PASS;
}

function require_auth() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SVI Reports"' },
  });
}

function json_response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}

// GET /list -> histórico público en JSON, agrupado por año (forma que consume el
// archivo de resultados). Cada fichero trae la URL absoluta de descarga en este Worker.
async function handle_list(request, env) {
  const reports = await list_reports(env);
  const origin = new URL(request.url).origin;

  const by_year = {};
  for (const report of reports) {
    if (!by_year[report.year]) by_year[report.year] = [];
    by_year[report.year].push({
      name: report.key,
      label: `Reporte SVI — ${report.month} ${report.year}`,
      path: `${origin}/r/${report.key}`,
    });
  }

  const years = Object.keys(by_year)
    .sort((first, second) => Number(second) - Number(first))
    .map((year) => ({ year, files: by_year[year] }));

  return json_response({ years });
}

// GET /r/<reporte_SVI_Mes_Año.pdf> -> descarga un reporte histórico concreto.
async function handle_report_download(key, env) {
  if (!parse_report_key(key)) return new Response("Not found", { status: 404 });
  const object = await env.REPORTS_BUCKET.get(key);
  if (!object) return new Response("Reporte no encontrado.", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${key}"`,
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// GET /ultimo-reporte -> el reporte más reciente disponible (inline, para el botón de la web).
async function handle_latest_download(env) {
  const reports = await list_reports(env);
  if (reports.length === 0) return new Response("No hay informe disponible.", { status: 404 });
  const latest = reports[0];
  const object = await env.REPORTS_BUCKET.get(latest.key);
  if (!object) return new Response("No hay informe disponible.", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${latest.key}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function handle_upload(request, env) {
  if (!check_auth(request, env)) return require_auth();

  if (request.method === "GET") {
    const reports = await list_reports(env);
    return new Response(upload_html(reports), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (request.method === "POST") {
    const form_data = await request.formData();
    const file = form_data.get("pdf");
    const month = form_data.get("month");
    const year = form_data.get("year");

    const reports = await list_reports(env);

    if (!file || typeof file === "string" || !file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(upload_html(reports, "", "El archivo debe ser un PDF."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    if (!MONTHS.includes(month) || !/^\d{4}$/.test(year || "")) {
      return new Response(upload_html(reports, "", "Selecciona un mes y un año válidos."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const key = build_report_key(month, year);
    const file_buffer = await file.arrayBuffer();
    await env.REPORTS_BUCKET.put(key, file_buffer, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { original_name: file.name },
    });

    const size_mb = (file_buffer.byteLength / 1024 / 1024).toFixed(1);
    const refreshed = await list_reports(env);
    return new Response(
      upload_html(refreshed, `Reporte publicado: ${month} ${year} (${size_mb} MB). Ya aparece en la web.`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new Response("Method not allowed", { status: 405 });
}

function upload_html(reports, status_message = "", error_message = "") {
  const now = new Date();
  const current_month = MONTHS[now.getMonth()];
  const current_year = now.getFullYear();
  const years = [];
  for (let year = current_year + 1; year >= 2024; year -= 1) years.push(year);

  const month_options = MONTHS.map(
    (month) => `<option value="${month}"${month === current_month ? " selected" : ""}>${month}</option>`
  ).join("");
  const year_options = years.map(
    (year) => `<option value="${year}"${year === current_year ? " selected" : ""}>${year}</option>`
  ).join("");

  const archive_rows = reports.length
    ? reports
        .map(
          (report) =>
            `<li><a href="/r/${report.key}">${report.month} ${report.year}</a></li>`
        )
        .join("")
    : "<li class=\"muted\">Todavía no hay reportes publicados.</li>";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVI Reports — Publicar informe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 40px 20px; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 480px; width: 100%; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    h1 { font-size: 1.4rem; color: #1a1a1a; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 24px; }
    .row { display: flex; gap: 12px; margin-bottom: 16px; }
    .field { flex: 1; }
    label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 6px; }
    select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.95rem; background: white; }
    .drop-zone { border: 2px dashed #ccc; border-radius: 8px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
    .drop-zone:hover, .drop-zone.dragover { border-color: #0066cc; background: #f0f7ff; }
    .drop-zone p { color: #666; font-size: 0.95rem; }
    .drop-zone .selected { color: #1a1a1a; font-weight: 500; }
    input[type="file"] { display: none; }
    button { width: 100%; padding: 12px; background: #0066cc; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #0052a3; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .status { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.9rem; }
    .status.ok { background: #e8f5e9; color: #2e7d32; }
    .status.error { background: #ffeaea; color: #c62828; }
    .archive { margin-top: 28px; border-top: 1px solid #eee; padding-top: 20px; }
    .archive h2 { font-size: 0.95rem; color: #1a1a1a; margin-bottom: 12px; }
    .archive ul { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .archive a { color: #0066cc; text-decoration: none; font-size: 0.9rem; }
    .archive a:hover { text-decoration: underline; }
    .archive .muted { color: #999; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Publicar informe SVI</h1>
    <p class="subtitle">El PDF se publica en la web (histórico + botón de último reporte) al instante.</p>
    <form method="POST" enctype="multipart/form-data">
      <div class="row">
        <div class="field">
          <label for="month">Mes</label>
          <select name="month" id="month">${month_options}</select>
        </div>
        <div class="field">
          <label for="year">Año</label>
          <select name="year" id="year">${year_options}</select>
        </div>
      </div>
      <div class="drop-zone" id="dropZone">
        <p id="dropText">Arrastra el PDF aquí o haz clic para buscar</p>
      </div>
      <input type="file" name="pdf" id="fileInput" accept=".pdf">
      <button type="submit" id="submitBtn" disabled>Publicar informe</button>
    </form>
    ${status_message ? `<div class="status ok">${status_message}</div>` : ""}
    ${error_message ? `<div class="status error">${error_message}</div>` : ""}
    <div class="archive">
      <h2>Reportes publicados</h2>
      <ul>${archive_rows}</ul>
    </div>
  </div>
  <script>
    const drop_zone = document.getElementById("dropZone");
    const file_input = document.getElementById("fileInput");
    const drop_text = document.getElementById("dropText");
    const submit_btn = document.getElementById("submitBtn");

    drop_zone.addEventListener("click", () => file_input.click());
    drop_zone.addEventListener("dragover", (event) => { event.preventDefault(); drop_zone.classList.add("dragover"); });
    drop_zone.addEventListener("dragleave", () => drop_zone.classList.remove("dragover"));
    drop_zone.addEventListener("drop", (event) => {
      event.preventDefault();
      drop_zone.classList.remove("dragover");
      if (event.dataTransfer.files.length) {
        file_input.files = event.dataTransfer.files;
        update_selected();
      }
    });
    file_input.addEventListener("change", update_selected);

    function update_selected() {
      if (file_input.files.length) {
        drop_text.textContent = file_input.files[0].name;
        drop_text.classList.add("selected");
        submit_btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/ultimo-reporte") return handle_latest_download(env);
    if (path === "/list") return handle_list(request, env);
    if (path.startsWith("/r/")) return handle_report_download(decodeURIComponent(path.slice(3)), env);
    if (path === "/" || path === "") return handle_upload(request, env);

    return new Response("Not found", { status: 404 });
  },
};
