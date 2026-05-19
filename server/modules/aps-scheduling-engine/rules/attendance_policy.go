package rules

import (
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
)

type AttendanceRuleConfig struct {
	EnableAttendanceLock  bool
	MinCrewAttendanceRate float64
	AbsenceCapacityDerate float64
}

func DefaultAttendanceRuleConfig() AttendanceRuleConfig {
	return AttendanceRuleConfig{
		EnableAttendanceLock:  true,
		MinCrewAttendanceRate: 0.5,
		AbsenceCapacityDerate: 0.8,
	}
}

// Evaluate 计算人员考勤打卡约束对打分的影响
func (c *AttendanceRuleConfig) Evaluate(
	task apsorder.Order,
	resource apsresource.Resource,
	window apsschedule.TimeWindowCandidate,
) (float64, []string) {
	if !c.EnableAttendanceLock {
		return 0.0, nil
	}

	// 示例逻辑：如果未来此处集成实时考勤数据进行匹配，
	// 若出勤率不足，则可以实现硬拦截评分 (-1000) 或软折降
	return 0.0, nil
}
