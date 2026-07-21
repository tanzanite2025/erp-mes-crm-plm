package services

import (
	"fmt"
	"testing"
	"time"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type personnelAnalyticsTestTxManager struct {
	db *gorm.DB
}

func (m personnelAnalyticsTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m personnelAnalyticsTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func openPersonnelAnalyticsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:personnel_analytics_%d?mode=memory&cache=shared", time.Now().UnixNano())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("open sqlite connection: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	if err := testDB.Exec(`
		CREATE TABLE organizations (
			id text PRIMARY KEY,
			name text NOT NULL,
			deleted_at datetime
		);
	`).Error; err != nil {
		t.Fatalf("create organizations schema: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE employees (
			id text PRIMARY KEY,
			name text NOT NULL,
			joined_date datetime,
			dept_id text,
			deleted_at datetime
		);
	`).Error; err != nil {
		t.Fatalf("create employees schema: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE leave_requests (
			id text PRIMARY KEY,
			employee_id text NOT NULL,
			duration_days real NOT NULL,
			status text NOT NULL,
			deleted_at datetime
		);
	`).Error; err != nil {
		t.Fatalf("create leave_requests schema: %v", err)
	}
	return testDB
}

func insertPersonnelAnalyticsEmployee(t *testing.T, db *gorm.DB, id string, name string, deptID string, joinedDate time.Time) {
	t.Helper()
	if err := db.Exec(
		"INSERT INTO employees (id, name, dept_id, joined_date) VALUES (?, ?, ?, ?)",
		id,
		name,
		deptID,
		joinedDate,
	).Error; err != nil {
		t.Fatalf("insert employee %s: %v", id, err)
	}
}

func insertPersonnelAnalyticsLeave(t *testing.T, db *gorm.DB, id string, employeeID string, durationDays float64, status string) {
	t.Helper()
	if err := db.Exec(
		"INSERT INTO leave_requests (id, employee_id, duration_days, status) VALUES (?, ?, ?, ?)",
		id,
		employeeID,
		durationDays,
		status,
	).Error; err != nil {
		t.Fatalf("insert leave %s: %v", id, err)
	}
}

func findEmployeeRankingRow(t *testing.T, rankings []employeeRankingProjection, employeeID string) employeeRankingProjection {
	t.Helper()
	for _, row := range rankings {
		if row.EmployeeID == employeeID {
			return row
		}
	}
	t.Fatalf("employee %s missing from rankings: %+v", employeeID, rankings)
	return employeeRankingProjection{}
}

type employeeRankingProjection struct {
	EmployeeID     string
	Name           string
	DeptName       string
	AttendanceRate float64
	LeaveDays      float64
	TenureYears    int
	Score          float64
}

func TestExcellentRankingUsesApprovedLeaveAggregationAndDeterministicSorting(t *testing.T) {
	testDB := openPersonnelAnalyticsTestDB(t)
	if err := testDB.Exec("INSERT INTO organizations (id, name) VALUES (?, ?), (?, ?)", "dept-production", "生产部", "dept-quality", "质检部").Error; err != nil {
		t.Fatalf("insert organizations: %v", err)
	}

	tenYearsAgo := time.Now().AddDate(-12, 0, 0)
	recentJoin := time.Now().AddDate(-1, 0, 0)
	insertPersonnelAnalyticsEmployee(t, testDB, "emp-carol", "Carol", "dept-production", tenYearsAgo)
	insertPersonnelAnalyticsEmployee(t, testDB, "emp-aaron", "Aaron", "dept-quality", tenYearsAgo)
	insertPersonnelAnalyticsEmployee(t, testDB, "emp-alice", "Alice", "dept-production", tenYearsAgo)
	insertPersonnelAnalyticsEmployee(t, testDB, "emp-bob", "Bob", "dept-quality", recentJoin)

	insertPersonnelAnalyticsLeave(t, testDB, "leave-approved", "emp-alice", 2, "APPROVED")
	insertPersonnelAnalyticsLeave(t, testDB, "leave-pending", "emp-alice", 9, "PENDING")
	insertPersonnelAnalyticsLeave(t, testDB, "leave-rejected", "emp-bob", 10, "REJECTED")

	service := NewPersonnelAnalyticsService(
		personnelAnalyticsTestTxManager{db: testDB},
		repositories.NewOrganizationRepository(),
		repositories.NewLeaveRepository(),
	)

	rankings, err := service.GetExcellentRanking()
	if err != nil {
		t.Fatalf("get excellent ranking: %v", err)
	}
	if len(rankings) != 4 {
		t.Fatalf("expected 4 rankings, got %d: %+v", len(rankings), rankings)
	}

	projections := make([]employeeRankingProjection, 0, len(rankings))
	for _, row := range rankings {
		projections = append(projections, employeeRankingProjection{
			EmployeeID:     row.EmployeeID,
			Name:           row.Name,
			DeptName:       row.DeptName,
			AttendanceRate: row.AttendanceRate,
			LeaveDays:      row.LeaveDays,
			TenureYears:    row.TenureYears,
			Score:          row.Score,
		})
	}

	if got := []string{projections[0].EmployeeID, projections[1].EmployeeID, projections[2].EmployeeID, projections[3].EmployeeID}; fmt.Sprint(got) != "[emp-aaron emp-carol emp-alice emp-bob]" {
		t.Fatalf("rankings should be sorted by score desc then name asc, got %v", got)
	}

	alice := findEmployeeRankingRow(t, projections, "emp-alice")
	if alice.DeptName != "生产部" {
		t.Fatalf("expected Alice department from lightweight employee query, got %q", alice.DeptName)
	}
	if alice.LeaveDays != 2 {
		t.Fatalf("expected only approved leave days for Alice, got %.1f", alice.LeaveDays)
	}
	if alice.AttendanceRate != 0.91 || alice.Score != 95.5 {
		t.Fatalf("unexpected Alice attendance/score: attendance=%.2f score=%.1f", alice.AttendanceRate, alice.Score)
	}

	bob := findEmployeeRankingRow(t, projections, "emp-bob")
	if bob.LeaveDays != 0 || bob.AttendanceRate != 1 {
		t.Fatalf("rejected leave must not affect Bob attendance, got leave=%.1f attendance=%.2f", bob.LeaveDays, bob.AttendanceRate)
	}
}
