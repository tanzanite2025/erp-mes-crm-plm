package apsschedulingengine

type HookTarget struct {
	Type string
	ID   string
}

type ScheduleHook interface {
	Supports(targetType string) bool
	BuildEvent(target HookTarget, payload map[string]any) ScheduleEvent
}

type DynamicHookManager struct {
	Hooks []ScheduleHook
}

func NewDynamicHookManager(hooks ...ScheduleHook) *DynamicHookManager {
	return &DynamicHookManager{Hooks: hooks}
}

func (m *DynamicHookManager) Register(hook ScheduleHook) {
	m.Hooks = append(m.Hooks, hook)
}

func (m *DynamicHookManager) Emit(target HookTarget, payload map[string]any) (ScheduleEvent, bool) {
	for _, hook := range m.Hooks {
		if hook.Supports(target.Type) {
			return hook.BuildEvent(target, payload), true
		}
	}
	return ScheduleEvent{}, false
}
