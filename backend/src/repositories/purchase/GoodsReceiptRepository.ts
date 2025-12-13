/**
 * Goods Receipt Repository
 */

import { BaseRepository, TenantContext } from '../BaseRepository';

export type GoodsReceiptStatus = 'draft' | 'confirmed' | 'cancelled';

export interface GoodsReceiptLine {
  id: string;
  goods_receipt_id: string;
  order_line_id?: string;
  item_code?: string;
  description?: string;
  quantity_ordered?: number;
  quantity_received: number;
  quantity_rejected?: number;
  rejection_reason?: string;
  unit_of_measure?: string;
  notes?: string;
  line_number?: number;
}

export interface GoodsReceipt {
  id: string;
  tenant_id: string;
  gr_number: string;
  gr_date: Date;
  order_id?: string;
  supplier_id?: string;
  delivery_note_number?: string;
  received_by?: string;
  status: GoodsReceiptStatus;
  total_quantity: number;
  warehouse_id?: string;
  notes?: string;
  confirmed?: boolean;
  confirmed_by?: string;
  confirmed_date?: Date;
  created_at: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
  deleted_at?: Date;
  lines?: GoodsReceiptLine[];
}

export class GoodsReceiptRepository extends BaseRepository<GoodsReceipt> {
  protected tableName = 'goods_receipts';
  protected schema = 'purchase';
  protected primaryKey = 'id';

  async getWithLines(ctx: TenantContext, grId: string): Promise<GoodsReceipt | null> {
    const receipt = await this.findById(ctx, grId);
    if (!receipt) return null;

    const linesSql = `
      SELECT * FROM purchase.goods_receipt_lines
      WHERE tenant_id = $1 AND goods_receipt_id = $2
      ORDER BY line_number
    `;
    const lines = await this.rawQuery<GoodsReceiptLine>(ctx, linesSql, [grId]);
    return { ...receipt, lines };
  }

  async createWithLines(
    ctx: TenantContext,
    data: Partial<GoodsReceipt>,
    lines: Partial<GoodsReceiptLine>[]
  ): Promise<GoodsReceipt> {
    const client = await this.beginTransaction();

    try {
      const numResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(gr_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
        FROM ${this.fullTableName}
        WHERE tenant_id = $1
      `, [ctx.tenantId]);
      const grNumber = `GR-${String(numResult.rows[0].next_num).padStart(6, '0')}`;

      const totalQty = lines.reduce((sum, l) => sum + (l.quantity_received || 0), 0);

      const grResult = await client.query<GoodsReceipt>(`
        INSERT INTO ${this.fullTableName}
        (tenant_id, gr_number, gr_date, order_id, supplier_id, delivery_note_number, received_by, status, total_quantity, warehouse_id, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `, [
        ctx.tenantId,
        grNumber,
        data.gr_date || new Date(),
        data.order_id,
        data.supplier_id,
        data.delivery_note_number,
        data.received_by,
        data.status || 'draft',
        totalQty,
        data.warehouse_id,
        data.notes,
        ctx.userId
      ]);

      const receipt = grResult.rows[0];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        await client.query(`
          INSERT INTO purchase.goods_receipt_lines
          (tenant_id, goods_receipt_id, line_number, order_line_id, item_code, description, quantity_ordered, quantity_received, quantity_rejected, rejection_reason, unit_of_measure, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [
          ctx.tenantId,
          receipt.id,
          i + 1,
          line.order_line_id,
          line.item_code,
          line.description,
          line.quantity_ordered || 0,
          line.quantity_received || 0,
          line.quantity_rejected || 0,
          line.rejection_reason,
          line.unit_of_measure || 'EA',
          line.notes
        ]);
      }

      await this.commitTransaction(client);
      return receipt;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

export const goodsReceiptRepository = new GoodsReceiptRepository();
export default goodsReceiptRepository;
