import { MqlsByRevenueWidget } from "./MqlsByRevenueWidget";

interface SegmentationTabProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

export function SegmentationTab({ buKey, startDate, endDate }: SegmentationTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <MqlsByRevenueWidget buKey={buKey} startDate={startDate} endDate={endDate} />
    </div>
  );
}
