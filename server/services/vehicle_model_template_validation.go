package services

import (
	"net/url"
	"path"
	"strings"
)

func isSupportedVehicleModelTemplateSourceFormat(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), "glb")
}

func isSupportedVehicleModelTemplateStatus(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "uploaded", "normalized":
		return true
	default:
		return false
	}
}

func validateVehicleModelTemplateSourceURL(value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ErrVehicleModelTemplateSourceURLRequired
	}

	parsed, err := url.Parse(trimmed)
	if err != nil ||
		parsed.IsAbs() ||
		parsed.Host != "" ||
		parsed.RawQuery != "" ||
		parsed.Fragment != "" {
		return ErrVehicleModelTemplateSourceURLInvalid
	}
	if strings.Contains(parsed.Path, "\\") || strings.Contains(parsed.Path, "..") {
		return ErrVehicleModelTemplateSourceURLInvalid
	}

	cleanedPath := path.Clean(parsed.Path)
	if !strings.HasPrefix(cleanedPath, "/uploads/") ||
		cleanedPath == "/uploads/" ||
		cleanedPath != "/uploads/"+path.Base(cleanedPath) ||
		path.Base(cleanedPath) == "." ||
		path.Base(cleanedPath) == ".." {
		return ErrVehicleModelTemplateSourceURLInvalid
	}
	if !IsVehicleModelTemplateSourceAssetFileName(path.Base(cleanedPath)) {
		return ErrVehicleModelTemplateSourceURLInvalid
	}
	return nil
}

func validateVehicleModelTemplateSourceFormatMatchesURL(
	sourceURL string,
	sourceFormat string,
) error {
	extension := strings.TrimPrefix(
		strings.ToLower(path.Ext(strings.TrimSpace(sourceURL))),
		".",
	)
	normalizedFormat := strings.ToLower(strings.TrimSpace(sourceFormat))
	if extension != normalizedFormat {
		return ErrVehicleModelTemplateSourceFormatInvalid
	}
	return nil
}

func validateVehicleModelTemplateRequest(request SaveVehicleModelTemplateRequest) error {
	if strings.TrimSpace(request.Name) == "" {
		return ErrVehicleModelTemplateNameRequired
	}
	if strings.TrimSpace(request.SourceAssetName) == "" {
		return ErrVehicleModelTemplateSourceNameRequired
	}
	if err := validateVehicleModelTemplateSourceURL(request.SourceAssetURL); err != nil {
		return err
	}
	if !isSupportedVehicleModelTemplateSourceFormat(request.SourceFormat) {
		return ErrVehicleModelTemplateSourceFormatInvalid
	}
	if err := validateVehicleModelTemplateSourceFormatMatchesURL(
		request.SourceAssetURL,
		request.SourceFormat,
	); err != nil {
		return err
	}
	if !isSupportedVehicleModelTemplateStatus(request.Status) {
		return ErrVehicleModelTemplateStatusInvalid
	}
	if strings.EqualFold(strings.TrimSpace(request.Status), "normalized") {
		return ErrVehicleModelTemplateStatusParserOnly
	}
	if request.NormalizedFootprint.LengthMm <= 0 ||
		request.NormalizedFootprint.WidthMm <= 0 ||
		request.NormalizedFootprint.HeightMm <= 0 {
		return ErrVehicleModelTemplateFootprintInvalid
	}
	return nil
}

func normalizeVehicleModelTemplateNotes(notes []string) []string {
	if notes == nil {
		return []string{}
	}

	result := make([]string, 0, len(notes))
	for _, note := range notes {
		trimmed := strings.TrimSpace(note)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
