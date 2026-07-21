package models

/**
 * EnterpriseConfig 企业配置模型
 * 独立于系统配置表，由业务侧直接管理
 */
type EnterpriseConfig struct {
	BaseModel
	Name     string `json:"name" gorm:"type:string"`
	Plan     string `json:"plan" gorm:"type:string"`
	LogoURL  string `json:"logoUrl" gorm:"size:512"`
	Operator string `json:"operator" gorm:"type:string"`
	Version  int    `json:"version" gorm:"type:int;default:1"`
}

func (EnterpriseConfig) TableName() string {
	return "enterprise_configs"
}
