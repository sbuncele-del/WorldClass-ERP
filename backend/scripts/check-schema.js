const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://doadmin:AVNS_Hu-3_r8U0tQ2cH0EpEh@db-postgresql-fra1-74418-do-user-27800709-0.l.db.ondigitalocean.com:25060/defaultdb',
  ssl: { rejectUnauthorized: false }
});
const tables = ['chart_of_accounts','customers','vendors','items','sales_invoices','sales_invoice_lines','employees','fixed_assets','bank_accounts','cash_bank_accounts','projects','payroll_runs','payroll_run_lines','departments','warehouses','purchase_orders','purchase_order_lines','quotations','quotation_lines','stock_levels','item_categories'];
Promise.all(tables.map(t =>
  pool.query("SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t])
    .then(r => t + ':\n  ' + r.rows.map(x => x.column_name).join(', '))
)).then(r => { r.forEach(x => console.log(x + '\n')); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
