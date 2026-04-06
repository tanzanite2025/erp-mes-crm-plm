# Scan Platform

This directory isolates the next-generation mobile scanning workspace from the
existing terminal and PDA pages.

Current scope:
- shared plugin contract
- permission contract
- plugin registry
- first-wave plugin placeholders:
  - logistics inbound scan
  - wheel trace lookup
- domain models for logistics inbound and wheel trace

Design goals:
- keep scanner shell generic
- keep business logic pluggable
- keep permission checks declarative
- avoid coupling future scan flows to `terminal-config`
- support both standalone scan pages and embedded dialog scanners

Planned layering:
1. `core/`
   Shared types and plugin contracts.
2. `models/`
   Stable business payloads shared by pages, dialogs, and plugins.
3. `adapters/`
   Host-specific bridges for existing dialogs or embedded forms.
4. `services/`
   Resolution, parsing, and future backend query adapters.
5. `use-cases/`
   High-level orchestration for host pages and plugin flows.
6. `plugins/`
   Business-specific scan modules.
7. `registry/`
   Central registration for enabled scan plugins.
8. `examples/`
   Minimal integration drafts for future host pages.
9. `components/`
   Reusable UI panels for exposing scan-platform status inside existing admin pages.
10. `pages/`
   Standalone scan-platform pages such as wheel trace.
11. `hooks/`
   Page-level install and standalone entry helpers.

Architecture note:
- existing logistics scan flows live inside dialogs and treat scanning as one
  field within a larger business form
- to avoid refactoring later, scan-platform plugins must accept optional host
  context and return a draft patch that a dialog or standalone page can apply
- the scanner shell should own capture only; the host page should keep business
  form state unless a plugin is intentionally designed as a full-screen workflow
- host pages should prefer a `use-case` entry point instead of manually composing
  adapter + resolution + parser + query steps

Example drafts:
- purchase logistics dialog host integration:
  `examples/logistics-inbound/purchase-logistics-dialog-example.tsx`
- purchase logistics real-page helper:
  `helpers/logistics-inbound/purchase-logistics-dialog-scan-helper.ts`
- wheel trace lookup with mock backend gateway:
  `examples/wheel-trace/mock-wheel-trace-gateway.ts`
  `examples/wheel-trace/wheel-trace-lookup-example.ts`
- wheel trace real API gateway skeleton:
  `adapters/wheel-trace/api-wheel-trace-gateway.ts`
  `examples/wheel-trace/api-wheel-trace-gateway-example.ts`
- purchase logistics real-page integration checklist:
  `docs/purchase-logistics-dialog-integration-checklist.md`
- wheel trace backend DTO draft:
  `contracts/wheel-trace-api-dto.ts`

This folder is intentionally not wired into routes yet. Development can proceed
here in isolation before integration.
