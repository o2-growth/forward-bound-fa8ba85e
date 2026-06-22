import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Target,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Investimento de mídia REAL (spend Meta + Google) do período */
  investmentReal: number;
  /** Investimento PLANEJADO do período */
  investmentPlanned: number;
  /** Breakdown (opcional) */
  investmentMeta?: number;
  investmentGoogle?: number;
  /** CPMQL real (spend ÷ MQLs) e meta */
  cpmqlReal: number;
  cpmqlGoal: number;
  mqls: number;
  /** CAC = (mídia + time/ferramentas) ÷ vendas — definição da planilha */
  cacReal: number;
  cacMidia: number;
  cacOpex: number;
  vendas: number;
  /** LTV/CAC (opcional, da planilha) */
  ltvCac?: number;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function InvestmentCacMqlHero({
  investmentReal,
  investmentPlanned,
  investmentMeta,
  investmentGoogle,
  cpmqlReal,
  cpmqlGoal,
  mqls,
  cacReal,
  cacMidia,
  cacOpex,
  vendas,
  ltvCac,
}: Props) {
  const pctOrcado = investmentPlanned > 0 ? (investmentReal / investmentPlanned) * 100 : 0;
  const dentroOrcado = pctOrcado <= 100;

  const cpmqlPct = cpmqlGoal > 0 ? (cpmqlReal / cpmqlGoal) * 100 : 0;
  const cpmqlGood = cpmqlReal > 0 && cpmqlReal <= cpmqlGoal;

  const ltvCacTone =
    ltvCac === undefined
      ? ""
      : ltvCac >= 3
        ? "text-emerald-600 border-emerald-500/40"
        : ltvCac >= 1
          ? "text-amber-600 border-amber-500/40"
          : "text-destructive border-destructive/40";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Card 1 — Investimento de Mídia */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/15 p-3">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Investimento de Mídia</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{brl(investmentReal)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Planejado: <span className="font-medium text-foreground">{brl(investmentPlanned)}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  dentroOrcado
                    ? "text-emerald-600 border-emerald-500/40"
                    : "text-destructive border-destructive/40",
                )}
              >
                {dentroOrcado ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {pctOrcado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do orçado
              </Badge>
            </div>
            {(investmentMeta !== undefined || investmentGoogle !== undefined) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Meta Ads: {brl(investmentMeta ?? 0)} • Google Ads: {brl(investmentGoogle ?? 0)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Card 2 — CPMQL */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/15 p-3">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">CPMQL — Custo por MQL</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{brl(cpmqlReal)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Meta: <span className="font-medium text-foreground">{brl(cpmqlGoal)}</span>
            </p>
            <div className="mt-2">
              <Badge
                variant="outline"
                className={cn(
                  cpmqlGood
                    ? "text-emerald-600 border-emerald-500/40"
                    : "text-destructive border-destructive/40",
                )}
              >
                {cpmqlGoal > 0
                  ? `${cpmqlPct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da meta`
                  : "sem meta definida"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mqls.toLocaleString("pt-BR")} MQLs no período
            </p>
          </div>
        </div>
      </Card>

      {/* Card 3 — CAC (definição da planilha) */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/15 p-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">CAC — Custo de Aquisição</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{brl(cacReal)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Mídia {brl(cacMidia)} + Time/Ferr. {brl(cacOpex)} ÷ {vendas} vendas
            </p>
            {ltvCac !== undefined && (
              <div className="mt-2">
                <Badge variant="outline" className={ltvCacTone}>
                  LTV/CAC: {ltvCac.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
