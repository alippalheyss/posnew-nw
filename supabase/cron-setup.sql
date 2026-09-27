-- ==============================================================================
-- MVPOS Cloud Automations with pg_cron & pg_net
-- Run this in your Supabase SQL Editor (requires Postgres extensions pg_cron, pg_net)
-- ==============================================================================

-- 1. Enable Required Supabase Extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Nightly Midnight Store Close Executive Briefing Cron Job
-- Runs every night at 19:00 UTC (which is 00:00 Maldives Time, UTC+5)
-- Calls the Supabase Edge Function directly in the cloud without needing any open browser tab!
SELECT cron.unschedule('nightly_executive_briefing') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'nightly_executive_briefing'
);

SELECT cron.schedule(
    'nightly_executive_briefing',
    '0 19 * * *', -- At 00:00 Maldives Time (19:00 UTC) every day
    $$
    SELECT net.http_post(
        url := (SELECT COALESCE(
            (SELECT settings->>'webhookUrl' FROM public.settings WHERE category = 'telegram' LIMIT 1),
            'https://' || current_setting('request.headers', true)::json->>'host' || '/functions/v1/telegram-webhook'
        )),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'action', 'scheduled_nightly_briefing',
            'timestamp', NOW()
        )::jsonb
    );
    $$
);

-- 3. Monthly Automated Customer Overdue Debt Reminder
-- Runs on the 1st of every month at 04:00 UTC (09:00 AM Maldives Time)
SELECT cron.unschedule('monthly_debt_reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monthly_debt_reminders'
);

SELECT cron.schedule(
    'monthly_debt_reminders',
    '0 4 1 * *', -- 9:00 AM Maldives time on 1st of every month
    $$
    SELECT net.http_post(
        url := (SELECT COALESCE(
            (SELECT settings->>'webhookUrl' FROM public.settings WHERE category = 'telegram' LIMIT 1),
            'https://' || current_setting('request.headers', true)::json->>'host' || '/functions/v1/telegram-webhook'
        )),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'action', 'scheduled_monthly_reminders',
            'timestamp', NOW()
        )::jsonb
    );
    $$
);

-- 4. Database Trigger: Instant Notification on Transfer Slip Confirmation
-- Whenever a cashier confirms or rejects a slip in POS, Postgres notifies the Edge Function
CREATE OR REPLACE FUNCTION public.notify_slip_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    webhook_url TEXT;
BEGIN
    IF (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'rejected')) THEN
        SELECT settings->>'webhookUrl' INTO webhook_url FROM public.settings WHERE category = 'telegram' LIMIT 1;
        
        IF webhook_url IS NOT NULL AND webhook_url != '' THEN
            PERFORM net.http_post(
                url := webhook_url,
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := json_build_object(
                    'action', 'transfer_slip_status_updated',
                    'slip_id', NEW.id,
                    'status', NEW.status,
                    'customer_id', NEW.customer_id,
                    'settled_amount', NEW.settled_amount,
                    'rejection_reason', NEW.rejection_reason
                )::jsonb
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_slip_status_change ON public.transfer_slips;
CREATE TRIGGER trg_slip_status_change
AFTER UPDATE OF status ON public.transfer_slips
FOR EACH ROW
EXECUTE FUNCTION public.notify_slip_status_change();
