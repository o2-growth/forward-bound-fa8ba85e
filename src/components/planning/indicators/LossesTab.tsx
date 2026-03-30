import { LostDealsWidget } from "./LostDealsWidget";
import { LossReasonsWidget } from "./LossReasonsWidget";

interface LossesTabProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

export function LossesTab({ buKey, startDate, endDate }: LossesTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LostDealsWidget buKey={buKey} startDate={startDate} endDate={endDate} />
      <LossReasonsWidget buKey={buKey} startDate={startDate} endDate={endDate} />
    </div>
  );
}
