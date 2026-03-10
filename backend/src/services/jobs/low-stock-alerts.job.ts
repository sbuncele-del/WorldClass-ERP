/**
 * Low Stock Alerts Job
 *
 * Checks inventory levels against reorder points and emails
 * warehouse managers / inventory controllers when items need reordering.
 * Uses the existing inventory.items.reorder_point column.
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'LOW_STOCK_ALERTS',
  cron: '0 6 * * *', // Daily at 06:00
  description: 'Alert on items below reorder point',
  enabled: true,
  handler: runLowStockAlerts,
});

async function runLowStockAlerts(job: Job<SchedulerJobData>) {
  const stats = { alertsSent: 0, itemsFlagged: 0 };

  await forEachTenant(async (tenantId) => {
    // Try the new inventory schema first, fall back to legacy table
    let lowStockItems: any[];

    try {
      const result = await query(
        `SELECT i.item_id, i.item_code, i.item_name, i.reorder_point, i.reorder_quantity,
                i.unit_of_measure, i.category,
                COALESCE(SUM(sl.quantity_on_hand), 0) AS current_stock,
                COALESCE(SUM(sl.quantity_reserved), 0) AS reserved
         FROM inventory.items i
         LEFT JOIN inventory.stock_levels sl ON i.item_id = sl.item_id
         WHERE i.tenant_id = $1
           AND i.is_active = true
           AND i.reorder_point IS NOT NULL
         GROUP BY i.item_id, i.item_code, i.item_name, i.reorder_point, i.reorder_quantity, i.unit_of_measure, i.category
         HAVING COALESCE(SUM(sl.quantity_on_hand), 0) <= i.reorder_point
         ORDER BY COALESCE(SUM(sl.quantity_on_hand), 0) / NULLIF(i.reorder_point, 0) ASC`,
        [tenantId]
      );
      lowStockItems = result.rows;
    } catch {
      // Fallback to public schema legacy table
      const result = await query(
        `SELECT item_id, sku AS item_code, name AS item_name, reorder_point,
                reorder_quantity, unit_of_measure, category,
                COALESCE(quantity_on_hand, 0) AS current_stock, 0 AS reserved
         FROM inventory_items
         WHERE tenant_id = $1
           AND is_active = true
           AND reorder_point IS NOT NULL
           AND COALESCE(quantity_on_hand, 0) <= reorder_point
         ORDER BY COALESCE(quantity_on_hand, 0) / NULLIF(reorder_point, 0) ASC`,
        [tenantId]
      );
      lowStockItems = result.rows;
    }

    if (lowStockItems.length === 0) return;

    stats.itemsFlagged += lowStockItems.length;

    // Get inventory managers
    const managers = await query(
      `SELECT email, first_name FROM users
       WHERE tenant_id = $1
         AND role IN ('admin', 'warehouse_manager', 'inventory_controller', 'operations_manager')
         AND is_active = true AND email IS NOT NULL`,
      [tenantId]
    );

    if (managers.rows.length === 0) return;

    // Build items table HTML
    const criticalItems = lowStockItems.filter(i => Number(i.current_stock) === 0);
    const lowItems = lowStockItems.filter(i => Number(i.current_stock) > 0);

    const itemRow = (item: any) => `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #eee"><strong>${item.item_code || '—'}</strong></td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #eee">${item.item_name}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #eee; text-align: center; color: ${Number(item.current_stock) === 0 ? '#e74c3c' : '#f39c12'}">
          <strong>${item.current_stock}</strong> ${item.unit_of_measure || ''}
        </td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #eee; text-align: center">${item.reorder_point}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #eee; text-align: center">${item.reorder_quantity || '—'}</td>
      </tr>`;

    const tableHeader = `
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 10px 0">
        <thead>
          <tr style="background: #f8f9fa">
            <th style="padding: 8px 10px; text-align: left">Code</th>
            <th style="padding: 8px 10px; text-align: left">Item</th>
            <th style="padding: 8px 10px; text-align: center">Stock</th>
            <th style="padding: 8px 10px; text-align: center">Reorder Pt</th>
            <th style="padding: 8px 10px; text-align: center">Order Qty</th>
          </tr>
        </thead>
        <tbody>`;

    const tableFooter = `</tbody></table>`;

    for (const mgr of managers.rows) {
      const subj = `${lowStockItems.length} item(s) below reorder point${criticalItems.length > 0 ? ` — ${criticalItems.length} OUT OF STOCK` : ''}`;
      await EmailQueueService.queueNormalPriority({
        to: mgr.email,
        subject: subj,
        template: 'system-notification',
        variables: {
          subject: subj,
          body: `
            <p>Hi ${mgr.first_name || 'Team'},</p>
            <p>The following inventory items need attention:</p>
            ${criticalItems.length > 0 ? `
              <h3 style="color: #e74c3c; margin: 16px 0 4px">Out of Stock (${criticalItems.length})</h3>
              ${tableHeader}${criticalItems.map(itemRow).join('')}${tableFooter}
            ` : ''}
            ${lowItems.length > 0 ? `
              <h3 style="color: #f39c12; margin: 16px 0 4px">Low Stock (${lowItems.length})</h3>
              ${tableHeader}${lowItems.map(itemRow).join('')}${tableFooter}
            ` : ''}
            <p style="margin-top: 16px">
              <a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/inventory">
                View Inventory →
              </a>
            </p>
          `,
          },
        });
      stats.alertsSent++;
    }
  });

  return stats;
}

export default runLowStockAlerts;
