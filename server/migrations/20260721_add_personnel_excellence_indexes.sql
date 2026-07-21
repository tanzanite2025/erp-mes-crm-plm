CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_employee
ON leave_requests (employee_id)
WHERE status = 'APPROVED' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_active_dept_id
ON employees (dept_id)
WHERE deleted_at IS NULL;
