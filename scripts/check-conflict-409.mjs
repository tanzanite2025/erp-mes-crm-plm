import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();

const mustHaveConflictHandler = [
  { path: 'server/handlers/sales_orders.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/purchase_orders.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/materials.go', markers: ['respondVersionConflict('] },
  {
    path: 'server/handlers/products.go',
    markers: ['respondVersionConflict(', 'respondDomainError(c, err,'],
  },
  { path: 'server/handlers/engineering.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/customers.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/suppliers.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/logistics.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/print_batch.go', markers: ['respondVersionConflict('] },
  { path: 'server/handlers/production_topology_handlers.go', markers: ['respondVersionConflict('] },
  {
    path: 'server/handlers/enterprise_config.go',
    markers: ['respondVersionConflict(', 'respondDomainError(c, err,'],
  },
];

const missing = [];

for (const entry of mustHaveConflictHandler) {
  const absPath = path.join(repoRoot, entry.path);
  if (!fs.existsSync(absPath)) {
    missing.push(`${entry.path} (file missing)`);
    continue;
  }

  const content = fs.readFileSync(absPath, 'utf8');
  const hasConflictResponse = entry.markers.some((marker) =>
    content.includes(marker)
  );
  if (!hasConflictResponse) {
    missing.push(
      `${entry.path} (none of ${entry.markers.join(', ')} found)`
    );
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
