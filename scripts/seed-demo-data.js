/**
 * Demo Seed Data v3 — Ndaba Engineering (Pty) Ltd
 * Uses the correct module-specific schemas:
 *   hr.employees, inventory.items, accounting.chart_of_accounts,
 *   sales.customers, sales.quotations, purchase.suppliers,
 *   purchase.purchase_orders, purchase.purchase_order_lines
 * Plus public.sales_invoices, public.projects (which correctly use tenant_id)
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://doadmin:AVNS_Hu-3_r8U0tQ2cH0EpEh@db-postgresql-fra1-74418-do-user-27800709-0.l.db.ondigitalocean.com:25060/defaultdb',
  ssl: { rejectUnauthorized: false }
});
const T = '00000000-0000-0000-0000-000000000001';
const q = (sql, p) => pool.query(sql, p);

async function run() {
  console.log('=== Ndaba Engineering Demo Seed v3 ===\n');

  // 1. accounting.chart_of_accounts (uuid PK, tenant_id)
  console.log('1. Chart of accounts (accounting.chart_of_accounts)...');
  const coa = [
    ['1000','Cash & Bank','asset','Current Assets'],
    ['1100','Accounts Receivable','asset','Current Assets'],
    ['1200','Work In Progress','asset','Current Assets'],
    ['1500','Property Plant & Equipment','asset','Non-Current Assets'],
    ['1600','Accumulated Depreciation','asset','Non-Current Assets'],
    ['2000','Accounts Payable','liability','Current Liabilities'],
    ['2100','VAT Control Account','liability','Current Liabilities'],
    ['2200','PAYE Payable','liability','Current Liabilities'],
    ['3000','Share Capital','equity','Equity'],
    ['3100','Retained Earnings','equity','Equity'],
    ['4000','Engineering Fees Revenue','income','Revenue'],
    ['4100','Civil Works Revenue','income','Revenue'],
    ['4200','Steel & Fabrication Revenue','income','Revenue'],
    ['5000','Direct Labour','expense','Cost of Sales'],
    ['5100','Subcontractors','expense','Cost of Sales'],
    ['5200','Materials','expense','Cost of Sales'],
    ['6000','Salaries & Wages','expense','Operating Expenses'],
    ['6100','Rent & Occupancy','expense','Operating Expenses'],
    ['6200','Vehicle Expenses','expense','Operating Expenses'],
    ['6500','Depreciation','expense','Operating Expenses'],
    ['6800','Bank Charges & Interest','expense','Operating Expenses'],
  ];
  let coaN = 0;
  for (const [code,name,type,cat] of coa) {
    try {
      await q(`INSERT INTO accounting.chart_of_accounts (id,account_code,account_name,account_type,account_category,is_active,tenant_id,created_at,updated_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,true,$5,NOW(),NOW()) ON CONFLICT DO NOTHING`,[code,name,type,cat,T]);
      coaN++;
    } catch(e) {}
  }
  console.log(`   + ${coaN} accounts into accounting schema`);

  // 2. sales.customers (int PK, tenant_id, company_name, billing_address:text, payment_terms:varchar)
  console.log('2. Customers (sales.customers)...');
  const custs = [
    ['CUST-001','City of Johannesburg Metropolitan Municipality','government','Mr D Mthombeni','procurement@joburg.org.za','+27 11 407 6111','66 Jorissen Street, Braamfontein, Johannesburg 2001','Net 60',5000000],
    ['CUST-002','Impala Platinum Holdings Ltd','corporate','Ms T Sithole','contracts@implats.co.za','+27 11 731 9000','2 Fricker Road, Illovo, Sandton 2196','Net 30',10000000],
    ['CUST-003','Atterbury Property Developments (Pty) Ltd','corporate','Mr J van Zyl','jvanzyl@atterbury.co.za','+27 12 471 2000','Waterfall City, Bekker Road, Midrand 1682','Net 30',8000000],
    ['CUST-004','Transnet SOC Ltd','government','Ms P Dlamini','tenders@transnet.net','+27 11 308 3000','1 Rissik Street, Johannesburg 2001','Net 60',15000000],
    ['CUST-005','Abland (Pty) Ltd','corporate','Mr R Abramowitz','developments@abland.co.za','+27 11 790 3600','Protea Place, Sandton 2196','Net 30',6000000],
    ['CUST-006','Airports Company South Africa SOC Ltd','government','Ms L Nkosi','capital@airports.co.za','+27 11 921 6262','OR Tambo International Airport, Kempton Park 1632','Net 60',20000000],
  ];
  const custIds = {};
  for (const [code,name,type,contact,email,phone,addr,terms,limit] of custs) {
    try {
      const r = await q(`INSERT INTO sales.customers (tenant_id,company_name,contact_person,email,phone,customer_type,billing_address,payment_terms,credit_limit,currency_code,status,customer_code,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ZAR','active',$10,NOW()-INTERVAL '6 months',NOW()) RETURNING customer_id`,[T,name,contact,email,phone,type,addr,terms,limit,code]);
      custIds[code] = r.rows[0].customer_id;
    } catch(e) {
      try { const r = await q(`SELECT customer_id FROM sales.customers WHERE customer_code=$1 AND tenant_id=$2`,[code,T]); custIds[code]=r.rows[0]?.customer_id; } catch(e2){}
    }
  }
  console.log(`   + ${Object.keys(custIds).length} customers (IDs: ${Object.values(custIds).join(',')})`);

  // 3. hr.employees (int PK, tenant_id, department as string, salary not salary_amount, email not email_work)
  console.log('3. Employees (hr.employees)...');
  const emps = [
    ['EMP-001','Thabo','Ndaba','thabo.ndaba@ndabaeng.co.za','+27 83 456 7890','Executive','Chief Executive Officer','2018-01-15',195000],
    ['EMP-002','Nomsa','Dlamini','nomsa.dlamini@ndabaeng.co.za','+27 82 345 6789','Operations','Operations Manager','2018-03-01',145000],
    ['EMP-003','Sipho','Mthembu','sipho.mthembu@ndabaeng.co.za','+27 73 234 5678','Engineering','Senior Civil Engineer','2019-06-01',128000],
    ['EMP-004','Zanele','Khumalo','zanele.khumalo@ndabaeng.co.za','+27 71 123 4567','Projects','Project Manager','2020-02-15',115000],
    ['EMP-005','Mbuso','Ndlovu','mbuso.ndlovu@ndabaeng.co.za','+27 84 567 8901','Finance','Financial Manager','2019-09-01',138000],
    ['EMP-006','Priya','Naidoo','priya.naidoo@ndabaeng.co.za','+27 76 678 9012','HR','HR Manager','2020-07-01',110000],
    ['EMP-007','Johannes','van der Merwe','jvdmerwe@ndabaeng.co.za','+27 79 789 0123','Engineering','Structural Engineer','2021-01-15',122000],
    ['EMP-008','Fatima','Moosa','fatima.moosa@ndabaeng.co.za','+27 82 890 1234','Finance','Financial Accountant','2021-05-01',88000],
  ];
  const empIds = {};
  for (const [num,first,last,email,phone,dept,pos,hire,sal] of emps) {
    try {
      const r = await q(`INSERT INTO hr.employees (tenant_id,employee_number,first_name,last_name,email,phone,department,position,hire_date,employment_status,salary,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,NOW()-INTERVAL '3 months',NOW()) RETURNING employee_id`,[T,num,first,last,email,phone,dept,pos,hire,sal]);
      empIds[num] = r.rows[0].employee_id;
    } catch(e) {
      try { const r = await q(`SELECT employee_id FROM hr.employees WHERE employee_number=$1 AND tenant_id=$2`,[num,T]); empIds[num]=r.rows[0]?.employee_id; } catch(e2){ console.log('  emp err:',e.message.substring(0,80)); }
    }
  }
  console.log(`   + ${Object.keys(empIds).length} employees (IDs: ${Object.values(empIds).join(',')})`);

  // 4. inventory.items (int PK, tenant_id, sku not item_code, name not item_name, unit_cost not standard_cost)
  console.log('4. Items (inventory.items)...');
  const items = [
    ['ENG-FEES','Professional Engineering Fees','Qualified engineering services — design, analysis & certification','service','hour',1200,1850],
    ['CIVIL-WKS','Civil Engineering Works','Civil infrastructure — roads, stormwater & utilities','service','m2',2100,3200],
    ['STEEL-FAB','Structural Steel Fabrication','Steel design, fabrication and erection on site','service','ton',19000,28500],
    ['SITE-SUP','Site Supervision','Full-time qualified site agent and supervision','service','week',8500,12500],
    ['CONC-WKS','Concrete Structural Works','Reinforced concrete foundations, slabs and structural elements','service','m3',3200,4800],
    ['EARTHWRKS','Earthworks & Bulk Excavation','Cut, fill, compaction and disposal of earthworks','service','m3',220,380],
    ['SURVEY','Land Survey & Setting Out','Cadastral survey, setting out and as-built surveys','service','day',5500,8500],
    ['PROJ-MGT','Project Management','End-to-end project management and reporting','service','month',30000,45000],
  ];
  for (const [sku,name,desc,cat,uom,cost,price] of items) {
    try { await q(`INSERT INTO inventory.items (tenant_id,sku,name,description,category,unit_of_measure,unit_cost,selling_price,quantity_on_hand,reorder_level,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,true,NOW()-INTERVAL '1 year',NOW()) ON CONFLICT DO NOTHING`,[T,sku,name,desc,cat,uom,cost,price]); } catch(e){}
  }
  console.log(`   + ${items.length} items`);

  // 5. purchase.suppliers (int PK, tenant_id)
  console.log('5. Suppliers (purchase.suppliers)...');
  const supps = [
    ['SUP-001','Macsteel Service Centres SA (Pty) Ltd','Sales Desk','sales@macsteel.co.za','+27 11 871 0000','steel_distributor','Net 30','Macsteel House, 90 Main Reef Road, Johannesburg','Johannesburg','Gauteng','2001','ZA'],
    ['SUP-002','AfriSam (Pty) Ltd','Orders Desk','orders@afrisam.co.za','+27 11 670 5500','concrete_supplier','Net 30','41 Whitby Road, Roodepoort','Roodepoort','Gauteng','1724','ZA'],
    ['SUP-003','Geoserv Survey Equipment (Pty) Ltd','Rental Dept','rentals@geoserv.co.za','+27 11 462 1800','equipment_rental','Net 60','Unit 3 Wynberg Industrial Park, Sandton','Sandton','Gauteng','2196','ZA'],
    ['SUP-004','Voltex Electrical (Pty) Ltd','Trade Counter','trade@voltex.co.za','+27 11 490 5000','electrical_supplier','Net 30','85 Van Buuren Road, Bedfordview','Bedfordview','Gauteng','2007','ZA'],
  ];
  const suppIds = {};
  for (const [code,name,contact,email,phone,type,terms,addr,city,prov,postal,country] of supps) {
    try {
      const r = await q(`INSERT INTO purchase.suppliers (tenant_id,supplier_code,company_name,contact_person,email,phone,supplier_type,payment_terms,address,city,province,postal_code,country,currency_code,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ZAR','active',NOW()-INTERVAL '1 year',NOW()) RETURNING supplier_id`,[T,code,name,contact,email,phone,type,terms,addr,city,prov,postal,country]);
      suppIds[code] = r.rows[0].supplier_id;
    } catch(e) {
      try { const r = await q(`SELECT supplier_id FROM purchase.suppliers WHERE supplier_code=$1 AND tenant_id=$2`,[code,T]); suppIds[code]=r.rows[0]?.supplier_id; } catch(e2){ console.log('  supp err:',e.message.substring(0,80)); }
    }
  }
  console.log(`   + ${Object.keys(suppIds).length} suppliers`);

  // 6. public.projects (int PK, tenant_id, manager_id=int)
  console.log('6. Projects (public.projects)...');
  const projs = [
    ['Soweto Infrastructure Upgrade — Phase 2','PROJ-2024-001','Upgrading stormwater, roads and bulk earthworks across 12km in Soweto.','City of Johannesburg','2024-03-01','2026-08-31',18500000,'active','EMP-004'],
    ['Linbro Park Industrial Estate — Civil Works','PROJ-2024-002','Civil engineering for 45,000m2 industrial estate — roads, hardstanding, stormwater.','Abland (Pty) Ltd','2024-07-15','2025-12-31',9800000,'active','EMP-003'],
    ['Implats No.14 Shaft Collar Infrastructure','PROJ-2023-001','Structural steel and concrete works for shaft collar. Completed on time and within budget.','Impala Platinum','2023-01-10','2024-06-30',24700000,'completed','EMP-007'],
    ['OR Tambo Terminal B Extension — Concept','PROJ-2025-001','Concept design and feasibility for 15,000m2 terminal extension. Planning phase.','Airports Company SA','2025-02-01','2025-10-31',3200000,'planning','EMP-004'],
  ];
  const projIds = {};
  for (const [name,code,desc,client,start,end,budget,status,mgrKey] of projs) {
    try {
      const mgrId = empIds[mgrKey] || null;
      const r = await q(`INSERT INTO public.projects (tenant_id,project_name,project_code,description,client_name,start_date,end_date,budget,status,manager_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()-INTERVAL '6 months',NOW()) RETURNING project_id`,[T,name,code,desc,client,start,end,budget,status,mgrId]);
      projIds[code] = r.rows[0].project_id;
    } catch(e) {
      try { const r = await q(`SELECT project_id FROM public.projects WHERE project_code=$1 AND tenant_id=$2`,[code,T]); projIds[code]=r.rows[0]?.project_id; } catch(e2){ console.log('  proj err:',e.message.substring(0,60)); }
    }
  }
  console.log(`   + ${Object.keys(projIds).length} projects (IDs: ${Object.values(projIds).join(',')})`);

  // 7. public.sales_invoices + lines (int PK, tenant_id, customer_id=int→sales.customers)
  console.log('7. Sales invoices (public.sales_invoices)...');
  const invs = [
    ['INV-2026-001','CUST-001','2026-01-10','2026-03-10',1608695.65,241304.35,1850000,1850000,'paid','sent','Soweto Phase 2 — Progress Claim 4'],
    ['INV-2026-002','CUST-002','2026-01-25','2026-02-24',2173913.04,326086.96,2500000,2500000,'paid','sent','Implats Shaft — Final Completion Certificate'],
    ['INV-2026-003','CUST-003','2026-02-14','2026-03-16',869565.22,130434.78,1000000,0,'unpaid','sent','Waterfall City Services — Engineering Fees'],
    ['INV-2026-004','CUST-001','2026-02-28','2026-04-28',1391304.35,208695.65,1600000,0,'unpaid','sent','Soweto Phase 2 — Progress Claim 5'],
    ['INV-2026-005','CUST-005','2026-03-05','2026-04-04',652173.91,97826.09,750000,375000,'partial','sent','Linbro Park Industrial — Site Supervision Q1'],
    ['INV-2026-006','CUST-004','2026-03-20','2026-05-19',434782.61,65217.39,500000,0,'unpaid','draft','Transnet Yard Upgrade — Feasibility Study'],
  ];
  const invIds = {};
  for (const [num,custKey,date,due,sub,vat,tot,paid,payStatus,status,ref] of invs) {
    try {
      const custId = custIds[custKey] || null;
      const r = await q(`INSERT INTO public.sales_invoices (tenant_id,invoice_number,customer_id,invoice_date,due_date,reference,subtotal,tax_amount,total_amount,amount_paid,amount_due,balance_due,payment_status,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$4::date-INTERVAL '1 day',NOW()) RETURNING id`,[T,num,custId,date,due,ref,sub,vat,tot,paid,tot-paid,tot-paid,payStatus,status,ref]);
      invIds[num] = r.rows[0].id;
    } catch(e) {
      try { const r = await q(`SELECT id FROM public.sales_invoices WHERE invoice_number=$1 AND tenant_id=$2`,[num,T]); invIds[num]=r.rows[0]?.id; } catch(e2){ console.log('  inv err:',e.message.substring(0,80)); }
    }
  }
  const invLines = [
    ['INV-2026-001',1,'ENG-FEES','Professional Engineering Services — Progress Claim 4',180,1850,0.15],
    ['INV-2026-001',2,'SITE-SUP','Site Supervision — 12 weeks',12,12500,0.15],
    ['INV-2026-002',1,'STEEL-FAB','Structural Steel Fabrication & Erection — Shaft Collar',65,28500,0.15],
    ['INV-2026-002',2,'CONC-WKS','Reinforced Concrete Works — Collar Base & Headgear Foundation',120,4800,0.15],
    ['INV-2026-003',1,'ENG-FEES','Engineering Design — Waterfall City Bulk Services',320,1850,0.15],
    ['INV-2026-003',2,'SURVEY','Land Survey & Services Mapping — 3 days',3,8500,0.15],
    ['INV-2026-004',1,'CIVIL-WKS','Civil Construction — Roads & Stormwater Progress Claim 5',350,3200,0.15],
    ['INV-2026-004',2,'EARTHWRKS','Earthworks & Cut/Fill — 8400m3',8400,85,0.15],
    ['INV-2026-005',1,'SITE-SUP','Site Supervision — Q1 2026 (10 weeks)',10,12500,0.15],
    ['INV-2026-005',2,'PROJ-MGT','Project Management — Q1 2026',1,45000,0.15],
    ['INV-2026-006',1,'ENG-FEES','Feasibility Study — Transnet Yard Upgrade Phase 1',220,1850,0.15],
  ];
  let lc = 0;
  for (const [invNum,ln,code,desc,qty,price,vat] of invLines) {
    const invId = invIds[invNum]; if (!invId) continue;
    const lt = qty*price; const va = lt*vat;
    try { await q(`INSERT INTO public.sales_invoice_lines (invoice_id,tenant_id,line_number,item_code,description,quantity,unit_price,tax_rate,tax_amount,line_total,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,[invId,T,ln,code,desc,qty,price,vat*100,va,lt]); lc++; } catch(e){}
  }
  console.log(`   + ${Object.keys(invIds).length} invoices, ${lc} lines`);

  // 8. sales.quotations (int PK, tenant_id, uses total not total_amount)
  console.log('8. Quotations (sales.quotations)...');
  const quotes = [
    ['QUO-2026-001','CUST-006','2026-03-01','2026-04-30',4521739.13,678260.87,5200000,'sent','Terminal B Extension — Full Engineering & PM Package'],
    ['QUO-2026-002','CUST-002','2026-03-10','2026-04-09',8260869.57,1239130.43,9500000,'accepted','No.16 Shaft Infrastructure — New Contract Proposal'],
    ['QUO-2026-003','CUST-001','2026-04-01','2026-05-31',2173913.04,326086.96,2500000,'draft','Alexandra Roads Upgrade — Phase 3 Proposal'],
  ];
  const qIds = {};
  for (const [num,custKey,date,valid,sub,vat,tot,status,ref] of quotes) {
    try {
      const custId = custIds[custKey] || null;
      const r = await q(`INSERT INTO sales.quotations (tenant_id,quotation_number,customer_id,quotation_date,valid_until,subtotal,tax_amount,total,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$4::date-INTERVAL '1 day',NOW()) RETURNING quotation_id`,[T,num,custId,date,valid,sub,vat,tot,status,ref]);
      qIds[num] = r.rows[0].quotation_id;
    } catch(e) {
      try { const r = await q(`SELECT quotation_id FROM sales.quotations WHERE quotation_number=$1 AND tenant_id=$2`,[num,T]); qIds[num]=r.rows[0]?.quotation_id; } catch(e2){ console.log('  quote err:',e.message.substring(0,80)); }
    }
  }
  console.log(`   + ${Object.keys(qIds).length} quotations`);

  // 9. purchase.purchase_orders + lines (supplier_id, order_date, delivery_address:text)
  console.log('9. Purchase orders (purchase.purchase_orders)...');
  const pos = [
    ['PO-2026-001','SUP-001','2026-02-03','14 Northfield Ave, Linbro Park, Gauteng','approved',347826.09,52173.91,400000,'Steel for Linbro Park'],
    ['PO-2026-002','SUP-002','2026-02-15','Soweto Site Office, Moroka, Soweto, Gauteng','approved',173913.04,26086.96,200000,'Concrete — Soweto Progress Claim 5'],
    ['PO-2026-003','SUP-003','2026-03-01','14 Northfield Ave, Linbro Park, Gauteng','draft',43478.26,6521.74,50000,'Survey equipment rental — Linbro layout'],
  ];
  const poIds = {};
  for (const [num,suppKey,date,addr,status,sub,vat,tot,notes] of pos) {
    try {
      const suppId = suppIds[suppKey] || null;
      const r = await q(`INSERT INTO purchase.purchase_orders (tenant_id,po_number,supplier_id,order_date,delivery_address,status,subtotal,tax_amount,total_amount,notes,currency,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ZAR',NOW()-INTERVAL '1 month',NOW()) RETURNING purchase_order_id`,[T,num,suppId,date,addr,status,sub,vat,tot,notes]);
      poIds[num] = r.rows[0].purchase_order_id;
    } catch(e) {
      try { const r = await q(`SELECT purchase_order_id FROM purchase.purchase_orders WHERE po_number=$1 AND tenant_id=$2`,[num,T]); poIds[num]=r.rows[0]?.purchase_order_id; } catch(e2){ console.log('  po err:',e.message.substring(0,80)); }
    }
  }
  const poLines = [
    ['PO-2026-001',12000,22,264000,0.15,'Structural steel sections 100x100x6mm angle'],
    ['PO-2026-002',125,1200,150000,0.15,'30MPa Concrete Ready Mix — 125 loads'],
    ['PO-2026-003',30,1200,36000,0.15,'Total Station Rental Leica TS10 — 30 days'],
  ];
  let polc = 0;
  const poNums = ['PO-2026-001','PO-2026-002','PO-2026-003'];
  for (let i=0;i<poLines.length;i++) {
    const [qty,price,lt,vat,desc] = poLines[i];
    const poId = poIds[poNums[i]]; if (!poId) continue;
    const va = lt*vat;
    try { await q(`INSERT INTO purchase.purchase_order_lines (purchase_order_id,tenant_id,item_description,quantity,unit_price,tax_rate,tax_amount,line_total,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,[poId,T,desc,qty,price,vat*100,va,lt]); polc++; } catch(e){ console.log('  pol err:',e.message.substring(0,80)); }
  }
  console.log(`   + ${Object.keys(poIds).length} POs, ${polc} PO lines`);

  // 10. Payroll (public.payroll_periods + payroll_runs, integer PKs)
  console.log('10. Payroll...');
  let pp1, pp2;
  try { const r = await q(`INSERT INTO public.payroll_periods (period_name,period_type,start_date,end_date,pay_date,tax_year,tax_period,status,created_at,updated_at) VALUES ('February 2026','monthly','2026-02-01','2026-02-28','2026-02-26',2026,2,'closed',NOW()-INTERVAL '55 days',NOW()) RETURNING period_id`); pp1=r.rows[0].period_id; } catch(e) { try { const r=await q(`SELECT period_id FROM public.payroll_periods WHERE period_name='February 2026'`); pp1=r.rows[0]?.period_id; } catch(e2){} }
  try { const r = await q(`INSERT INTO public.payroll_periods (period_name,period_type,start_date,end_date,pay_date,tax_year,tax_period,status,created_at,updated_at) VALUES ('March 2026','monthly','2026-03-01','2026-03-31','2026-03-28',2026,3,'closed',NOW()-INTERVAL '25 days',NOW()) RETURNING period_id`); pp2=r.rows[0].period_id; } catch(e) { try { const r=await q(`SELECT period_id FROM public.payroll_periods WHERE period_name='March 2026'`); pp2=r.rows[0]?.period_id; } catch(e2){} }
  if (pp1) { try { await q(`INSERT INTO public.payroll_runs (period_id,run_number,run_date,run_type,status,total_employees,total_gross_pay,total_deductions,total_net_pay,total_paye,total_uif_employee,total_uif_employer,total_sdl,created_at,updated_at) VALUES ($1,1,'2026-02-24','regular','posted',8,1041000,282450,758550,229020,10410,10410,10410,NOW()-INTERVAL '56 days',NOW())`,[pp1]); } catch(e){} }
  if (pp2) { try { await q(`INSERT INTO public.payroll_runs (period_id,run_number,run_date,run_type,status,total_employees,total_gross_pay,total_deductions,total_net_pay,total_paye,total_uif_employee,total_uif_employer,total_sdl,created_at,updated_at) VALUES ($1,2,'2026-03-26','regular','posted',8,1041000,282450,758550,229020,10410,10410,10410,NOW()-INTERVAL '26 days',NOW())`,[pp2]); } catch(e){} }
  console.log(`   + payroll periods (IDs: ${pp1},${pp2}) + 2 runs`);

  // VERIFY
  console.log('\n--- Verification ---');
  const checks = await Promise.all([
    q(`SELECT COUNT(*) FROM accounting.chart_of_accounts WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM sales.customers WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM hr.employees WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM inventory.items WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM public.projects WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM public.sales_invoices WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM sales.quotations WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM purchase.suppliers WHERE tenant_id=$1`,[T]),
    q(`SELECT COUNT(*) FROM purchase.purchase_orders WHERE tenant_id=$1`,[T]),
  ]);
  const labels = ['CoA','Customers','Employees','Items','Projects','Invoices','Quotations','Suppliers','POs'];
  labels.forEach((l,i) => console.log(`  ${l}: ${checks[i].rows[0].count}`));

  await pool.end();
  console.log('\n=== SEED COMPLETE ===');
  console.log('Login: demo@siyabusaerp.co.za / Demo123!');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
