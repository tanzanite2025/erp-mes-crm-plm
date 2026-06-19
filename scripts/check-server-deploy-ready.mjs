#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

function fail(message, details = '') {
  console.error(`\n[SERVER_DEPLOY_CHECK_FAILED] ${message}`)
  if (details) console.error(details)
  process.exit(1)
}

function load(pathFromRoot) {
  const absPath = resolve(repoRoot, pathFromRoot)
  if (!existsSync(absPath)) {
    fail('Missing required file.', `Path: ${pathFromRoot}`)
  }
  return readFileSync(absPath, 'utf8')
}

function expectIncludes(content, marker, filePath, failures) {
  if (!content.includes(marker)) {
    failures.push(`${filePath}: missing "${marker}"`)
  }
}

function expectNotIncludes(content, marker, filePath, failures) {
  if (content.includes(marker)) {
    failures.push(`${filePath}: should not include "${marker}"`)
  }
}

const files = {
  deploySh: 'deploy.sh',
  deployProdSh: 'server/deploy-prod.sh',
  compose: 'server/docker-compose.yml',
  nginxInternalLb: 'server/deployment/nginx/internal_lb.conf',
  nginxServerSite: 'server/deployment/nginx/erp.tanzanite.site.conf',
  nginxRootSite: 'deployment/nginx/erp.tanzanite.site.conf',
}

const deploySh = load(files.deploySh)
const deployProdSh = load(files.deployProdSh)
const compose = load(files.compose)
const nginxInternalLb = load(files.nginxInternalLb)
const nginxServerSite = load(files.nginxServerSite)
const nginxRootSite = load(files.nginxRootSite)

const failures = []

// Root deploy script safety expectations.
expectIncludes(deploySh, '-e server/.env', files.deploySh, failures)
expectIncludes(deploySh, '-e server/uploads', files.deploySh, failures)
expectIncludes(deploySh, '-e server/backups', files.deploySh, failures)
expectIncludes(deploySh, '-e server/postgres_data', files.deploySh, failures)
expectIncludes(deploySh, './server/deploy-prod.sh', files.deploySh, failures)

// Production deploy script expectations.
expectIncludes(
  deployProdSh,
  'mkdir -p ./uploads ./backups ./postgres_data',
  files.deployProdSh,
  failures
)
expectIncludes(
  deployProdSh,
  'DEFAULT_SERVICES=(db redis search-engine app nginx_lb)',
  files.deployProdSh,
  failures
)
expectIncludes(
  deployProdSh,
  'FULL_BUILD_SERVICES=(db redis search-engine app watchdog nginx_lb)',
  files.deployProdSh,
  failures
)
expectIncludes(
  deployProdSh,
  'docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --remove-orphans db redis nginx_lb',
  files.deployProdSh,
  failures
)
expectIncludes(
  deployProdSh,
  'docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --build search-engine app',
  files.deployProdSh,
  failures
)
expectIncludes(
  deployProdSh,
  'docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --build --remove-orphans "${FULL_BUILD_SERVICES[@]}"',
  files.deployProdSh,
  failures
)
expectIncludes(
  deployProdSh,
  'cp ./deployment/nginx/erp.tanzanite.site.conf /etc/nginx/sites-available/xdfc_erp',
  files.deployProdSh,
  failures
)

// Compose volume and service-chain expectations.
expectIncludes(compose, './uploads:/app/uploads', files.compose, failures)
expectIncludes(compose, './backups:/app/backups', files.compose, failures)
expectNotIncludes(compose, './uploads:/usr/share/nginx/html/uploads:ro', files.compose, failures)
expectIncludes(compose, 'db:', files.compose, failures)
expectIncludes(compose, 'redis:', files.compose, failures)
expectIncludes(compose, 'app:', files.compose, failures)
expectIncludes(compose, 'watchdog:', files.compose, failures)
expectIncludes(compose, 'nginx_lb:', files.compose, failures)

// Nginx authenticated uploads proxy expectations.
expectIncludes(nginxInternalLb, 'location /uploads/', files.nginxInternalLb, failures)
expectIncludes(
  nginxInternalLb,
  'proxy_pass $app_upstream;',
  files.nginxInternalLb,
  failures
)
expectIncludes(
  nginxServerSite,
  'location /uploads/',
  files.nginxServerSite,
  failures
)
expectIncludes(
  nginxRootSite,
  'location /uploads/',
  files.nginxRootSite,
  failures
)
expectIncludes(nginxServerSite, 'proxy_pass http://localhost:8080;', files.nginxServerSite, failures)
expectIncludes(nginxRootSite, 'proxy_pass http://localhost:8080;', files.nginxRootSite, failures)
expectNotIncludes(nginxInternalLb, 'alias /usr/share/nginx/html/uploads/', files.nginxInternalLb, failures)
expectNotIncludes(nginxServerSite, 'alias /var/www/erp/server/uploads/', files.nginxServerSite, failures)
expectNotIncludes(nginxRootSite, 'alias /var/www/erp/server/uploads/', files.nginxRootSite, failures)

if (failures.length > 0) {
  fail(
    'Server deployment self-check failed.',
    `Please fix the following items:\n- ${failures.join('\n- ')}`
  )
}

console.log('[SERVER_DEPLOY_CHECK] OK: deploy scripts, compose, and authenticated upload proxy are aligned.')
