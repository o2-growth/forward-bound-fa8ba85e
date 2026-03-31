import { usePlanGrowthData } from "@/hooks/usePlanGrowthData";

/**
 * Loads Plan Growth funnel data and publishes to MediaMetasContext on mount.
 * Component that loads Plan Growth data on mount.
 * Should be placed inside MediaMetasProvider to ensure data is available for all tabs.
 */
export function PlanGrowthDataLoader() {
  usePlanGrowthData();
  return null;
}
