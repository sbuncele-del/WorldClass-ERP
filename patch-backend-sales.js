/**
 * Backend patch script for sales.controller.js
 * 1. Fix deleteCustomer to include tenant_id
 * 2. Add auto-customer-creation to updateOpportunity when CLOSED_WON
 */
const fs = require('fs');
const file = '/app/dist/controllers/sales.controller.js';
let code = fs.readFileSync(file, 'utf8');
let patchCount = 0;

// ── PATCH 1: Fix deleteCustomer to include tenant_id ──
const oldDelete = `await client.query('DELETE FROM sales.customers WHERE customer_id = $1', [id]);`;
const newDelete = `// Extract tenant_id from JWT
        const tenantId = req.tenant?.id || req.tenantId || (req.user && req.user.tenantId);
        if (tenantId) {
            await client.query('DELETE FROM sales.customers WHERE customer_id = $1 AND tenant_id = $2', [id, tenantId]);
        } else {
            await client.query('DELETE FROM sales.customers WHERE customer_id = $1', [id]);
        }`;

if (code.includes(oldDelete)) {
  code = code.replace(oldDelete, newDelete);
  patchCount++;
  console.log('PATCH 1: deleteCustomer tenant_id fix applied');
} else {
  console.log('PATCH 1: deleteCustomer already patched or not found');
}

// ── PATCH 2: Add auto-customer-creation to updateOpportunity ──
// Find the commit in updateOpportunity and add customer creation before it
const oldUpdateCommit = `        await client.query('COMMIT');
        res.json({
            message: 'Opportunity updated successfully',
            opportunity
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating opportunity:', error);
        res.status(500).json({ error: 'Failed to update opportunity' });
    }
    finally {
        client.release();
    }
};
exports.updateOpportunity = updateOpportunity;`;

const newUpdateCommit = `        // Auto-create customer when deal is CLOSED_WON
        let customerCreated = null;
        const upperStage = (opportunity.stage || '').toUpperCase();
        if (upperStage === 'CLOSED_WON' || upperStage === 'WON') {
            const tenantId = opportunity.tenant_id || req.tenant?.id || req.tenantId || (req.user && req.user.tenantId);
            if (tenantId) {
                // Set closed_at
                await client.query('UPDATE sales.opportunities SET closed_at = NOW() WHERE opportunity_id = $1', [id]);
                // Check if customer already exists
                let existingCust = null;
                if (opportunity.email) {
                    const byEmail = await client.query('SELECT customer_id FROM sales.customers WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)', [tenantId, opportunity.email]);
                    if (byEmail.rows.length > 0) existingCust = byEmail.rows[0];
                }
                if (!existingCust && opportunity.opportunity_name) {
                    const byName = await client.query('SELECT customer_id FROM sales.customers WHERE tenant_id = $1 AND LOWER(company_name) = LOWER($2)', [tenantId, opportunity.opportunity_name]);
                    if (byName.rows.length > 0) existingCust = byName.rows[0];
                }
                if (!existingCust) {
                    const custCount = await client.query('SELECT COUNT(*) FROM sales.customers WHERE tenant_id = $1', [tenantId]);
                    const custCode = 'CUST-' + String(parseInt(custCount.rows[0].count) + 1).padStart(4, '0');
                    const newCust = await client.query(
                        \`INSERT INTO sales.customers (tenant_id, customer_code, company_name, contact_person, email, phone, customer_type, status, payment_terms, credit_limit)
                         VALUES ($1, $2, $3, $4, $5, $6, 'corporate', 'active', '30', 0) RETURNING customer_id, company_name\`,
                        [tenantId, custCode, opportunity.opportunity_name, opportunity.contact_person || null, opportunity.email || null, opportunity.phone || null]
                    );
                    await client.query('UPDATE sales.opportunities SET customer_id = $1 WHERE opportunity_id = $2', [newCust.rows[0].customer_id, id]);
                    customerCreated = newCust.rows[0];
                    console.log('Auto-created customer:', customerCreated.company_name, 'from won deal');
                } else {
                    await client.query('UPDATE sales.opportunities SET customer_id = $1 WHERE opportunity_id = $2', [existingCust.customer_id, id]);
                }
            }
        }
        await client.query('COMMIT');
        res.json({
            message: 'Opportunity updated successfully',
            opportunity,
            customer_created: customerCreated
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating opportunity:', error);
        res.status(500).json({ error: 'Failed to update opportunity' });
    }
    finally {
        client.release();
    }
};
exports.updateOpportunity = updateOpportunity;`;

if (code.includes(oldUpdateCommit)) {
  code = code.replace(oldUpdateCommit, newUpdateCommit);
  patchCount++;
  console.log('PATCH 2: updateOpportunity auto-customer-creation applied');
} else {
  console.log('PATCH 2: updateOpportunity pattern not found (may already be patched)');
}

fs.writeFileSync(file, code);
console.log(`Done. ${patchCount} patch(es) applied.`);
