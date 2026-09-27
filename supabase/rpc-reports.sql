-- ==============================================================================
-- MVPOS High-Performance Analytics & Reporting RPC Functions
-- Run this in your Supabase SQL Editor to eliminate 99% of reporting egress.
-- ==============================================================================

-- 1. Sales & GST Summary for any date range (Daily, Monthly, Quarterly, Custom)
-- Returns aggregated metrics directly from Postgres in a tiny JSON object (~1 KB)
CREATE OR REPLACE FUNCTION public.get_sales_summary(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_gross_sales', COALESCE(ROUND(SUM(grand_total)::numeric, 2), 0),
        'taxable_amount', COALESCE(ROUND(SUM(grand_total / 1.08)::numeric, 2), 0),
        'gst_amount', COALESCE(ROUND(SUM(grand_total - (grand_total / 1.08))::numeric, 2), 0),
        'transaction_count', COUNT(*),
        'cash_total', COALESCE(ROUND(SUM(grand_total) FILTER (WHERE LOWER(payment_method) = 'cash')::numeric, 2), 0),
        'card_total', COALESCE(ROUND(SUM(grand_total) FILTER (WHERE LOWER(payment_method) = 'card')::numeric, 2), 0),
        'transfer_total', COALESCE(ROUND(SUM(grand_total) FILTER (WHERE LOWER(payment_method) = 'mobile' OR LOWER(payment_method) = 'transfer')::numeric, 2), 0),
        'credit_total', COALESCE(ROUND(SUM(grand_total) FILTER (WHERE LOWER(payment_method) = 'credit')::numeric, 2), 0),
        'average_transaction_value', CASE 
            WHEN COUNT(*) > 0 THEN ROUND((SUM(grand_total) / COUNT(*))::numeric, 2) 
            ELSE 0 
        END
    )
    INTO result
    FROM public.sales
    WHERE date >= p_start_date AND date <= p_end_date;

    RETURN result;
END;
$$;

-- 2. Monthly Sales Breakdown for Annual Reports
CREATE OR REPLACE FUNCTION public.get_annual_monthly_breakdown(
    p_year INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_data ORDER BY month_num)
    INTO result
    FROM (
        SELECT 
            EXTRACT(MONTH FROM date)::INT AS month_num,
            COUNT(*)::INT AS transaction_count,
            COALESCE(ROUND(SUM(grand_total)::numeric, 2), 0) AS total_gross_sales,
            COALESCE(ROUND(SUM(grand_total / 1.08)::numeric, 2), 0) AS taxable_sales,
            COALESCE(ROUND(SUM(grand_total - (grand_total / 1.08))::numeric, 2), 0) AS gst_amount
        FROM public.sales
        WHERE EXTRACT(YEAR FROM date) = p_year
        GROUP BY EXTRACT(MONTH FROM date)
    ) row_data;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 3. Customer Outstanding Debt Overview
CREATE OR REPLACE FUNCTION public.get_customer_debt_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_outstanding_debt', COALESCE(ROUND(SUM(outstanding_balance)::numeric, 2), 0),
        'customers_with_debt_count', COUNT(*) FILTER (WHERE outstanding_balance > 0),
        'total_customers_count', COUNT(*),
        'top_debtors', (
            SELECT COALESCE(json_agg(t), '[]'::json)
            FROM (
                SELECT id, name_en, name_dv, code, phone, outstanding_balance, credit_limit
                FROM public.customers
                WHERE outstanding_balance > 0
                ORDER BY outstanding_balance DESC
                LIMIT 10
            ) t
        )
    )
    INTO result
    FROM public.customers;

    RETURN result;
END;
$$;

-- Grant execution permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_sales_summary(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_annual_monthly_breakdown(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_debt_summary() TO anon, authenticated;
