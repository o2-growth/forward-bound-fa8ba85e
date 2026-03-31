import { usePlanGrowthData } from "@/hooks/usePlanGrowthData";

/**
 * Loads and publishes Plan Growth funnel data to context on mount.
 * Component that loads Plan Growth data on mount.
 * Should be placed inside MediaMetasProvider to ensure data is available for all tabs.
 */
export function PlanGrowthDataLoader() {
  usePlanGrowthData();
  return null;
}
