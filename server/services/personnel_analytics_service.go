package services

import (
	"math"
	"time"
	"xdfc-server/models"
	"xdfc-server/repositories"
)

/**
 * PersonnelAnalyticsService - 后端权威计算引擎。
 * 负责全员绩效评分、出勤率统计等重计算逻辑，确保“后端权威”。
 */
type PersonnelAnalyticsService struct {
	txManager   transactionManager
	orgRepo     repositories.OrganizationRepository
	leaveRepo   repositories.LeaveRepository
}

func NewPersonnelAnalyticsService(
	txManager transactionManager,
	orgRepo repositories.OrganizationRepository,
	leaveRepo repositories.LeaveRepository,
) *PersonnelAnalyticsService {
	return &PersonnelAnalyticsService{
		txManager: txManager,
		orgRepo:   orgRepo,
		leaveRepo: leaveRepo,
	}
}

var defaultAnalyticsRuntime = defaultServiceRuntime()
var DefaultPersonnelAnalyticsService = NewPersonnelAnalyticsService(
	defaultAnalyticsRuntime.txManager,
	repositories.NewOrganizationRepository(),
	repositories.NewLeaveRepository(),
)

// GetExcellentRanking 获取优秀员工排名 (核心业务计算)
func (s *PersonnelAnalyticsService) GetExcellentRanking() ([]models.EmployeeStats, error) {
	db := s.txManager.DB()

	// 1. 获取全量员工与请假数据
	employees, err := s.orgRepo.ListEmployees(db)
	if err != nil {
		return nil, err
	}

	leaves, err := s.leaveRepo.ListLeaves(db)
	if err != nil {
		return nil, err
	}

	// 按员工 ID 对请假数据进行分组归并 (后端聚合)
	leaveMap := make(map[string]float64)
	for _, l := range leaves {
		if l.Status == "APPROVED" {
			leaveMap[l.EmployeeID] += l.DurationDays
		}
	}

	now := time.Now()
	var rankings []models.EmployeeStats

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
			DeptName:       emp.DeptName,
			AttendanceRate: math.Round(attendanceRate*100) / 100,
			LeaveDays:      leaveDays,
			TenureYears:    tenureYears,
			Score:          math.Round(score*10) / 10,
		})
	}

	return rankings, nil
}
