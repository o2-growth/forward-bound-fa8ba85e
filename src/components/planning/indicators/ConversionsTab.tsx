import { DealsWonWidget } from "./DealsWonWidget";
import { MeetingsByRevenueWidget } from "./MeetingsByRevenueWidget";
import { NoShowWidget } from "./NoShowWidget";

interface ConversionsTabProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

export function ConversionsTab({ buKey, startDate, endDate }: ConversionsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DealsWonWidget buKey={buKey} startDate={startDate} endDate={endDate} />
      <MeetingsByRevenueWidget buKey={buKey} startDate={startDate} endDate={endDate} />
      <NoShowWidget buKey={buKey} startDate={startDate} endDate={endDate} />
    </div>
  );
}
