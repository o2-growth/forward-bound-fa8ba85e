import { usePlanGrowthData } from "@/hooks/usePlanGrowthData";

/**
 * Component that loads Plan Growth data on mount.
 * Should be placed inside MediaMetasProvider to ensure data is available for all tabs.
 */
export function PlanGrowthDataLoader() {
  // This hook calculates and publishes funnel data to context
  usePlanGrowthData();
  
  // This component doesn't render anything
  return null;
}
