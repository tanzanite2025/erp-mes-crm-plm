package services

import (
	"math"
	"sort"
	"time"
	"xdfc-server/models"
	"xdfc-server/repositories"
)

/**
 * PersonnelAnalyticsService - 后端权威计算引擎。
 * 负责全员绩效评分、出勤率统计等重计算逻辑，确保“后端权威”。
 */
type PersonnelAnalyticsService struct {
	txManager transactionManager
	empRepo   repositories.EmployeeRepository
	leaveRepo repositories.LeaveRepository
}

func NewPersonnelAnalyticsService(
	txManager transactionManager,
	empRepo repositories.EmployeeRepository,
	leaveRepo repositories.LeaveRepository,
) *PersonnelAnalyticsService {
	return &PersonnelAnalyticsService{
		txManager: txManager,
		empRepo:   empRepo,
		leaveRepo: leaveRepo,
	}
}

var defaultAnalyticsRuntime = defaultServiceRuntime()
var DefaultPersonnelAnalyticsService = NewPersonnelAnalyticsService(
	defaultAnalyticsRuntime.txManager,
	repositories.NewEmployeeRepository(),
	repositories.NewLeaveRepository(),
)

// GetExcellentRanking 获取优秀员工排名 (核心业务计算)
func (s *PersonnelAnalyticsService) GetExcellentRanking() ([]models.EmployeeStats, error) {
	db := s.txManager.DB()

	// 1. 获取荣誉榜所需的轻量员工资料，并在数据库侧聚合已批准请假天数。
	employees, err := s.empRepo.ListExcellentEmployeeInputs(db)
	if err != nil {
		return nil, err
	}

	leaveMap, err := s.leaveRepo.SumApprovedLeaveDaysByEmployeeID(db)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	rankings := make([]models.EmployeeStats, 0, len(employees))

	// 2. 权威计算逻辑收拢
	for _, emp := range employees {
		// 计算工龄 (后端标准时间)
		tenureYears := 0
		if emp.JoinedDate != nil {
			tenureYears = int(now.Sub(*emp.JoinedDate).Hours() / 24 / 365)
		}

		// 计算出勤率 (假设标准周期 22 天)
		leaveDays := leaveMap[emp.ID]
		attendanceRate := math.Max(0, (22.0-leaveDays)/22.0)

		// 优秀员工评分逻辑公式 (后端统一定义，严禁前端修改)
		// Score = (出勤率 * 50) + (工龄 * 2, 最高 20) + 基础分 30
		score := (attendanceRate * 50.0) + (math.Min(float64(tenureYears), 10.0) * 2.0) + 30.0

		rankings = append(rankings, models.EmployeeStats{
			EmployeeID:     emp.ID,
			Name:           emp.Name,
			OrgUnitName:    emp.DeptName,
			AttendanceRate: math.Round(attendanceRate*100) / 100,
			LeaveDays:      leaveDays,
			TenureYears:    tenureYears,
			Score:          math.Round(score*10) / 10,
		})
	}

	sort.SliceStable(rankings, func(i, j int) bool {
		if rankings[i].Score != rankings[j].Score {
			return rankings[i].Score > rankings[j].Score
		}
		if rankings[i].AttendanceRate != rankings[j].AttendanceRate {
			return rankings[i].AttendanceRate > rankings[j].AttendanceRate
		}
		return rankings[i].Name < rankings[j].Name
	})

	return rankings, nil
}
