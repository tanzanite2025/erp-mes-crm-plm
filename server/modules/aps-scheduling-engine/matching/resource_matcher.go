package apsschedulingengine

type ResourceMatcher struct{}

func NewResourceMatcher() *ResourceMatcher {
	return &ResourceMatcher{}
}

func (m *ResourceMatcher) Match(task Order, resources []Resource, calendar []CalendarDay, rules *RuleSet) []Resource {
	result := make([]Resource, 0, len(resources))
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
