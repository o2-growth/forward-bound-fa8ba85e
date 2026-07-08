import { ExternalLink } from "lucide-react";
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
import type { G4RealLead } from "@/hooks/useG4RealMetrics";

export type G4Stage =
  | "inscritos"
  | "presentes"
  | "mao"
  | "vendas"
  | "diagnosticos";

const STAGE_LABEL: Record<G4Stage, string> = {
  inscritos: "Inscritos",
  presentes: "Presentes",
  mao: "Levantaram a mão",
  vendas: "Vendas",
  diagnosticos: "Diagnósticos",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  live: string;
  stage: G4Stage;
  leads: G4RealLead[];
}

export function LiveDetailDialog({
  open,
  onOpenChange,
  live,
  stage,
  leads,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {STAGE_LABEL[stage]}
            <Badge variant="secondary">{live}</Badge>
            <Badge variant="outline">{leads.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            {stage === "presentes"
              ? "Presença atual é agregada por lead (em alguma live) — quando a fonte cadastrar presença por live específica, esta lista fica exata."
              : "Detalhamento a partir do banco unificado das lives (g4_leads_360)."}
          </DialogDescription>
        </DialogHeader>

        {leads.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado nesta etapa.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / e-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fase atual</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead className="text-center">Mão</TableHead>
                  <TableHead className="text-center">Diag.</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l, i) => (
                  <TableRow key={`${l.email ?? "no-email"}-${i}`}>
                    <TableCell className="font-medium">
                      {l.nome || "—"}
                      <div className="text-[11px] text-muted-foreground">
                        {l.email || "—"}
                      </div>
                    </TableCell>
                    <TableCell>{l.empresa || "—"}</TableCell>
                    <TableCell>
                      {l.faseAtual ? (
                        <Badge variant="outline" className="font-normal">
                          {l.faseAtual}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.closer || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.levantouMao ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.fezDiagnostico ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.pipefyUrl ? (
                        <a
                          href={l.pipefyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          title="Abrir no Pipefy"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
