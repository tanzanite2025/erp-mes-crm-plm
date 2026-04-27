package matching

import (
	apscalendar "xdfc-server/modules/aps-scheduling-engine/models/calendar"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type ResourceMatcher struct{}

func NewResourceMatcher() *ResourceMatcher {
	return &ResourceMatcher{}
}

func (m *ResourceMatcher) Match(task apsorder.Order, resources []apsresource.Resource, calendar []apscalendar.CalendarDay, rules *apsrules.RuleSet) []apsresource.Resource {
	result := make([]apsresource.Resource, 0, len(resources))
	for _, resource := range resources {
		if !resource.Available {
			continue
		}
		if task.RouteID != "" && resource.LineID == "" {
			continue
		}
		result = append(result, resource)
	}
	return result
}
