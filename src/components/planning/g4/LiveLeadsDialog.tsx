import { ExternalLink, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";

export type StageKey = "inscritos" | "entraram" | "mao" | "venda" | string;

interface LiveLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageKey: StageKey;
  stageLabel: string;
  contextLabel: string;
  totalOfficial: number;
  cards: ModeloAtualCard[];
}

const STAGE_HINT: Record<string, string> = {
  inscritos: "Todos os cards do Pipefy atribuídos a este escopo (agregado ou live/evento selecionado).",
  entraram: "Cards que evoluíram para MQL ou fases posteriores.",
  mao: "Cards nas fases: Reunião agendada, Reunião Realizada, 1ª Reunião - Apresentação, Proposta enviada / Follow Up, Ganho e Contrato assinado.",
  venda: "Cards nas fases Ganho ou Contrato assinado.",
};

const LISTABLE = new Set(["inscritos", "entraram", "mao", "venda"]);


function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function LiveLeadsDialog({
  open,
  onOpenChange,
  stageKey,
  stageLabel,
  contextLabel,
  totalOfficial,
  cards,
}: LiveLeadsDialogProps) {
  const isListable = LISTABLE.has(stageKey);
  const divergence = isListable && totalOfficial !== cards.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stageLabel}
            <Badge variant="secondary">{contextLabel}</Badge>
          </DialogTitle>
          <DialogDescription>
            {STAGE_HINT[stageKey] ??
              "Detalhamento de leads/participantes desta etapa."}
          </DialogDescription>
        </DialogHeader>

        {!isListable ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Info className="h-4 w-4" />
              Lista não disponível no nosso banco
            </div>
            <p className="text-muted-foreground">
              A relação nominal de{" "}
              <strong className="text-foreground">
                {stageLabel.toLowerCase()}
              </strong>{" "}
              vem da plataforma da G4 (planilha de inscritos/participantes).
              Temos apenas o total oficial:{" "}
              <strong className="text-foreground">{totalOfficial}</strong>. Para
              o detalhamento, peça o export dessa lista para a G4.
            </p>
          </div>
        ) : (
          <>
            {divergence && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
                Divergência: número oficial = <strong>{totalOfficial}</strong>,
                cards encontrados no Pipefy ={" "}
                <strong>{cards.length}</strong>. A lista abaixo reflete o
                Pipefy — parte dos leads pode não ter sido cadastrada como
                card.
              </div>
            )}

            {cards.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum card encontrado no Pipefy para esta etapa.
              </p>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Fase atual</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.titulo || c.empresa || "—"}
                        </TableCell>
                        <TableCell>{c.contato || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {c.faseAtual || c.fase || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>{fmtDate(c.dataEntrada)}</TableCell>
                        <TableCell>
                          {c.responsavel || c.sdr || c.closer || "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {c.origemLead || c.campanha || c.fonte || "—"}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://app.pipefy.com/open-cards/${c.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            title="Abrir no Pipefy"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
