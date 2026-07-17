#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function fail(message, details = '') {
  console.error(`\n[SERVER_DEPLOY_CHECK_FAILED] ${message}`)
  if (details) console.error(details)
  process.exit(1)
}

function load(pathFromRoot) {
  const absolutePath = resolve(repoRoot, pathFromRoot)
  if (!existsSync(absolutePath)) {
    fail('Missing required file.', `Path: ${pathFromRoot}`)
  }
  return readFileSync(absolutePath, 'utf8')
}

function expectIncludes(content, marker, filePath, failures) {
  if (!content.includes(marker)) failures.push(`${filePath}: missing "${marker}"`)
}

function expectNotIncludes(content, marker, filePath, failures) {
  if (content.includes(marker)) failures.push(`${filePath}: should not include "${marker}"`)
}

const files = {
  deploy: 'deploy.sh',
  compatibilityDeploy: 'server/deploy-prod.sh',
  productionCompose: 'compose.prod.yml',
  gatewayCompose: 'deployment/gateway/compose.yml',
  apiDockerfile: 'server/Dockerfile',
  webDockerfile: 'deployment/docker/web.Dockerfile',
  webNginx: 'deployment/nginx/erp-web.conf',
  imageWorkflow: '.github/workflows/publish-images.yml',
}

const deploy = load(files.deploy)
const compatibilityDeploy = load(files.compatibilityDeploy)
const productionCompose = load(files.productionCompose)
const gatewayCompose = load(files.gatewayCompose)
const apiDockerfile = load(files.apiDockerfile)
const webDockerfile = load(files.webDockerfile)
const webNginx = load(files.webNginx)
const imageWorkflow = load(files.imageWorkflow)
const failures = []

expectIncludes(deploy, 'COMPOSE_FILE="compose.prod.yml"', files.deploy, failures)
expectIncludes(deploy, 'EDGE_NETWORK="tanzanite-edge"', files.deploy, failures)
expectIncludes(deploy, 'docker network inspect', files.deploy, failures)
expectIncludes(deploy, '^sha-[0-9a-f]{7,40}$', files.deploy, failures)
expectIncludes(deploy, '"${COMPOSE[@]}" pull', files.deploy, failures)
expectIncludes(deploy, '"${COMPOSE[@]}" up -d --remove-orphans', files.deploy, failures)
expectNotIncludes(deploy, 'pnpm build', files.deploy, failures)
expectNotIncludes(deploy, 'systemctl reload nginx', files.deploy, failures)
expectIncludes(compatibilityDeploy, 'exec ./deploy.sh "$@"', files.compatibilityDeploy, failures)

for (const image of ['erp-web', 'erp-api', 'erp-search', 'erp-watchdog']) {
  expectIncludes(
    productionCompose,
    `ghcr.io/tanzanite2025/${image}:`,
    files.productionCompose,
    failures
  )
  expectIncludes(imageWorkflow, `image: ${image}`, files.imageWorkflow, failures)
}

expectIncludes(productionCompose, 'name: erp', files.productionCompose, failures)
expectIncludes(productionCompose, 'external: true', files.productionCompose, failures)
expectIncludes(productionCompose, 'name: tanzanite-edge', files.productionCompose, failures)
expectIncludes(productionCompose, '- erp-web', files.productionCompose, failures)
expectIncludes(productionCompose, 'internal: true', files.productionCompose, failures)
expectIncludes(productionCompose, 'pull_policy: always', files.productionCompose, failures)
expectIncludes(productionCompose, '${IMAGE_TAG:?IMAGE_TAG is required}', files.productionCompose, failures)
expectIncludes(productionCompose, 'no-new-privileges:true', files.productionCompose, failures)
expectIncludes(productionCompose, '- storage:/app/storage', files.productionCompose, failures)
expectIncludes(productionCompose, 'mem_limit:', files.productionCompose, failures)
expectIncludes(productionCompose, 'cpus:', files.productionCompose, failures)
expectNotIncludes(productionCompose, 'container_name:', files.productionCompose, failures)
expectNotIncludes(productionCompose, 'ports:', files.productionCompose, failures)
expectNotIncludes(productionCompose, 'build:', files.productionCompose, failures)
expectNotIncludes(productionCompose, '${IMAGE_TAG:-master}', files.productionCompose, failures)
expectNotIncludes(productionCompose, 'docker.sock', files.productionCompose, failures)

expectIncludes(gatewayCompose, 'image: caddy:', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, '"80:80"', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, '"443:443"', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'name: tanzanite-edge', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'reverse_proxy erp-web:8080', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'trusted_proxies static', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'ERP_SITE: ${ERP_SITE:-http://erp.tanzanite.site}', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'admin off', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'caddy fmt --overwrite /tmp/Caddyfile', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'http://127.0.0.1/__edge/health', files.gatewayCompose, failures)
expectIncludes(gatewayCompose, 'mem_limit: 256m', files.gatewayCompose, failures)
expectNotIncludes(gatewayCompose, 'docker.sock', files.gatewayCompose, failures)
expectNotIncludes(gatewayCompose, 'network_mode: host', files.gatewayCompose, failures)
expectNotIncludes(gatewayCompose, 'configs:', files.gatewayCompose, failures)
expectNotIncludes(gatewayCompose, '"443:443/udp"', files.gatewayCompose, failures)

expectIncludes(apiDockerfile, '/app/uploads /app/backups /app/storage', files.apiDockerfile, failures)
expectIncludes(webDockerfile, 'USER nginx', files.webDockerfile, failures)
expectIncludes(
  webDockerfile,
  'COPY scripts/setup-git-hooks.mjs ./scripts/setup-git-hooks.mjs',
  files.webDockerfile,
  failures
)
expectIncludes(webDockerfile, 'pnpm install --frozen-lockfile', files.webDockerfile, failures)
expectIncludes(webNginx, 'location = /api/v1/system/metrics', files.webNginx, failures)
expectIncludes(webNginx, 'return 404;', files.webNginx, failures)
expectIncludes(webNginx, 'set $app_upstream http://app:8080;', files.webNginx, failures)
expectIncludes(webNginx, 'location /uploads/', files.webNginx, failures)
expectIncludes(webNginx, 'map $uri $cache_control', files.webNginx, failures)
expectIncludes(webNginx, 'add_header Cache-Control $cache_control always;', files.webNginx, failures)
expectNotIncludes(webNginx, '/tmp/nginx/', files.webNginx, failures)

if (failures.length > 0) {
  fail('Production deployment baseline is inconsistent.', `- ${failures.join('\n- ')}`)
}

console.log(
  '[SERVER_DEPLOY_CHECK] OK: image-based ERP stack and shared edge gateway are aligned.'
)
