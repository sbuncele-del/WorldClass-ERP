# AI Tool Calling — Backend Service Map

> Generated: 2026-03-12
> Pattern: All V2 controllers use `TenantRequest` with `getTenantContext(req)` → `{ tenantId, userId, entityId }`
> Tenant context comes from middleware automatically. For direct service calls, pass `tenantId: string`.

---

## 1. SALES & CRM (66 functions)

**File:** `backend/src/controllers/sales.controller.v2.ts`
Uses repository pattern: `customerRepository`, `salesOrderRepository`, `invoiceRepository`, `quotationRepository`

### Customers
| Function | Params (query/body) | Returns |
|---|---|---|
| `getCustomers` | `?search, ?is_active, ?customer_type, ?page, ?limit` | Paginated customer list |
| `getCustomer` | `/:id` | Single customer with balance |
| `createCustomer` | body: `{ company_name, email, phone, customer_type, billing_address, ... }` | Created customer |
| `updateCustomer` | `/:id` + body fields | Updated customer |
| `deleteCustomer` | `/:id` | Deletion confirmation (blocked if has orders) |
| `getCustomerOrders` | `/:id ?page, ?limit` | Customer's sales orders |
| `getCustomerInvoices` | `/:id ?page, ?limit` | Customer's invoices |

### Sales Orders
| Function | Params | Returns |
|---|---|---|
| `getSalesOrders` | `?status, ?customer_id, ?start_date, ?end_date, ?page, ?limit` | Paginated orders |
| `getSalesOrder` | `/:id` | Single order with lines |
| `createSalesOrder` | body: `{ customer_id, order_date, lines: [{item_id, qty, unit_price}], notes }` | Created order |
| `updateSalesOrder` | `/:id` + body | Updated order |
| `confirmSalesOrder` | `/:id` | Order status → CONFIRMED |
| `cancelSalesOrder` | `/:id` | Order status → CANCELLED |
| `shipOrder` | `/:id` body: `{ tracking_number, carrier }` | Order status → SHIPPED |
| `deliverOrder` | `/:id` | Order status → DELIVERED |

### Invoices
| Function | Params | Returns |
|---|---|---|
| `getInvoices` | `?status, ?customer_id, ?from_date, ?to_date, ?search, ?page, ?limit` | Paginated invoices |
| `getInvoice` | `/:id` | Invoice with lines + payments |
| `createInvoice` | body: `{ customer_id, invoice_date, due_date, reference, notes, lines: [{description, quantity, unit_price, line_total, vat_rate, vat_amount, revenue_account_id}] }` | Created invoice (DRAFT) |
| `createInvoiceFromOrder` | `/:orderId` | Invoice generated from sales order |
| `sendInvoice` | `/:id` body: `{ email }` | Email sent confirmation |
| `approveInvoice` | `/:id` | Status → APPROVED |
| `voidInvoice` | `/:id` body: `{ reason }` | Status → VOID |
| `convertProformaToInvoice` | `/:id` | Proforma → Tax Invoice |
| `postInvoiceToGL` | `/:id` | GL journal entry created |
| `getInvoiceGLStatus` | `/:id` | GL posting status |
| `recordPaymentReceived` | `/:id` body: `{ amount, payment_date, payment_method, reference }` | Payment recorded |

### Quotations
| Function | Params | Returns |
|---|---|---|
| `getQuotations` | `?status, ?customer_id, ?page, ?limit` | Paginated quotations |
| `getQuotation` | `/:id` | Single quotation |
| `createQuotation` | body: `{ customer_id, lines, valid_until, notes }` | Created quotation |
| `updateQuotation` | `/:id` + body | Updated quotation |
| `deleteQuotation` | `/:id` | Deleted |
| `sendQuotation` | `/:id` body: `{ email }` | Email sent |
| `acceptQuotation` | `/:id` | Status → ACCEPTED |
| `convertQuotationToOrder` | `/:id` | Quotation → Sales Order |

### Credit Notes
| Function | Params | Returns |
|---|---|---|
| `getCreditNotes` | `?page, ?limit` | Paginated credit notes |
| `getCreditNoteById` | `/:id` | Single credit note |
| `createCreditNote` | body: `{ invoice_id, lines, reason }` | Created credit note |
| `updateCreditNote` | `/:id` + body | Updated |
| `deleteCreditNote` | `/:id` | Deleted |

### Receipts / Payments
| Function | Params | Returns |
|---|---|---|
| `getReceipts` | `?page, ?limit` | Paginated receipts |
| `getReceiptById` | `/:id` | Single receipt |
| `createReceipt` | body: `{ customer_id, amount, payment_method, reference }` | Created receipt |
| `updateReceipt` | `/:id` + body | Updated |
| `deleteReceipt` | `/:id` | Deleted |

### Retainers
| Function | Params | Returns |
|---|---|---|
| `getRetainers` | `?page, ?limit` | Paginated retainers |
| `getRetainerById` | `/:id` | Single retainer |
| `createRetainer` | body: `{ customer_id, amount, period, description }` | Created retainer |
| `updateRetainer` | `/:id` + body | Updated |

### CRM — Leads
| Function | Params | Returns |
|---|---|---|
| `getLeads` | `?status, ?source, ?page, ?limit` | Paginated leads |
| `getLeadById` | `/:id` | Single lead |
| `createLead` | body: `{ company_name, contact_name, email, phone, source, notes }` | Created lead |
| `updateLead` | `/:id` + body | Updated lead |
| `deleteLead` | `/:id` | Deleted |
| `convertLeadToOpportunity` | `/:id` | Lead → Opportunity |

### CRM — Opportunities
| Function | Params | Returns |
|---|---|---|
| `getOpportunities` | `?stage, ?page, ?limit` | Paginated opportunities |
| `getOpportunityById` | `/:id` | Single opportunity |
| `createOpportunity` | body: `{ name, customer_id, expected_value, close_date, stage }` | Created |
| `updateOpportunity` | `/:id` + body | Updated |
| `deleteOpportunity` | `/:id` | Deleted |

### Commissions & Pricing
| Function | Params | Returns |
|---|---|---|
| `getCommissions` | `?page, ?limit` | Paginated commissions |
| `getCommissionById` | `/:id` | Single commission |
| `createCommission` | body | Created |
| `updateCommission` | `/:id` + body | Updated |
| `deleteCommission` | `/:id` | Deleted |
| `getPricingRules` | `?page, ?limit` | Paginated pricing rules |
| `getPricingRuleById` | `/:id` | Single pricing rule |
| `createPricingRule` | body | Created |
| `updatePricingRule` | `/:id` + body | Updated |
| `deletePricingRule` | `/:id` | Deleted |

### Sales Analytics
| Function | Params | Returns |
|---|---|---|
| `getSalesDashboard` | (none) | Revenue, orders, top customers KPIs |
| `getSalesReport` | `?from_date, ?to_date` | Sales summary report |

**Service Layer:** `backend/src/modules/sales/service.ts` — `SalesService` class
- `createInvoice(dto: CreateInvoiceDto, userId)` — Direct DB invoice creation
- `getInvoiceById(invoiceId, tenantId)` — With lines + payments
- `listInvoices(filters: InvoiceFilters, tenantId, page, limit)` — Filtered list
- `updateInvoice(invoiceId, dto, tenantId, userId)` — DRAFT only

---

## 2. FINANCIAL / ACCOUNTING (29 functions)

**File:** `backend/src/modules/financial/controllers/financial.controller.v2.ts`

### Journal Entries
| Function | Params | Returns |
|---|---|---|
| `createJournalEntry` | body: `{ journal_date, description, source_type, lines: [{account_code, debit_amount, credit_amount, description, cost_center_id, tax_code}], notes, requires_approval }` | Created journal entry |
| `listJournalEntries` | `?status, ?from_date, ?to_date, ?source_type, ?page, ?limit` | Paginated entries |
| `getJournalEntry` | `/:id` | Single entry with lines |
| `postJournalEntry` | `/:id` | Status → POSTED, updates account balances |
| `reverseJournalEntry` | `/:id` body: `{ reversal_date, reason }` | Reversal entry created + posted |

### Chart of Accounts
| Function | Params | Returns |
|---|---|---|
| `getChartOfAccounts` | `?accountType, ?isActive, ?search` | Account list |
| `getAccount` | `/:id` | Single account |
| `createAccount` | body: `{ account_code, account_name, account_type, parent_account_id, description }` | Created account |
| `updateAccount` | `/:id` body: `{ account_name, description, is_active }` | Updated account |
| `getCOATemplates` | (none) | Available COA templates |
| `applyCOATemplate` | body: `{ template_id }` | Template applied |

### Financial Statements
| Function | Params | Returns |
|---|---|---|
| `getTrialBalance` | `?as_of_date` | All accounts with debit/credit totals |
| `getGeneralLedger` | `?from_date, ?to_date` | Full GL report |
| `getAccountLedger` | `/:accountId ?from_date, ?to_date` | Account transactions |
| `getAccountLedgerByCode` | `/:accountCode ?from_date, ?to_date` | Account transactions by code |
| `getBalanceSheet` | `?as_of_date` | Assets, Liabilities, Equity |
| `getIncomeStatement` | `?from_date, ?to_date` | Revenue, Expenses, Net Profit |
| `getCashFlowStatement` | `?from_date, ?to_date` | Operating/Investing/Financing activities |

### Tax Settings
| Function | Params | Returns |
|---|---|---|
| `getTaxSettings` | (none) | Tax rate configurations |
| `createTaxSetting` | body: `{ name, rate, type }` | Created tax setting |
| `updateTaxSetting` | `/:id` + body | Updated |

### Dimensions
| Function | Params | Returns |
|---|---|---|
| `getDimensions` | (none) | Cost centers, departments, projects |
| `getDimensionsSummary` | (none) | Summary stats |
| `createDimension` | body: `{ name, type, code }` | Created dimension |
| `updateDimension` | `/:id` + body | Updated |
| `deleteDimension` | `/:id` | Deleted |

### Fiscal Periods
| Function | Params | Returns |
|---|---|---|
| `getFiscalYears` | (none) | All fiscal years |
| `getFiscalPeriods` | `?fiscal_year_id` | Accounting periods |
| `getDashboard` | (none) | Financial dashboard KPIs |

**Service Layer:** `backend/src/modules/financial/services/journal-entry.service.ts` — `JournalEntryService`
- `createJournalEntry(request: CreateJournalEntryRequest, userId)` → journal ID
- `postJournalEntry(journalEntryId, userId)` → updates account balances
- `reverseJournalEntry(originalId, reversalDate, reason, userId)` → reversal ID
- `getTrialBalance(fiscalYear, fiscalPeriod)` → account balances

**Service Layer:** `backend/src/modules/financial/services/period.service.ts` — `PeriodService`
- `getAllFiscalYears()`, `getCurrentFiscalYear()`, `createFiscalYear(data)`, `closeFiscalYear(id, userId)`
- `getAllPeriods(yearId?)`, `getCurrentPeriod()`, `openPeriod(id, userId)`, `closePeriod(id, userId, force?)`

---

## 3. FINANCIAL REPORTS (standalone)

**File:** `backend/src/modules/financial-reports/service.ts` — `FinancialReportsService`

| Method | Params | Returns |
|---|---|---|
| `getTrialBalance` | `{ asOfDate?, tenantId, includeZeroBalances? }` | Accounts + totals + inBalance flag |
| `getBalanceSheet` | `{ asOfDate?, tenantId }` | Assets/Liabilities/Equity + totals |
| `getProfitAndLoss` | `{ fromDate, toDate, tenantId }` | Revenue/Expenses + net profit + margin |
| `getAccountTransactions` | `{ accountId, fromDate?, toDate?, tenantId, limit?, offset? }` | Transaction list + running balance |
| `getCashFlow` | `{ fromDate, toDate, tenantId }` | Cash in/out by activity type |

**V2 Controllers (class-based):**
- `BalanceSheetControllerV2.generateBalanceSheet` — `?as_of_date`
- `BalanceSheetControllerV2.getTrialBalance` — `?as_of_date`
- `IncomeStatementControllerV2.generateIncomeStatement` — `?from_date, ?to_date`
- `IncomeStatementControllerV2.getRevenueBreakdown` — `?from_date, ?to_date`
- `IncomeStatementControllerV2.getExpenseBreakdown` — `?from_date, ?to_date`
- `CashFlowControllerV2.generateCashFlowStatement` — `?from_date, ?to_date`
- `CashFlowControllerV2.getCashPosition` — (none)

---

## 4. CHART OF ACCOUNTS (standalone)

**File:** `backend/src/modules/chart-of-accounts/service.ts` — `ChartOfAccountsService`

| Method | Params | Returns |
|---|---|---|
| `getAllAccounts` | `{ accountType?, isActive?, search? }` | ChartAccount[] |
| `getAccountById` | `accountId: number` | ChartAccount |
| `createAccount` | `{ account_code, account_name, account_type, parent_account_id?, description? }` | ChartAccount |
| `updateAccount` | `accountId, { account_name?, description?, is_active? }` | ChartAccount |
| `deleteAccount` | `accountId: number` | boolean (blocked if has transactions) |
| `getChildAccounts` | `parentId: number` | ChartAccount[] |
| `getAccountTree` | (none) | Nested tree of accounts |
| `seedDefaultAccounts` | (none) | Seeds SA standard COA |

---

## 5. GL EXPLORER

**File:** `backend/src/controllers/gl-explorer.controller.v2.ts` — `GLExplorerControllerV2`

| Method | Params | Returns |
|---|---|---|
| `search` | `?query, ?account_type, ?from_date, ?to_date, ?page, ?limit` | Matched GL entries |
| `getAccountSummary` | `/:accountId` | Account details + balance |
| `getAccountLedger` | `/:accountId ?from_date, ?to_date` | Transaction history |
| `getFilterOptions` | (none) | Available filter values |

---

## 6. INVENTORY (36 functions)

**File:** `backend/src/controllers/inventory.controller.v2.ts`
Uses repositories: `inventoryItemRepository`, `itemCategoryRepository`, `stockMovementRepository`, `warehouseRepository`

### Item Categories
| Function | Params | Returns |
|---|---|---|
| `getItemCategories` | `?search, ?is_active, ?page, ?limit` | Paginated categories |
| `getItemCategoryTree` | (none) | Nested category tree |
| `getItemCategory` | `/:id` | Single category |
| `createItemCategory` | body: `{ name, code, parent_id, description }` | Created |
| `updateItemCategory` | `/:id` + body | Updated |
| `deleteItemCategory` | `/:id` | Deleted |

### Items
| Function | Params | Returns |
|---|---|---|
| `getItems` | `?search, ?category_id, ?is_active, ?item_type, ?page, ?limit` | Paginated items |
| `getItem` | `/:id` | Single item with stock levels |
| `createItem` | body: `{ sku, name, description, category_id, unit_price, cost_price, reorder_level, item_type }` | Created item |
| `updateItem` | `/:id` + body | Updated |
| `deleteItem` | `/:id` | Deleted |
| `getLowStockItems` | (none) | Items below reorder level |
| `getReorderSuggestions` | (none) | AI reorder suggestions |
| `generateReorderSuggestions` | (none) | Generate new suggestions |

### Warehouses
| Function | Params | Returns |
|---|---|---|
| `getWarehouses` | `?page, ?limit` | Warehouse list |
| `getWarehouse` | `/:id` | Single warehouse |
| `createWarehouse` | body: `{ name, code, address, is_default }` | Created |
| `setDefaultWarehouse` | `/:id` | Set as default |

### Stock Movements
| Function | Params | Returns |
|---|---|---|
| `getStockMovements` | `?item_id, ?warehouse_id, ?movement_type, ?from_date, ?to_date, ?page, ?limit` | Paginated movements |
| `createStockReceipt` | body: `{ warehouse_id, lines: [{item_id, quantity, unit_cost}], reference }` | Stock IN |
| `createStockIssue` | body: `{ warehouse_id, lines: [{item_id, quantity}], reference }` | Stock OUT |
| `createStockTransfer` | body: `{ from_warehouse_id, to_warehouse_id, lines: [{item_id, quantity}] }` | Transfer between warehouses |
| `getMovementSummary` | `?from_date, ?to_date` | Movement statistics |
| `getStockLevels` | `?warehouse_id` | Current stock by item |
| `createStockMovement` | body: `{ type, item_id, quantity, warehouse_id }` | Generic movement |
| `postStockMovement` | `/:id` | Post movement to GL |

### Stock Adjustments
| Function | Params | Returns |
|---|---|---|
| `getStockAdjustments` | `?page, ?limit` | Adjustment list |
| `getStockAdjustmentById` | `/:id` | Single adjustment |
| `createStockAdjustment` | body: `{ warehouse_id, lines: [{item_id, counted_qty, system_qty}], reason }` | Created |
| `postStockAdjustment` | `/:id` | Posted to GL |

### Stock Takes
| Function | Params | Returns |
|---|---|---|
| `getStockTakes` | `?page, ?limit` | Stock take list |
| `createStockTake` | body: `{ warehouse_id, lines: [{item_id, counted_qty}] }` | Created |
| `postStockTake` | `/:id` | Applied differences |

### Batches & Serial Numbers
| Function | Params | Returns |
|---|---|---|
| `getStockBatches` | `?item_id, ?page, ?limit` | Batch tracking |
| `getSerialNumbers` | `?item_id, ?page, ?limit` | Serial number tracking |

### Dashboard
| Function | Params | Returns |
|---|---|---|
| `getInventoryDashboard` | (none) | Inventory KPIs |

---

## 7. PURCHASE MANAGEMENT (37 functions)

**File:** `backend/src/controllers/purchase.controller.v2.ts`

### Suppliers
| Function | Params | Returns |
|---|---|---|
| `getSuppliers` | `?search, ?is_active, ?page, ?limit` | Paginated suppliers |
| `getSupplier` | `/:id` | Single supplier |
| `createSupplier` | body: `{ company_name, contact_name, email, phone, address }` | Created |
| `updateSupplier` | `/:id` + body | Updated |
| `deleteSupplier` | `/:id` | Deleted |

### Purchase Orders
| Function | Params | Returns |
|---|---|---|
| `getPurchaseOrders` | `?status, ?supplier_id, ?from_date, ?to_date, ?page, ?limit` | Paginated POs |
| `getPurchaseOrder` | `/:id` | Single PO with lines |
| `createPurchaseOrder` | body: `{ supplier_id, lines: [{item_id, quantity, unit_price}], notes }` | Created PO |
| `updatePurchaseOrder` | `/:id` + body | Updated |
| `sendPurchaseOrder` | `/:id` | Status → SENT |
| `acknowledgePurchaseOrder` | `/:id` | Status → ACKNOWLEDGED |
| `cancelPurchaseOrder` | `/:id` | Status → CANCELLED |

### Vendor Invoices (Bills)
| Function | Params | Returns |
|---|---|---|
| `getVendorInvoices` | `?status, ?supplier_id, ?page, ?limit` | Paginated bills |
| `getVendorInvoice` | `/:id` | Single bill |
| `createVendorInvoice` | body: `{ supplier_id, invoice_number, invoice_date, due_date, lines }` | Created |
| `updateVendorInvoice` | `/:id` + body | Updated |
| `deleteVendorInvoice` | `/:id` | Deleted |
| `approveVendorInvoice` | `/:id` | Status → APPROVED |
| `rejectVendorInvoice` | `/:id` | Status → REJECTED |
| `payVendorInvoice` | `/:id` body: `{ amount, payment_date, payment_method }` | Payment recorded |
| `postBillToGL` | `/:id` | GL journal entry created |
| `getBillGLStatus` | `/:id` | GL posting status |
| `recordPaymentMade` | `/:id` body: `{ amount, payment_date, bank_account_id }` | Payment recorded |

### Requisitions
| Function | Params | Returns |
|---|---|---|
| `getRequisitions` | `?status, ?page, ?limit` | Paginated requisitions |
| `getRequisition` | `/:id` | Single requisition |
| `createRequisition` | body: `{ items, department, justification }` | Created |
| `updateRequisition` | `/:id` + body | Updated |
| `approveRequisition` | `/:id` | Status → APPROVED |
| `rejectRequisition` | `/:id` | Status → REJECTED |
| `deleteRequisition` | `/:id` | Deleted |

### Goods Receipts (GRN)
| Function | Params | Returns |
|---|---|---|
| `getGoodsReceipts` | `?page, ?limit` | GRN list |
| `getGoodsReceipt` | `/:id` | Single GRN |
| `createGoodsReceipt` | body: `{ purchase_order_id, lines: [{item_id, received_qty}] }` | Created |
| `updateGoodsReceipt` | `/:id` + body | Updated |
| `confirmGoodsReceipt` | `/:id` | Status → CONFIRMED, updates stock |
| `deleteGoodsReceipt` | `/:id` | Deleted |

### Dashboard
| Function | Params | Returns |
|---|---|---|
| `getPurchaseDashboard` | (none) | Purchase KPIs |

---

## 8. HR & PAYROLL (26 functions)

**File:** `backend/src/modules/hr/controllers/hr.controller.v2.ts`

### Departments
| Function | Params | Returns |
|---|---|---|
| `getDepartments` | `?page, ?limit` | Department list |
| `getDepartmentById` | `/:id` | Single department |
| `createDepartment` | body: `{ name, code, manager_id, description }` | Created |
| `updateDepartment` | `/:id` + body | Updated |
| `deleteDepartment` | `/:id` | Deleted |

### Positions
| Function | Params | Returns |
|---|---|---|
| `getPositions` | (none) | Position list |
| `createPosition` | body: `{ title, department_id, grade, description }` | Created |

### Employees
| Function | Params | Returns |
|---|---|---|
| `getEmployees` | `?department_id, ?status, ?search, ?page, ?limit` | Paginated employees |
| `getEmployeeById` | `/:id` | Single employee |
| `createEmployee` | body: `{ first_name, last_name, email, id_number, department_id, position_id, hire_date, salary }` | Created |
| `updateEmployee` | `/:id` + body | Updated |
| `deleteEmployee` | `/:id` | Deleted |

### Payroll
| Function | Params | Returns |
|---|---|---|
| `getPayrollPeriods` | `?year` | Payroll period list |
| `createPayrollPeriod` | body: `{ period_name, start_date, end_date }` | Created |
| `processPayroll` | body: `{ period_id }` | Payroll run with calculated payslips |
| `getPayrollRunDetails` | `/:runId` | Run details with employee payslips |
| `getPayrollRuns` | `?page, ?limit` | Payroll run history |
| `postPayrollToGL` | `/:runId` | GL journal entries created |

### Leave Management
| Function | Params | Returns |
|---|---|---|
| `getLeaveRequests` | `?employee_id, ?status, ?page, ?limit` | Leave request list |
| `createLeaveRequest` | body: `{ employee_id, leave_type, start_date, end_date, reason }` | Created |
| `processLeaveRequest` | `/:id` body: `{ action: 'approve'|'reject', notes }` | Processed |
| `getLeaveBalances` | `?employee_id` | Leave balance by type |
| `getLeaveTypes` | (none) | Available leave types |

### Attendance
| Function | Params | Returns |
|---|---|---|
| `recordAttendance` | body: `{ employee_id, date, check_in, check_out }` | Recorded |
| `getAttendanceRecords` | `?employee_id, ?from_date, ?to_date` | Attendance list |

### Dashboard
| Function | Params | Returns |
|---|---|---|
| `getHRDashboard` | (none) | HR KPIs (headcount, turnover, etc.) |

**Service Layer:** `backend/src/modules/hr/services/`
- `tax-calculation.service.ts` — SA PAYE tax calculation
- `payslip.service.ts` — Payslip generation
- `leave-accrual.service.ts` — Leave balance calculation
- `employee-documents.service.ts` — Document management

---

## 9. CASH MANAGEMENT / BANK RECONCILIATION (27 functions)

**File:** `backend/src/modules/cash-management/controllers/cash-management.controller.ts`

### Bank Accounts
| Function | Params | Returns |
|---|---|---|
| `getBanks` | (none) | South African bank list |
| `getBankAccounts` | (none) | Tenant's bank accounts |
| `getBankAccountById` | `/:id` | Single bank account |
| `createBankAccount` | body: `{ bank_id, account_name, account_number, branch_code, gl_account_id }` | Created |
| `updateBankAccount` | `/:id` + body | Updated |

### Bank Statements
| Function | Params | Returns |
|---|---|---|
| `getStatements` | `?bank_account_id, ?from_date, ?to_date` | Statement list |
| `importStatement` | body: `{ bank_account_id, csv_data, bank_format }` | Imported with line count |
| `parseCSVPreview` | body: `{ csv_data, bank_format }` | Preview of parsed lines |
| `getStatementLines` | `?statement_id, ?status, ?page, ?limit` | Statement line items |
| `getCSVPreset` | `?bank_name` | CSV format preset for bank |

### Reconciliation
| Function | Params | Returns |
|---|---|---|
| `getReconciliationRules` | (none) | Matching rules |
| `createReconciliationRule` | body: `{ name, pattern, account_id, category }` | Created rule |
| `runAutoMatching` | body: `{ statement_id }` | Auto-matched lines count |
| `createMatch` | body: `{ statement_line_id, transaction_id }` | Manual match |
| `unmatch` | body: `{ statement_line_id }` | Unmatched |
| `getReconciliationWorkspace` | `/:statementId` | Full workspace (lines + matches + suggestions) |
| `allocateLine` | body: `{ line_id, account_id, description }` | Line allocated to GL account |
| `runAICategorization` | body: `{ statement_id }` | AI auto-categorized lines |

### GL Integration
| Function | Params | Returns |
|---|---|---|
| `getCashManagementSummary` | (none) | Overview stats |
| `getTrialBalance` | (none) | Cash-related GL balances |
| `getCashJournalEntries` | `?from_date, ?to_date` | Cash journal entries |
| `postUnpostedToGL` | (none) | Batch post unposted items to GL |
| `repostTransactionToGL` | `/:id` | Re-post single transaction |
| `getChartOfAccounts` | (none) | COA for allocation |
| `getCategories` | (none) | Transaction categories |
| `checkDuplicates` | body: `{ statement_id }` | Duplicate detection |
| `findPotentialDuplicates` | body: `{ statement_id }` | Potential duplicate pairs |

**Service Layer:** `backend/src/modules/cash-management/services/`
- `bank-reconciliation.service.ts` — `BankReconciliationService` (core CRUD + import)
- `matching.service.ts` — `MatchingService` (auto-matching, manual matching, workspace)
- `gl-integration.service.ts` — `GLIntegrationService` (journal entries, trial balance)
- `bulk-operations.service.ts` — `BulkOperationsService` (bulk match/unmatch/accept)
- `ai-categorization.service.ts` — `AICategorizeService` (AI categorization)
- `allocation-learning.service.ts` — `AllocationLearningService` (learns from user patterns)
- `multi-line-matching.service.ts` — Multi-line reconciliation
- `partial-reconciliation.service.ts` — Partial matching with tolerances

---

## 10. ASSET MANAGEMENT (17 functions)

**File:** `backend/src/controllers/assets.controller.v2.ts`

| Function | Params | Returns |
|---|---|---|
| `getAllAssets` | `?category, ?location, ?status, ?search, ?page, ?limit` | Paginated assets |
| `getAssetById` | `/:id` | Single asset with depreciation |
| `createAsset` | body: `{ name, asset_code, category_id, location_id, purchase_date, purchase_cost, depreciation_method, useful_life_months, salvage_value }` | Created (IAS 16 compliant) |
| `updateAsset` | `/:id` + body | Updated |
| `deleteAsset` | `/:id` | Deleted |
| `getAssetLocations` | (none) | Location list |
| `getAssetCategories` | (none) | Category list |
| `createAssetCategory` | body: `{ name, code, depreciation_method, useful_life }` | Created |
| `getAssetDisposals` | `?page, ?limit` | Disposal records |
| `createAssetDisposal` | body: `{ asset_id, disposal_date, proceeds, method }` | Disposal + GL posting |
| `getAssetTransfers` | `?page, ?limit` | Transfer history |
| `createAssetTransfer` | body: `{ asset_id, from_location, to_location, transfer_date }` | Transfer recorded |
| `getAssetMaintenance` | `/:assetId` | Maintenance records |
| `createAssetMaintenance` | body: `{ asset_id, type, description, cost, date }` | Maintenance logged |
| `getDepreciationSchedule` | `/:assetId` | Month-by-month depreciation |
| `runDepreciation` | body: `{ month, year }` | Batch depreciation run + GL posting |
| `getAssetDashboard` | (none) | Asset KPIs |

---

## 11. MANUFACTURING (9 functions)

**File:** `backend/src/modules/manufacturing/controllers/manufacturing.controller.v2.ts`

| Function | Params | Returns |
|---|---|---|
| `getWorkCenters` | `?page, ?limit` | Work center list |
| `createWorkCenter` | body: `{ name, code, capacity, cost_rate }` | Created |
| `getBOMs` | `?page, ?limit` | Bill of Materials list |
| `getBOMById` | `/:id` | Single BOM with materials |
| `createBOM` | body: `{ product_id, version, materials: [{item_id, quantity}], routing }` | Created |
| `getProductionOrders` | `?status, ?page, ?limit` | Production order list |
| `createProductionOrder` | body: `{ bom_id, quantity, planned_start, planned_end }` | Created |
| `updateProductionOrderStatus` | `/:id` body: `{ status }` | Status updated (PLANNED→IN_PROGRESS→COMPLETED) |
| `getDashboardStats` | (none) | Manufacturing KPIs |

**Services:** `backend/src/modules/manufacturing/services/`
- `bom.service.ts` — BOM CRUD
- `production.service.ts` — Production order management
- `mrp-engine.service.ts` — Material Requirements Planning
- `production-scheduler.service.ts` — Scheduling

---

## 12. DASHBOARD & KPIs (7 functions)

**File:** `backend/src/controllers/dashboard.controller.v2.ts` — `DashboardControllerV2`

| Method | Params | Returns |
|---|---|---|
| `getDashboardStats` | (none) | Revenue, expenses, profit, AR/AP totals |
| `getRevenueTrend` | `?months` (default 12) | Monthly revenue data |
| `getExpenseBreakdown` | `?from_date, ?to_date` | Expenses by category |
| `getRecentEntries` | `?limit` | Latest journal entries |
| `getCashPosition` | (none) | Bank balances, cash total |
| `getAgingSummary` | (none) | AR aging (30/60/90+ days) |
| `getKPIs` | (none) | Key performance indicators |

---

## 13. REPORTS (5 functions)

**File:** `backend/src/controllers/reports.controller.v2.ts` — `ReportsControllerV2`

| Method | Params | Returns |
|---|---|---|
| `getReportDefinitions` | `?category, ?page, ?limit` | Available report templates |
| `getReportDefinitionById` | `/:id` | Single report definition |
| `createReportDefinition` | body: `{ name, category, query, parameters }` | Custom report created |
| `getExecutionHistory` | `?report_id, ?page, ?limit` | Report run history |
| `getScheduledReports` | (none) | Scheduled report jobs |

---

## 14. AUDIT TRAIL (5 functions)

**File:** `backend/src/controllers/audit-trail.controller.v2.ts` — `AuditTrailControllerV2`

| Method | Params | Returns |
|---|---|---|
| `getAuditTrail` | `?entity_type, ?entity_id, ?user_id, ?action, ?from_date, ?to_date, ?page, ?limit` | Audit log entries |
| `getEntityHistory` | `/:entityType/:entityId` | Change history for entity |
| `getUserActivity` | `/:userId` | User's audit trail |
| `getAuditSummary` | `?from_date, ?to_date` | Summary statistics |
| `getChangeComparison` | `/:auditId` | Before/after diff |

---

## 15. ADMIN & USER MANAGEMENT (14 functions)

**File:** `backend/src/controllers/admin.controller.v2.ts` — `AdminControllerV2`

| Method | Params | Returns |
|---|---|---|
| `getAllUsers` | `?search, ?role, ?page, ?limit` | User list |
| `getUserById` | `/:id` | Single user |
| `createUser` | body: `{ email, first_name, last_name, role, password }` | Created user |
| `updateUser` | `/:id` + body | Updated |
| `deleteUser` | `/:id` | Deleted |
| `getRoles` | (none) | Role list |
| `createRole` | body: `{ name, permissions }` | Created role |
| `getAuditLog` | `?page, ?limit` | Admin audit log |
| `getSettings` | (none) | Tenant settings |
| `updateSettings` | body: `{ settings }` | Updated settings |
| `inviteUser` | body: `{ email, role, first_name }` | Invitation sent |
| `acceptInvitation` | body: `{ token, password }` | Invitation accepted |
| `resendInvitation` | `/:invitationId` | Re-sent |
| `inviteAccountant` | body: `{ email, firm_name }` | Accountant invited |

---

## 16. PRACTICE MANAGEMENT

### Projects — `backend/src/controllers/v2/practice-projects.controller.v2.ts`
| Function | Params | Returns |
|---|---|---|
| `getAllProjects` | `?status, ?client_id, ?page, ?limit` | Project list |
| `getProjectById` | `/:id` | Project with details |
| `createProject` | body: `{ name, client_id, budget, start_date, end_date }` | Created |
| `updateProject` | `/:id` + body | Updated |
| `deleteProject` | `/:id` | Deleted |
| `getProjectTeam` | `/:id/team` | Team members |
| `addTeamMember` | `/:id/team` body: `{ user_id, role }` | Member added |
| `removeTeamMember` | `/:id/team/:memberId` | Removed |
| `getProjectHealth` | `/:id/health` | Health score |

### Tasks — `backend/src/controllers/v2/practice-tasks.controller.v2.ts`
| Function | Params | Returns |
|---|---|---|
| `getAllTasks` | `?project_id, ?status, ?assignee, ?page, ?limit` | Task list |
| `getTaskById` | `/:id` | Single task |
| `createTask` | body: `{ project_id, title, description, assignee_id, due_date, priority }` | Created |
| `updateTask` | `/:id` + body | Updated |
| `deleteTask` | `/:id` | Deleted |
| `getMyTasks` | (none) | Current user's tasks |

### Time Tracking — `backend/src/controllers/v2/practice-time-tracking.controller.v2.ts`
| Function | Params | Returns |
|---|---|---|
| `getAllTimeEntries` | `?project_id, ?user_id, ?from_date, ?to_date, ?page, ?limit` | Time entries |
| `getTimeEntryById` | `/:id` | Single entry |
| `createTimeEntry` | body: `{ project_id, task_id, date, hours, description, billable }` | Created |
| `updateTimeEntry` | `/:id` + body | Updated |
| `deleteTimeEntry` | `/:id` | Deleted |
| `approveTimeEntries` | body: `{ entry_ids }` | Approved |
| `rejectTimeEntries` | body: `{ entry_ids, reason }` | Rejected |
| `getTimesheet` | `?user_id, ?week_start` | Weekly timesheet |
| `getPendingApprovals` | (none) | Entries awaiting approval |

### Client Health — `backend/src/controllers/v2/practice-client-health.controller.v2.ts`
| Function | Params | Returns |
|---|---|---|
| `getClient360` | `/:clientId` | Full client view |
| `getAllClientHealth` | `?page, ?limit` | Health scores |
| `calculateHealthScore` | `/:clientId` | Computed health score |
| `logInteraction` | body: `{ client_id, type, notes }` | Interaction logged |
| `getInteractions` | `/:clientId ?page, ?limit` | Interaction history |
| `getHealthHistory` | `/:clientId` | Health score over time |

---

## 17. ACCOUNTING AUTOMATION

**File:** `backend/src/modules/accounting/accounting.automation.service.ts` — `AccountingAutomationService`

| Method | Params | Returns |
|---|---|---|
| `getChartOfAccounts` | `tenantId, entityId?` | COA list |
| `getAccountByCode` | `tenantId, accountCode` | Single account |
| `createJournalEntry` | `CreateJournalEntryRequest` | Created entry |
| `processAPInvoiceOCR` | `tenantId, documentUrl` | Parsed AP invoice |
| `getCashPosition` | `tenantId` | Cash position |
| `getBalanceSheet` | `tenantId, asOfDate` | Balance sheet |
| `getIncomeStatement` | `tenantId, startDate, endDate` | Income statement |

---

## TENANT CONTEXT PATTERN

All V2 controllers follow this pattern:
```typescript
// Middleware sets req.tenant, req.user, req.entity
function getTenantContext(req: TenantRequest): TenantContext {
  return {
    tenantId: req.tenant.id,    // UUID string
    userId: req.user?.id,       // number
    entityId: req.entity?.id    // UUID string (optional, for multi-entity)
  };
}
```

For direct service calls (AI agent), pass `tenantId: string` as parameter.
For repository-pattern services, pass `ctx: TenantContext` = `{ tenantId, userId, entityId }`.

---

## SUMMARY — TOTAL AI-CALLABLE FUNCTIONS

| Module | Count |
|---|---|
| Sales & CRM | 66 |
| Financial / Accounting | 29 |
| Financial Reports | 12 |
| Chart of Accounts | 8 |
| GL Explorer | 4 |
| Inventory | 36 |
| Purchase Management | 37 |
| HR & Payroll | 26 |
| Cash Management | 27 |
| Asset Management | 17 |
| Manufacturing | 9 |
| Dashboard & KPIs | 7 |
| Reports | 5 |
| Audit Trail | 5 |
| Admin & Users | 14 |
| Practice Management | 31 |
| Accounting Automation | 7 |
| **TOTAL** | **~340 functions** |
