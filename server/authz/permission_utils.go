package authz

import (
	"encoding/json"
	"strings"
)

// NormalizePermissionID standardizes a permission ID string.
func NormalizePermissionID(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// ParsePermissionIDs parses a raw permission string (JSON array or comma-separated)
// and returns a deduplicated list of normalized IDs.
func ParsePermissionIDs(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	var parsed []string
	// Attempt JSON unmarshal first (standard format)
	if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
		return DeduplicatePermissionIDs(parsed)
	}

	// [PRODUCTION_RESILIENCE] Fallback to comma-separated values if JSON fails
	parts := strings.Split(raw, ",")
	parsed = make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			parsed = append(parsed, trimmed)
		}
	}

	return DeduplicatePermissionIDs(parsed)
}

// DeduplicatePermissionIDs normalizes and removes duplicates from a list of permission IDs.
// NO inference or expansion logic is performed here.
func DeduplicatePermissionIDs(permissionIDs []string) []string {
	ids := make([]string, 0, len(permissionIDs))
	seen := make(map[string]struct{}, len(permissionIDs))

	for _, permissionID := range permissionIDs {
		normalized := NormalizePermissionID(permissionID)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}

		seen[normalized] = struct{}{}
		ids = append(ids, normalized)
	}

	return ids
}

func IsSupportedPermissionID(value string) bool {
	normalized := NormalizePermissionID(value)
	if normalized == "" {
		return false
	}

	if strings.HasPrefix(normalized, "page_") || strings.HasPrefix(normalized, "tab_") {
		_, exists := KnownRoutePermissionIDs[normalized]
		return exists
	}

	for _, permissionID := range ManagedPermissionIDs {
		if permissionID == normalized {
			return true
		}
	}

	return false
}
