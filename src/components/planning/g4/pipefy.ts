import type { G4RealLead } from "@/hooks/useG4RealMetrics";

export function buildPipefyUrl(l: Pick<G4RealLead, "pipefyUrl" | "email">): string | null {
  if (l.pipefyUrl) return l.pipefyUrl;
  if (l.email) {
    return `https://app.pipefy.com/search?query=${encodeURIComponent(l.email)}`;
  }
  return null;
}
