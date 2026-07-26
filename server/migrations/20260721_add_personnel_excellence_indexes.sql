CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_employee
ON leave_requests (employee_id)
WHERE status = 'APPROVED' AND deleted_at IS NULL;

DROP INDEX IF EXISTS idx_employees_active_dept_id;

CREATE INDEX IF NOT EXISTS idx_employee_assignments_primary_org_unit
ON employee_assignments (org_unit_id, employee_id)
WHERE deleted_at IS NULL AND is_primary = TRUE;
