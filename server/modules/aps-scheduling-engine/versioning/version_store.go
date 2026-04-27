package versioning

import apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"

type VersionStore struct{}

func NewVersionStore() *VersionStore {
	return &VersionStore{}
}

func (s *VersionStore) Save(version apsschedule.ScheduleVersion) error {
	return nil
}
