-- Add date column to funnel_realized
ALTER TABLE funnel_realized ADD COLUMN date DATE;

-- Create index for date queries
CREATE INDEX idx_funnel_realized_date ON funnel_realized(date);

-- Drop old unique constraint if exists and create new one with date
ALTER TABLE funnel_realized DROP CONSTRAINT IF EXISTS funnel_realized_bu_month_year_indicator_key;
ALTER TABLE funnel_realized ADD CONSTRAINT funnel_realized_bu_date_indicator_key UNIQUE(bu, date, indicator);