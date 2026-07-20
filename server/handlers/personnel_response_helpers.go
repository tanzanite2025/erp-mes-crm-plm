package handlers

import "time"

func optimisticVersionForResponse(updatedAt, createdAt time.Time) int {
	versionTime := updatedAt
	if versionTime.IsZero() {
		versionTime = createdAt
	}
	if versionTime.IsZero() {
		return 1
	}
	version := versionTime.UnixMilli()
	if version < 1 {
		return 1
	}
	return int(version)
}
