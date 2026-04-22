-- Comprehensive audit log system
-- Tracks ALL changes made to configurable tables via PostgreSQL triggers

-- 1. Create the audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_email TEXT
);

-- 2. Create indexes for fast queries
CREATE INDEX idx_audit_log_table_name ON public.audit_log (table_name);
CREATE INDEX idx_audit_log_changed_at ON public.audit_log (changed_at DESC);
CREATE INDEX idx_audit_log_table_changed_at ON public.audit_log (table_name, changed_at DESC);
CREATE INDEX idx_audit_log_changed_by ON public.audit_log (changed_by);
CREATE INDEX idx_audit_log_record_id ON public.audit_log (record_id);

-- 3. Enable RLS - users can read but not modify
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Only the trigger function (running as SECURITY DEFINER) can write

-- 4. Create the generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record_id TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
    v_changed_by UUID;
    v_user_email TEXT;
BEGIN
    -- Get the current user from auth context
    v_changed_by := auth.uid();

    -- Try to get user email from auth.users
    IF v_changed_by IS NOT NULL THEN
        SELECT email INTO v_user_email
        FROM auth.users
        WHERE id = v_changed_by;
    END IF;

    -- Determine record_id and values based on operation
    IF (TG_OP = 'DELETE') THEN
        -- Try to extract ID from the old record
        v_record_id := COALESCE(
            OLD.id::text,
            md5(row_to_json(OLD)::text)
        );
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    ELSIF (TG_OP = 'INSERT') THEN
        v_record_id := COALESCE(
            NEW.id::text,
            md5(row_to_json(NEW)::text)
        );
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_record_id := COALESCE(
            NEW.id::text,
            md5(row_to_json(NEW)::text)
        );
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    END IF;

    -- Insert the audit log entry
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by,
        changed_at,
        user_email
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_values,
        v_new_values,
        v_changed_by,
        now(),
        v_user_email
    );

    -- Return the appropriate record
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 5. Attach triggers to all user-modifiable tables

-- monetary_metas
DROP TRIGGER IF EXISTS audit_trigger_monetary_metas ON public.monetary_metas;
CREATE TRIGGER audit_trigger_monetary_metas
AFTER INSERT OR UPDATE OR DELETE ON public.monetary_metas
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- funnel_metas
DROP TRIGGER IF EXISTS audit_trigger_funnel_metas ON public.funnel_metas;
CREATE TRIGGER audit_trigger_funnel_metas
AFTER INSERT OR UPDATE OR DELETE ON public.funnel_metas
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- closer_metas
DROP TRIGGER IF EXISTS audit_trigger_closer_metas ON public.closer_metas;
CREATE TRIGGER audit_trigger_closer_metas
AFTER INSERT OR UPDATE OR DELETE ON public.closer_metas
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- cost_stage_metas
DROP TRIGGER IF EXISTS audit_trigger_cost_stage_metas ON public.cost_stage_metas;
CREATE TRIGGER audit_trigger_cost_stage_metas
AFTER INSERT OR UPDATE OR DELETE ON public.cost_stage_metas
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- bu_indicators_config
DROP TRIGGER IF EXISTS audit_trigger_bu_indicators_config ON public.bu_indicators_config;
CREATE TRIGGER audit_trigger_bu_indicators_config
AFTER INSERT OR UPDATE OR DELETE ON public.bu_indicators_config
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- sales_realized
DROP TRIGGER IF EXISTS audit_trigger_sales_realized ON public.sales_realized;
CREATE TRIGGER audit_trigger_sales_realized
AFTER INSERT OR UPDATE OR DELETE ON public.sales_realized
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- user_roles
DROP TRIGGER IF EXISTS audit_trigger_user_roles ON public.user_roles;
CREATE TRIGGER audit_trigger_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- user_tab_permissions
DROP TRIGGER IF EXISTS audit_trigger_user_tab_permissions ON public.user_tab_permissions;
CREATE TRIGGER audit_trigger_user_tab_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_tab_permissions
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- meta_redistribution_sessions
DROP TRIGGER IF EXISTS audit_trigger_meta_redistribution_sessions ON public.meta_redistribution_sessions;
CREATE TRIGGER audit_trigger_meta_redistribution_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.meta_redistribution_sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- meta_redistribution_changes
DROP TRIGGER IF EXISTS audit_trigger_meta_redistribution_changes ON public.meta_redistribution_changes;
CREATE TRIGGER audit_trigger_meta_redistribution_changes
AFTER INSERT OR UPDATE OR DELETE ON public.meta_redistribution_changes
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- daily_revenue (written by edge functions)
DROP TRIGGER IF EXISTS audit_trigger_daily_revenue ON public.daily_revenue;
CREATE TRIGGER audit_trigger_daily_revenue
AFTER INSERT OR UPDATE OR DELETE ON public.daily_revenue
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- meta_ads_cache (written by edge functions)
DROP TRIGGER IF EXISTS audit_trigger_meta_ads_cache ON public.meta_ads_cache;
CREATE TRIGGER audit_trigger_meta_ads_cache
AFTER INSERT OR UPDATE OR DELETE ON public.meta_ads_cache
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- funnel_realized (written by sync edge functions)
DROP TRIGGER IF EXISTS audit_trigger_funnel_realized ON public.funnel_realized;
CREATE TRIGGER audit_trigger_funnel_realized
AFTER INSERT OR UPDATE OR DELETE ON public.funnel_realized
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 6. Grant necessary permissions
GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT ON public.audit_log TO service_role;
GRANT INSERT ON public.audit_log TO service_role;
