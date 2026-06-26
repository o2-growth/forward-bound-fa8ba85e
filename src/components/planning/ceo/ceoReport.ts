// Geração de relatório imprimível (PDF via "Salvar como PDF" do navegador)
// para a Visão do CEO. Sem dependências externas: monta um HTML estilizado
// e abre numa nova janela já disparando o print.

export interface ReportKpi {
  label: string;
  value: string;
  sub?: string;
}

export interface ReportBreakdownRow {
  label: string;
  value: string;
  /** valor secundário opcional (ex: MRR perdido ao lado da contagem) */
  extra?: string;
}

export interface ReportSection {
  /** Nome da área — usado pelo CEO para cobrar o time responsável */
  area: string;
  owner?: string;
  kpis: ReportKpi[];
  breakdown?: {
    title: string;
    rows: ReportBreakdownRow[];
  };
}

export interface CeoReportInput {
  title: string;
  periodLabel: string;
  generatedAt: string;
  sections: ReportSection[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSection(section: ReportSection): string {
  const kpis = section.kpis
    .map(
      (k) => `
      <div class="kpi">
        <div class="kpi-value">${escapeHtml(k.value)}</div>
        <div class="kpi-label">${escapeHtml(k.label)}</div>
        ${k.sub ? `<div class="kpi-sub">${escapeHtml(k.sub)}</div>` : ""}
      </div>`
    )
    .join("");

  const breakdown = section.breakdown
    ? `
      <div class="breakdown">
        <div class="breakdown-title">${escapeHtml(section.breakdown.title)}</div>
        <table>
          <tbody>
            ${section.breakdown.rows
              .map(
                (r) => `
              <tr>
                <td class="b-label">${escapeHtml(r.label)}</td>
                <td class="b-value">${escapeHtml(r.value)}</td>
                ${r.extra ? `<td class="b-extra">${escapeHtml(r.extra)}</td>` : "<td></td>"}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
    : "";

  return `
    <section class="report-section">
      <div class="section-head">
        <h2>${escapeHtml(section.area)}</h2>
        ${section.owner ? `<span class="owner">Responsável: ${escapeHtml(section.owner)}</span>` : ""}
      </div>
      <div class="kpis">${kpis}</div>
      ${breakdown}
    </section>`;
}

export function buildCeoReportHtml(input: CeoReportInput): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Inter, Roboto, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 40px;
    background: #fff;
  }
  header.report-header {
    border-bottom: 3px solid #16a34a;
    padding-bottom: 16px;
    margin-bottom: 28px;
  }
  header.report-header h1 { margin: 0 0 4px; font-size: 26px; }
  header.report-header .meta { color: #64748b; font-size: 13px; }
  .report-section { margin-bottom: 32px; page-break-inside: avoid; }
  .section-head {
    display: flex; align-items: baseline; justify-content: space-between;
    border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px;
  }
  .section-head h2 { margin: 0; font-size: 18px; color: #0f172a; }
  .section-head .owner { font-size: 12px; color: #64748b; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; }
  .kpi-label { font-size: 11px; color: #475569; margin-top: 2px; }
  .kpi-sub { font-size: 10px; color: #94a3b8; font-style: italic; margin-top: 2px; }
  .breakdown { margin-top: 16px; }
  .breakdown-title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  .b-label { color: #334155; }
  .b-value { text-align: right; font-weight: 600; white-space: nowrap; }
  .b-extra { text-align: right; color: #64748b; white-space: nowrap; }
  footer { margin-top: 40px; color: #94a3b8; font-size: 11px; text-align: center; }
  @media print {
    body { padding: 24px; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  <header class="report-header">
    <h1>${escapeHtml(input.title)}</h1>
    <div class="meta">Período: ${escapeHtml(input.periodLabel)} &nbsp;•&nbsp; Gerado em ${escapeHtml(input.generatedAt)}</div>
  </header>
  ${input.sections.map(renderSection).join("")}
  <footer>O2 — Visão do CEO · Documento gerado automaticamente a partir do dashboard</footer>
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`;
}

/** Abre o relatório numa nova janela e dispara o diálogo de impressão (Salvar como PDF). */
export function openCeoReport(input: CeoReportInput): void {
  const html = buildCeoReportHtml(input);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // popup bloqueado — fallback via blob
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
