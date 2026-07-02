# Contributing to Digital Management ERP

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/tanzanite2025/erp-mes-crm-plm.git
   ```

2. Install dependencies with the pinned package manager:

   ```bash
   corepack enable
   corepack prepare pnpm@10.33.0 --activate
   pnpm install
   ```

3. Run the app locally:

   ```bash
   pnpm dev
   ```

4. Create a focused branch:

   ```bash
   git checkout -b feature/your-change
   ```

## Code Standards

- Follow the existing ESLint and Prettier configuration.
- Keep TypeScript type-safe and avoid bypassing domain types.
- Maintain consistency with the existing code structure.
- Keep route files thin; place business logic in `src/features/**`.
- Keep frontend API calls in feature `services` and backend transactions in `server/services` or `server/modules`.

Before submitting frontend changes, run:

```bash
pnpm lint
pnpm format:check
pnpm build
```

Before submitting backend changes, run:

```bash
cd server
go test ./...
```

## Pull Request Guidelines

- Follow the PR template.
- Keep PRs focused and describe why the change is needed.
- Include local checks and any relevant deployment or migration notes.
- Do not commit local repair scripts, temporary notes, generated reports, `.env` files, or secrets.

## Documentation Guidelines

- Use `README.md` for setup and the high-level repository map.
- Use `docs/architecture/**` for durable architecture decisions and topology maps.
- Use `docs/ops/**` for deployment, monitoring, and recovery procedures.
