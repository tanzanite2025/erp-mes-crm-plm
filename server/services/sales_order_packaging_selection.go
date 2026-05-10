package services

import (
	"encoding/json"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type salesOrderPackagingProfileCandidate struct {
	Profile   models.PackagingProfile
	IsDefault bool
}

func normalizeSalesOrderLinePackagingSelectionSource(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "auto":
		return "auto"
	default:
		return "manual"
	}
}

func encodeSalesOrderLinePackagingSelection(selection *SalesOrderLinePackagingSelectionPayload) json.RawMessage {
	if selection == nil || strings.TrimSpace(selection.ProfileID) == "" {
		return nil
	}

	normalized := *selection
	normalized.Source = normalizeSalesOrderLinePackagingSelectionSource(normalized.Source)
	payload, err := json.Marshal(normalized)
	if err != nil {
		return nil
	}
	return payload
}

func decodeSalesOrderLinePackagingSelection(raw json.RawMessage) *SalesOrderLinePackagingSelectionPayload {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}

	var selection SalesOrderLinePackagingSelectionPayload
	if err := json.Unmarshal(raw, &selection); err != nil {
		return nil
	}
	if strings.TrimSpace(selection.ProfileID) == "" {
		return nil
	}
	selection.Source = normalizeSalesOrderLinePackagingSelectionSource(selection.Source)
	return &selection
}

func buildSalesOrderLinePackagingSelectionFromProfile(
	profile models.PackagingProfile,
	source string,
) *SalesOrderLinePackagingSelectionPayload {
	return &SalesOrderLinePackagingSelectionPayload{
		ProfileID:         profile.ID,
		ProfileCode:       profile.Code,
		ProfileName:       profile.Name,
		PackagingType:     profile.PackagingType,
		Length:            profile.Length,
		Width:             profile.Width,
		Height:            profile.Height,
		DimensionUnitCode: profile.DimensionUnitCode,
		NetWeight:         profile.NetWeight,
		GrossWeight:       profile.GrossWeight,
		WeightUnitCode:    profile.WeightUnitCode,
		Capacity:          profile.Capacity,
		CapacityUnitCode:  profile.CapacityUnitCode,
		Source:            normalizeSalesOrderLinePackagingSelectionSource(source),
	}
}

func collapseSalesOrderPackagingCandidates(
	candidates []salesOrderPackagingProfileCandidate,
) []salesOrderPackagingProfileCandidate {
	if len(candidates) == 0 {
		return nil
	}

	byProfileID := make(map[string]salesOrderPackagingProfileCandidate, len(candidates))
	orderedProfileIDs := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		profileID := strings.TrimSpace(candidate.Profile.ID)
		if profileID == "" {
			continue
		}

		existing, ok := byProfileID[profileID]
		if !ok {
			byProfileID[profileID] = candidate
			orderedProfileIDs = append(orderedProfileIDs, profileID)
			continue
		}

		if candidate.IsDefault {
			existing.IsDefault = true
			byProfileID[profileID] = existing
		}
	}

	result := make([]salesOrderPackagingProfileCandidate, 0, len(orderedProfileIDs))
	for _, profileID := range orderedProfileIDs {
		result = append(result, byProfileID[profileID])
	}
	return result
}

func findSalesOrderPackagingCandidateByProfileID(
	candidates []salesOrderPackagingProfileCandidate,
	profileID string,
) *salesOrderPackagingProfileCandidate {
	trimmedProfileID := strings.TrimSpace(profileID)
	if trimmedProfileID == "" {
		return nil
	}

	for _, candidate := range collapseSalesOrderPackagingCandidates(candidates) {
		if candidate.Profile.ID == trimmedProfileID {
			candidateCopy := candidate
			return &candidateCopy
		}
	}
	return nil
}

func resolveAutoSalesOrderLinePackagingSelection(
	candidates []salesOrderPackagingProfileCandidate,
) *SalesOrderLinePackagingSelectionPayload {
	collapsedCandidates := collapseSalesOrderPackagingCandidates(candidates)
	if len(collapsedCandidates) == 0 {
		return nil
	}

	defaultCandidates := make([]salesOrderPackagingProfileCandidate, 0, len(collapsedCandidates))
	for _, candidate := range collapsedCandidates {
		if candidate.IsDefault {
			defaultCandidates = append(defaultCandidates, candidate)
		}
	}

	if len(defaultCandidates) == 1 {
		return buildSalesOrderLinePackagingSelectionFromProfile(defaultCandidates[0].Profile, "auto")
	}
	if len(collapsedCandidates) == 1 {
		return buildSalesOrderLinePackagingSelectionFromProfile(collapsedCandidates[0].Profile, "auto")
	}
	return nil
}

func loadSalesOrderPackagingCandidatesByProductID(
	tx *gorm.DB,
	lines []models.SalesOrderLine,
) (map[string][]salesOrderPackagingProfileCandidate, error) {
	productIDs := make([]string, 0, len(lines))
	seenProductIDs := make(map[string]struct{}, len(lines))
	for _, line := range lines {
		productID := strings.TrimSpace(line.ProductID)
		if productID == "" {
			continue
		}
		if _, exists := seenProductIDs[productID]; exists {
			continue
		}
		seenProductIDs[productID] = struct{}{}
		productIDs = append(productIDs, productID)
	}

	if len(productIDs) == 0 {
		return map[string][]salesOrderPackagingProfileCandidate{}, nil
	}

	var targets []models.PackagingProfileTarget
	if err := tx.
		Where("LOWER(entity_type) = ?", "product").
		Where("entity_id IN ?", productIDs).
		Find(&targets).Error; err != nil {
		return nil, err
	}
	if len(targets) == 0 {
		return map[string][]salesOrderPackagingProfileCandidate{}, nil
	}

	profileIDs := make([]string, 0, len(targets))
	seenProfileIDs := make(map[string]struct{}, len(targets))
	for _, target := range targets {
		profileID := strings.TrimSpace(target.PackagingProfileID)
		if profileID == "" {
			continue
		}
		if _, exists := seenProfileIDs[profileID]; exists {
			continue
		}
		seenProfileIDs[profileID] = struct{}{}
		profileIDs = append(profileIDs, profileID)
	}

	var profiles []models.PackagingProfile
	if err := tx.
		Where("id IN ?", profileIDs).
		Where("is_active = ?", true).
		Find(&profiles).Error; err != nil {
		return nil, err
	}

	profileByID := make(map[string]models.PackagingProfile, len(profiles))
	for _, profile := range profiles {
		profileByID[strings.TrimSpace(profile.ID)] = profile
	}

	result := make(map[string][]salesOrderPackagingProfileCandidate, len(productIDs))
	for _, target := range targets {
		profile, ok := profileByID[strings.TrimSpace(target.PackagingProfileID)]
		if !ok {
			continue
		}
		productID := strings.TrimSpace(target.EntityID)
		result[productID] = append(result[productID], salesOrderPackagingProfileCandidate{
			Profile:   profile,
			IsDefault: target.IsDefault,
		})
	}

	return result, nil
}

func normalizeSalesOrderLinePackagingSelectionsTx(
	tx *gorm.DB,
	previousLines []models.SalesOrderLine,
	nextLines []models.SalesOrderLine,
) error {
	candidatesByProductID, err := loadSalesOrderPackagingCandidatesByProductID(tx, nextLines)
	if err != nil {
		return err
	}

	previousLineByNo := make(map[int]models.SalesOrderLine, len(previousLines))
	for _, line := range previousLines {
		previousLineByNo[line.LineNo] = line
	}

	for index := range nextLines {
		currentLine := &nextLines[index]
		productID := strings.TrimSpace(currentLine.ProductID)
		if productID == "" {
			currentLine.SelectedPackaging = nil
			continue
		}

		currentSelection := decodeSalesOrderLinePackagingSelection(currentLine.SelectedPackaging)
		previousLine, hasPrevious := previousLineByNo[currentLine.LineNo]
		previousSelection := decodeSalesOrderLinePackagingSelection(previousLine.SelectedPackaging)
		productChanged := !hasPrevious || strings.TrimSpace(previousLine.ProductID) != productID
		candidates := candidatesByProductID[productID]

		if hasPrevious && !productChanged {
			if currentSelection != nil {
				if previousSelection != nil && currentSelection.ProfileID == previousSelection.ProfileID {
					currentLine.SelectedPackaging = encodeSalesOrderLinePackagingSelection(currentSelection)
					continue
				}
				if candidate := findSalesOrderPackagingCandidateByProfileID(candidates, currentSelection.ProfileID); candidate != nil {
					currentLine.SelectedPackaging = encodeSalesOrderLinePackagingSelection(
						buildSalesOrderLinePackagingSelectionFromProfile(candidate.Profile, currentSelection.Source),
					)
					continue
				}
			}
			if previousSelection != nil {
				currentLine.SelectedPackaging = encodeSalesOrderLinePackagingSelection(previousSelection)
				continue
			}
		}

		if currentSelection != nil {
			if candidate := findSalesOrderPackagingCandidateByProfileID(candidates, currentSelection.ProfileID); candidate != nil {
				currentLine.SelectedPackaging = encodeSalesOrderLinePackagingSelection(
					buildSalesOrderLinePackagingSelectionFromProfile(candidate.Profile, currentSelection.Source),
				)
				continue
			}
		}

		currentLine.SelectedPackaging = encodeSalesOrderLinePackagingSelection(
			resolveAutoSalesOrderLinePackagingSelection(candidates),
		)
	}

	return nil
}
