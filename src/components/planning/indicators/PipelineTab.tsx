import { LeadsByPhaseWidget } from "./LeadsByPhaseWidget";
import { DealsInProgressWidget } from "./DealsInProgressWidget";

interface PipelineTabProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

export function PipelineTab({ buKey, startDate, endDate }: PipelineTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LeadsByPhaseWidget buKey={buKey} startDate={startDate} endDate={endDate} />
      <DealsInProgressWidget buKey={buKey} startDate={startDate} endDate={endDate} />
    </div>
  );
}
