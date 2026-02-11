#!/bin/bash
# Patch bank reconciliation allocate endpoint

docker exec -i worldclass-backend bash << 'EOF'
cat > /tmp/allocate-patch.js << 'PATCH'
// Allocate endpoint patch - adds total_debit/total_credit
const originalFile = require('fs').readFileSync('/app/dist/routes/v2.routes.js', 'utf8');

// Find and replace the allocation INSERT statement
const pattern = /entry_date, description, reference, status, source_type, created_by, created_at\)\s*VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, 'posted', 'bank_reconciliation', \$7, NOW\(\)\)/g;
const replacement = `entry_date, description, reference, status, source_type, total_debit, total_credit, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'posted', 'bank_reconciliation', $7, $7, $8, NOW())`;

const patched = originalFile.replace(pattern, replacement);
require('fs').writeFileSync('/app/dist/routes/v2.routes.js', patched);
console.log('Patched!');
PATCH

node /tmp/allocate-patch.js
EOF
