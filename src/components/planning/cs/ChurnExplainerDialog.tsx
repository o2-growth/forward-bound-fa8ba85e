import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, Database, Calendar, Calculator, Filter, ExternalLink, Info } from "lucide-react";

const PIPE_URL = "https://app.pipefy.com/pipes/305887184";

export function ChurnExplainerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Como funciona
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Como funciona a métrica de Churn
            </DialogTitle>
            <DialogDescription>
              De onde a plataforma puxa os dados, quando um cliente é contado como churn
              e como cada KPI desta seção é calculado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-sm">
            {/* 1. Definição */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Info className="h-4 w-4 text-primary" />
                O que é considerado churn
              </div>
              <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc marker:text-muted-foreground/50">
                <li>Card da <span className="text-foreground font-medium">Central de Projetos</span> que entrou na fase <Badge variant="outline" className="font-mono text-[10px]">Churn</Badge>.</li>
                <li>Cards de teste são excluídos via <code className="text-[11px] bg-muted px-1 py-0.5 rounded">isTestCard</code> (lista fixa de IDs).</li>
                <li>Comparações de fase são normalizadas (trim, lowercase, sem acento).</li>
              </ul>
            </section>

            <Separator />

            {/* 2. Data de reconhecimento */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                Quando o churn é contado (data de reconhecimento)
              </div>
              <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc marker:text-muted-foreground/50">
                <li>Prioriza <span className="text-foreground font-medium">Data oficial de encerramento</span> (Central de Projetos).</li>
                <li>Fallback: <span className="text-foreground font-medium">Data de assinatura do contrato</span> ou <code className="text-[11px] bg-muted px-1 py-0.5 rounded">mesChurn</code> (aproxima dia 15 do mês informado).</li>
                <li>O churn aparece no período cujo intervalo (filtro de datas global) contém essa data.</li>
              </ul>
            </section>

            <Separator />

            {/* 3. Fontes de dados */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Database className="h-4 w-4 text-primary" />
                De onde vêm os dados
              </div>
              <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc marker:text-muted-foreground/50">
                <li><span className="text-foreground font-medium">Pipefy · Central de Projetos</span> — fase Churn, MRR (CFOaaS + OXY), datas, motivo, CFO responsável.</li>
                <li><span className="text-foreground font-medium">Banco Lovable</span> — overrides oficiais (8 ajustes manuais em Abr/26 corrigindo atribuição de CFO).</li>
                <li><span className="text-foreground font-medium">Pipe de Tratativas</span> — usado para calcular a Taxa de Salvamento.</li>
                <li>Sincronização contínua via Edge Function <code className="text-[11px] bg-muted px-1 py-0.5 rounded">sync-pipefy-funnel</code>.</li>
              </ul>
            </section>

            <Separator />

            {/* 4. Cálculo dos KPIs */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Calculator className="h-4 w-4 text-primary" />
                Como cada KPI é calculado
              </div>
              <div className="space-y-2 pl-6">
                <KpiRow label="Revenue Churn (R$)" formula="Σ MRR (CFOaaS + OXY) dos churns do período" />
                <KpiRow label="Revenue Churn (%)" formula="MRR perdido ÷ (MRR ativo + MRR perdido) × 100" />
                <KpiRow label="Logo Churn (Qtd.)" formula="Nº de cards em fase Churn no período" />
                <KpiRow label="Logo Churn (%)" formula="Churns ÷ (Ativos + Churns) × 100" />
                <KpiRow label="LT Médio" formula="Média, em meses, entre assinatura do contrato e data de encerramento" />
                <KpiRow label="Taxa de Salvamento" formula="Tratativas salvas ÷ (Tratativas salvas + Churns) × 100" />
                <KpiRow label="MRR ativo" formula="Σ MRR de cards em Onboarding + Em Operação Recorrente" />
              </div>
            </section>

            <Separator />

            {/* 5. Filtros */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Filter className="h-4 w-4 text-primary" />
                Filtros que afetam a contagem
              </div>
              <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc marker:text-muted-foreground/50">
                <li>Período global (date range).</li>
                <li>CFO e Produto (filtros globais da aba Operação).</li>
                <li>Tipo de churn: <span className="text-foreground">operacional</span> vs <span className="text-foreground">comercial</span> (comercial = motivo "Desistência").</li>
                <li>Exclusões de motivo (multi-select).</li>
              </ul>
            </section>

            <Separator />

            {/* 6. Notas */}
            <section className="space-y-2">
              <div className="text-foreground font-semibold">Notas importantes</div>
              <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc marker:text-muted-foreground/50">
                <li>Cada cliente conta uma vez por período (dedup por card).</li>
                <li>"Valor Educação" não entra no MRR (regra global da plataforma).</li>
                <li>Para auditoria, todos os cards podem ser abertos diretamente no Pipefy.</li>
              </ul>
            </section>

            <div className="pt-2 flex justify-end">
              <a
                href={PIPE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                Abrir Central de Projetos no Pipefy
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KpiRow({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2 rounded-md bg-muted/30 border border-border/50">
      <span className="text-foreground font-medium text-xs">{label}</span>
      <span className="text-[11px] text-muted-foreground font-mono">{formula}</span>
    </div>
  );
}

export default ChurnExplainerDialog;
