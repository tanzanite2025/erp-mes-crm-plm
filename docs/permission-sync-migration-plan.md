# Permission Sync Migration Plan

This project is migrating from manual `users.role` authorization to employee-bound effective permissions.

## Phase 1: Compatibility

- Keep `users.role` as a legacy snapshot for existing flows.
- Treat `employees.dept_id` as the source for ordinary employee authorization.
- Resolve effective permissions on the backend from:
  - `superadmin` / `admin` privileged roles
  - employee department role: `org_<deptId>` or legacy `org_<deptId>|...`
  - legacy `users.role` as the final fallback
- Return `effectiveRoles` and `permissions` from login and `/profile`.
- Persist the derived department role snapshot back into `users.role` on:
  - user create
  - user update
  - bulk user sync
  - employee save
  - bulk employee sync
- Frontend login state should prefer `effectiveRoles` over legacy `role`.
- User creation/editing should lock employee-bound accounts to their department role snapshot.

Implemented in this phase:

- Backend effective access resolver in `server/middleware/effective_access.go`
- Backend auth/profile wiring in `server/middleware/auth.go` and `server/handlers/auth.go`
- User snapshot alignment in `server/handlers/users.go`
- Employee-driven snapshot sync in `server/handlers/org_personnel.go`
- Frontend login role normalization in `src/features/auth/sign-in/components/user-auth-form.tsx`
- Employee-bound role selection in `src/features/users/components/users-action-dialog.tsx`

## Phase 2: Cutover

- Stop using `users.role` as the primary permission source for ordinary employee accounts.
- Resolve permissions from:
  - privileged account override
  - `employee_id -> dept_id -> org role`
  - later: `position_id -> pos role`
- Update frontend permission checks to consume only backend `effectivePermissions`.
- Limit manual role editing to:
  - `superadmin`
  - service accounts
  - explicitly unbound accounts
- Add admin diagnostics for:
  - user bound to missing employee
  - employee with empty department
  - department without matching org role
  - employee-bound user with empty effective permissions

## Phase 3: Cleanup

- Remove ordinary use of `users.role` from frontend authorization logic.
- Remove station-based role recommendation from user management.
- Replace string-parsed role IDs with structured role metadata:
  - `role_type`
  - `binding_id`
- Make `users.role` optional or reserved for privileged/service accounts only.
- Add a one-time data repair job to:
  - backfill employee-bound role snapshots
  - report unmapped departments
  - report orphaned users
