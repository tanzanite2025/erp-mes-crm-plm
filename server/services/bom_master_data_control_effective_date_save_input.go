package services

import (
	"encoding/json"
	"time"
)

// BOMMasterDataControlSaveInput preserves the difference between an omitted date
// (keep the saved value) and an explicit null (clear it), without changing time.Time's RFC3339 contract.
type BOMMasterDataControlSaveInput struct {
	RevisionNo            string     `json:"revisionNo"`
	EffectiveFrom         *time.Time `json:"effectiveFrom"`
	EffectiveTo           *time.Time `json:"effectiveTo"`
	ChangeType            string     `json:"changeType"`
	ChangeOrderNo         string     `json:"changeOrderNo"`
	SiteCode              string     `json:"siteCode"`
	IsDefaultSite         bool       `json:"isDefaultSite"`
	effectiveFromProvided bool
	effectiveToProvided   bool
}

func (input *BOMMasterDataControlSaveInput) UnmarshalJSON(data []byte) error {
	type decodedBOMMasterDataControlSaveInput BOMMasterDataControlSaveInput
	var decoded decodedBOMMasterDataControlSaveInput
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	var providedFields map[string]json.RawMessage
	if err := json.Unmarshal(data, &providedFields); err != nil {
		return err
	}
	*input = BOMMasterDataControlSaveInput(decoded)
	_, input.effectiveFromProvided = providedFields["effectiveFrom"]
	_, input.effectiveToProvided = providedFields["effectiveTo"]
	return nil
}
