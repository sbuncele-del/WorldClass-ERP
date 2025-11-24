import { Request, Response } from 'express';
import { query } from '../../../config/database';

/**
 * Sales Workspace Controller
 * Provides aggregated data for the Sales & CRM dashboard
 */

/**
 * GET /api/sales/workspace
 * Returns all data needed for the Sales & CRM workspace dashboard
 */
export const getSalesWorkspace = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    // Parallel queries for performance
    const [
      salesPipeline,
      recentOrders,
      topCustomers,
      salesCharts,
      pendingQuotations,
      salesSummary,
    ] = await Promise.all([
      getSalesPipeline(tenantId),
      getRecentOrders(tenantId),
      getTopCustomers(tenantId),
      getSalesCharts(tenantId),
      getPendingQuotations(tenantId),
      getSalesSummary(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        summary: salesSummary,
        pipeline: salesPipeline,
        recent_orders: recentOrders,
        top_customers: topCustomers,
        sales_charts: salesCharts,
        pending_quotations: pendingQuotations,
      },
    });
  } catch (error: any) {
    console.error('Sales workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales workspace data',
    });
  }
};

/**
 * Get sales pipeline by stage
 */
async function getSalesPipeline(tenantId: string) {
  const result = await query(
    `
    SELECT 
      stage,
      COUNT(*) as opportunity_count,
      SUM(expected_value) as total_value
    FROM sales_opportunities
    WHERE tenant_id = $1 AND status = 'open'
    GROUP BY stage
    ORDER BY 
      CASE stage
        WHEN 'prospecting' THEN 1
        WHEN 'qualification' THEN 2
        WHEN 'proposal' THEN 3
        WHEN 'negotiation' THEN 4
        WHEN 'closing' THEN 5
        ELSE 6
      END
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get recent sales orders (last 10)
 */
async function getRecentOrders(tenantId: string) {
  const result = await query(
    `
    SELECT 
      so.id,
      so.order_number,
      so.order_date,
      so.customer_id,
      c.name as customer_name,
      so.total_amount,
      so.status
    FROM sales_orders so
    JOIN customers c ON so.customer_id = c.id
    WHERE so.tenant_id = $1
    ORDER BY so.order_date DESC, so.created_at DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get top customers by revenue
 */
async function getTopCustomers(tenantId: string) {
  const result = await query(
    `
    SELECT 
      c.id,
      c.name,
      c.email,
      COUNT(so.id) as order_count,
      SUM(so.total_amount) as total_revenue
    FROM customers c
    JOIN sales_orders so ON c.id = so.customer_id
    WHERE c.tenant_id = $1 AND so.status != 'cancelled'
    GROUP BY c.id, c.name, c.email
    ORDER BY total_revenue DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get sales charts data (last 6 months)
 */
async function getSalesCharts(tenantId: string) {
  const result = await query(
    `
    SELECT 
      DATE_TRUNC('month', order_date) as month,
      COUNT(*) as order_count,
      SUM(total_amount) as revenue
    FROM sales_orders
    WHERE tenant_id = $1 
      AND status != 'cancelled'
      AND order_date >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', order_date)
    ORDER BY month DESC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get pending quotations
 */
async function getPendingQuotations(tenantId: string) {
  const result = await query(
    `
    SELECT 
      id,
      quote_number,
      quote_date,
      customer_id,
      total_amount,
      status,
      valid_until
    FROM sales_quotations
    WHERE tenant_id = $1 AND status = 'sent'
    ORDER BY quote_date DESC
    LIMIT 5
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get sales summary metrics
 */
async function getSalesSummary(tenantId: string) {
  const result = await query(
    `
    SELECT 
      COUNT(DISTINCT CASE WHEN so.status != 'cancelled' THEN so.id END) as total_orders,
      SUM(CASE WHEN so.status != 'cancelled' THEN so.total_amount ELSE 0 END) as total_revenue,
      COUNT(DISTINCT c.id) as total_customers,
      COUNT(CASE WHEN opp.status = 'open' THEN 1 END) as open_opportunities,
      SUM(CASE WHEN opp.status = 'open' THEN opp.expected_value ELSE 0 END) as pipeline_value,
      COUNT(CASE WHEN sq.status = 'sent' THEN 1 END) as pending_quotes
    FROM customers c
    LEFT JOIN sales_orders so ON c.id = so.customer_id AND so.tenant_id = $1
    LEFT JOIN sales_opportunities opp ON c.id = opp.customer_id AND opp.tenant_id = $1
    LEFT JOIN sales_quotations sq ON c.id = sq.customer_id AND sq.tenant_id = $1
    WHERE c.tenant_id = $1
    `,
    [tenantId]
  );

  return result.rows[0] || {
    total_orders: 0,
    total_revenue: 0,
    total_customers: 0,
    open_opportunities: 0,
    pipeline_value: 0,
    pending_quotes: 0,
  };
}
