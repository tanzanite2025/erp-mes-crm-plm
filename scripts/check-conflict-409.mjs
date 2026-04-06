import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();

const mustHaveConflictHandler = [
  'server/handlers/sales_orders.go',
  'server/handlers/purchase_orders.go',
  'server/handlers/materials.go',
  'server/handlers/products.go',
  'server/handlers/engineering.go',
  'server/handlers/customers.go',
  'server/handlers/suppliers.go',
  'server/handlers/logistics.go',
  'server/handlers/print_batch.go',
  'server/handlers/production_config.go',
];

const missing = [];

for (const relPath of mustHaveConflictHandler) {
  const absPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(absPath)) {
    missing.push(`${relPath} (file missing)`);
    continue;
  }

  const content = fs.readFileSync(absPath, 'utf8');
  if (!content.includes('respondVersionConflict(')) {
    missing.push(`${relPath} (respondVersionConflict not found)`);
  }
}

const commonFile = path.join(repoRoot, 'server/handlers/common.go');
if (!fs.existsSync(commonFile)) {
  missing.push('server/handlers/common.go (file missing)');
} else {
  const content = fs.readFileSync(commonFile, 'utf8');
  if (!content.includes('respondVersionConflict')) {
    missing.push('server/handlers/common.go (respondVersionConflict missing)');
  }
}

if (missing.length > 0) {
  console.error('Conflict 409 regression check failed:');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log('Conflict 409 regression check passed.');
