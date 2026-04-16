package apsschedulingengine

type VersionStore struct{}

func NewVersionStore() *VersionStore {
	return &VersionStore{}
}

func (s *VersionStore) Save(version ScheduleVersion) error {
	return nil
}
