import { Badge } from "@/components/ui/badge";
import { AIChatDrawer } from "@/components/ai-chat/AIChatDrawer";
import { useCliente360 } from "@/hooks/useCliente360";
import type { JornadaCliente } from "./types";

interface Cliente360DrawerProps {
  cliente: JornadaCliente | null;
  open: boolean;
  onClose: () => void;
}

const healthColor = (level: "green" | "yellow" | "red") =>
  level === "green" ? "bg-green-500" : level === "yellow" ? "bg-yellow-500" : "bg-red-500";

export function Cliente360Drawer({ cliente, open, onClose }: Cliente360DrawerProps) {
  // Clones do squad Pedrolo usam id com sufixo "__pedrolo"; usar id original do Pipefy
  const realId = cliente?.id ? cliente.id.replace(/__pedrolo$/, "") : null;
  const chat = useCliente360(realId, open);

  if (!cliente) return null;

  const title = (
    <span className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${healthColor(cliente.healthLevel)}`} />
      {cliente.titulo}
    </span>
  );

  const slackInfo = (chat.cliente360 as any)?.slack ?? null;
  const slackChip = slackInfo?.channel
    ? `🔗 Slack: #${slackInfo.channel.name} (${slackInfo.window?.messages_count ?? 0} msgs/${slackInfo.window?.days ?? 60}d)`
    : slackInfo
      ? "🔗 Slack: canal não encontrado"
      : null;

  const subtitle = (
    <>
      <Badge variant="outline">{cliente.faseAtual}</Badge>
      <span>CFO: {cliente.cfo}</span>
      <span>•</span>
      <span>Health: {cliente.healthScore}/100</span>
      <span>•</span>
      <span>Lifetime: {cliente.lifetimeMonths ?? "—"} meses</span>
      {cliente.tratativaAtiva && (
        <Badge variant="destructive" className="text-[10px]">Tratativa {cliente.tratativaDias}d</Badge>
      )}
      {slackChip && (
        <Badge
          variant={slackInfo?.channel ? "secondary" : "outline"}
          className="text-[10px] font-normal"
          title={slackInfo?.channel?.name ?? slackInfo?.reason ?? ""}
        >
          {slackChip}
        </Badge>
      )}
    </>
  );

  return (
    <AIChatDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      chat={chat}
      dossie={chat.cliente360}
      dossieSummary="Cliente 360 (JSON cru — debug)"
      width="640px"
    />
  );
}
