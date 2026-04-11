package services

import "encoding/json"

type OrderEvidencePayload struct {
	ID         string `json:"id"`
	URL        string `json:"url"`
	Name       string `json:"name"`
	UploadedAt string `json:"uploadedAt"`
	Note       string `json:"note,omitempty"`
	Location   string `json:"location,omitempty"`
	DefectPart string `json:"defectPart,omitempty"`
}

func decodeOrderEvidences(raw json.RawMessage) []OrderEvidencePayload {
	if len(raw) == 0 || string(raw) == "null" {
		return []OrderEvidencePayload{}
	}

	var evidences []OrderEvidencePayload
	if err := json.Unmarshal(raw, &evidences); err != nil {
		return []OrderEvidencePayload{}
	}
	if evidences == nil {
		return []OrderEvidencePayload{}
	}
	return evidences
}

func encodeOrderEvidences(evidences []OrderEvidencePayload) json.RawMessage {
	if len(evidences) == 0 {
		return json.RawMessage("[]")
	}

	encoded, err := json.Marshal(evidences)
	if err != nil {
		return json.RawMessage("[]")
	}
	return json.RawMessage(encoded)
}
