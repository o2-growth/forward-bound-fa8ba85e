import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtFull } from "@/components/planning/ceo/ceoShared";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface CustoDetalhe {
  label: string;
  valor: number;
}

export interface G4Dre {
  receitaBruta: number;
  imposto: number;          // valor absoluto (ex: 15% de receitaBruta)
  comissaoG4: number;       // valor absoluto (ex: 15% de receitaBruta)
  custosOperacionais: number;
  lucroLiquido: number;
}

export interface FrenteDreCardProps {
  title?: string;
  dre: G4Dre;
  custosDetalhe?: CustoDetalhe[];
}

// ── Sub-componente: linha da DRE ───────────────────────────────────────
type LineKind = "subtotal" | "detail-neg" | "detail-neg-expand" | "result";

function DreLine({
  label,
  valor,
  kind,
  tone,
  expandable,
  expanded,
  onToggle,
}: {
  label: string;
  valor: number;
  kind: LineKind;
  tone?: "positive" | "negative" | "neutral";
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const isNeg = kind === "detail-neg" || kind === "detail-neg-expand";
  const isResult = kind === "result";
  const isSubtotal = kind === "subtotal";

  const valueStr = isNeg ? `(${fmtFull(valor)})` : fmtFull(valor);

  const valueColor =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
      ? "text-destructive"
      : isNeg
      ? "text-muted-foreground"
      : "text-foreground";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 py-1.5 px-1 rounded-sm",
        isResult && "mt-1 pt-2 border-t border-border",
        isSubtotal && "font-semibold",
        expandable && "cursor-pointer hover:bg-muted/40 transition-colors"
      )}
      onClick={expandable ? onToggle : undefined}
      role={expandable ? "button" : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {expandable &&
          (expanded ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          ))}
        <span
          className={cn(
            "truncate text-sm",
            isResult ? "font-bold text-base" : isSubtotal ? "font-semibold" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      </div>
      <span
        className={cn(
          "tabular-nums text-right flex-shrink-0",
          isResult ? "text-base font-bold" : isSubtotal ? "text-sm font-semibold" : "text-sm",
          valueColor
        )}
      >
        {valueStr}
      </span>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────
export function FrenteDreCard({
  title = "Resultado Financeiro do Canal",
  dre,
  custosDetalhe,
}: FrenteDreCardProps) {
  const [custosExpanded, setCustosExpanded] = useState(false);

  const safeDre: G4Dre = dre ?? {
    receitaBruta: 0,
    imposto: 0,
    comissaoG4: 0,
    custosOperacionais: 0,
    lucroLiquido: 0,
  };
  const lucroPositivo = safeDre.lucroLiquido >= 0;
  const hasCustosDetalhe = custosDetalhe && custosDetalhe.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-0.5">
        {/* Receita Bruta */}
        <DreLine
          label="Receita Bruta"
          valor={dre.receitaBruta}
          kind="subtotal"
          tone="neutral"
        />

        <Separator className="my-1" />

        {/* Imposto */}
        <DreLine
          label="(−) Imposto 15%"
          valor={dre.imposto}
          kind="detail-neg"
          tone="neutral"
        />

        {/* Comissão G4 */}
        <DreLine
          label="(−) Comissão G4 15%"
          valor={dre.comissaoG4}
          kind="detail-neg"
          tone="neutral"
        />

        {/* Custos Operacionais (expandível) */}
        <DreLine
          label="(−) Custos Operacionais"
          valor={dre.custosOperacionais}
          kind="detail-neg"
          tone="neutral"
          expandable={hasCustosDetalhe}
          expanded={custosExpanded}
          onToggle={() => setCustosExpanded((v) => !v)}
        />

        {/* Detalhe de custos (quando expandido) */}
        {hasCustosDetalhe && custosExpanded && (
          <div className="ml-5 space-y-0.5 rounded-md border border-dashed border-border/60 bg-muted/30 px-2 py-1.5">
            {custosDetalhe!.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <span className="tabular-nums text-xs text-muted-foreground">
                  ({fmtFull(c.valor)})
                </span>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-1" />

        {/* Lucro Líquido */}
        <DreLine
          label="= Lucro Líquido do Canal"
          valor={Math.abs(dre.lucroLiquido)}
          kind="result"
          tone={lucroPositivo ? "positive" : "negative"}
        />

        {/* Nota se prejuízo */}
        {!lucroPositivo && (
          <p className="pt-1 text-[11px] italic text-destructive/80">
            Canal em prejuízo no período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
