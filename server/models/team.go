package models

// Team stores piecework team definitions.
type Team struct {
	BaseModel
	Code           string `gorm:"size:50;not null;unique" json:"code"`
	Name           string `gorm:"size:100;not null" json:"name"`
	ShortName      string `gorm:"size:50" json:"shortName"`
	Step           int    `gorm:"default:0" json:"step"`
	Section        string `gorm:"size:100" json:"section"`
	Process        string `gorm:"size:100" json:"process"`
	ProcessCommand string `gorm:"size:100" json:"processCommand"`
	Type           string `gorm:"size:50" json:"type"`
	IsMaintenance  bool   `gorm:"default:false" json:"isMaintenance"`
	Status         string `gorm:"size:20;default:'active'" json:"status"`
	Remarks        string `gorm:"type:text" json:"remarks"`
	Operator       string `gorm:"size:100" json:"operator"`
	OperateTime    string `gorm:"size:50" json:"operateTime"`
}
