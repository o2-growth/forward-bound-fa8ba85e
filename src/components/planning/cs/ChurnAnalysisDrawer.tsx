import { Badge } from "@/components/ui/badge";
import { AIChatDrawer } from "@/components/ai-chat/AIChatDrawer";
import { useChurnTratativaAnalysis } from "@/hooks/useChurnTratativaAnalysis";
import type { ChurnDossierCard } from "@/hooks/useOperationsData";

interface Props {
  churn: ChurnDossierCard | null;
  open: boolean;
  onClose: () => void;
}

function formatCurrency(value: number) {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function ChurnAnalysisDrawer({ churn, open, onClose }: Props) {
  const isSynthetic = churn?.id?.startsWith("synthetic-") ?? false;
  const realId = !isSynthetic ? churn?.id ?? null : null;
  const titulo = churn?.cliente ?? null;
  const chat = useChurnTratativaAnalysis(realId, titulo, open);

  if (!churn) return null;

  const subtitle = (
    <>
      <Badge variant="outline">{churn.faseAtual || "Churn"}</Badge>
      <span>Mês: {churn.mesChurn || "—"}</span>
      <span>•</span>
      <span>MRR: {formatCurrency(churn.mrr)}</span>
      <span>•</span>
      <span>LT: {churn.ltMeses ? `${churn.ltMeses}m` : "—"}</span>
      {churn.motivoPrincipal && (
        <Badge variant="destructive" className="text-[10px]">{churn.motivoPrincipal}</Badge>
      )}
    </>
  );

  return (
    <AIChatDrawer
      open={open}
      onClose={onClose}
      title={churn.cliente}
      subtitle={subtitle}
      chat={chat}
      dossie={chat.dossie}
      dossieSummary={
        <>
          Dossiê •{" "}
          {(chat.dossie as any)?.tratativa_historico?.length ?? 0} fases tratativa •{" "}
          {(chat.dossie as any)?.nps_recente?.length ?? 0} NPS •{" "}
          Central de Projetos: {(chat.dossie as any)?.central_projetos ? "sim" : "não"}
        </>
      }
      disabledReason={
        isSynthetic
          ? "Este registro é um placeholder fixo (lista oficial) e não tem histórico de tratativa no banco. Para gerar o post-mortem, abra o card real no Pipefy."
          : null
      }
    />
  );
}
