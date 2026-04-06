package models

import "time"

// =========================================================================
// 物流推送制模型 (Logistics Push - Hot-Pluggable)
// 该文件可安全删除，不影响系统其余任何功能
// =========================================================================

// DeliveryOrder 物流主表 (推送制)
type DeliveryOrder struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	BizOrderNo         string `gorm:"size:100;index" json:"bizOrderNo"`
	BizType            string `gorm:"size:20;default:'Sales'" json:"bizType"`
	CarrierCode        string `gorm:"size:50;not null;index" json:"carrierCode"`
	CarrierName        string `gorm:"size:100" json:"carrierName"`
	TrackingNo         string `gorm:"size:100;not null;uniqueIndex" json:"trackingNo"`
	Status             string `gorm:"size:30;default:'Pending';index" json:"status"`
	SubscribedAt       *time.Time `json:"subscribedAt,omitempty"`
	LastPushAt         *time.Time `json:"lastPushAt,omitempty"`
	LastLocation       string     `gorm:"size:255" json:"lastLocation"`
	LastEvent          string     `gorm:"size:500" json:"lastEvent"`
	SignedAt           *time.Time `json:"signedAt,omitempty"`
	Version            int        `gorm:"default:1" json:"version"`
}

// DeliveryTrackingDetail 轨迹明细表
type DeliveryTrackingDetail struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time `json:"createdAt"`
	DeliveryOrderID uint      `gorm:"not null;index" json:"deliveryOrderId"`
	Time            time.Time `gorm:"not null" json:"time"`
	Context         string    `gorm:"size:1000;not null" json:"context"`
	Location        string    `gorm:"size:255" json:"location"`
	HashKey         string    `gorm:"size:32;uniqueIndex:idx_tracking_hash" json:"hashKey"`
}

// LogisticsAPIProvider 物流服务商配置
type LogisticsAPIProvider struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	Name         string    `gorm:"size:100;not null" json:"name"`
	Code         string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	AppKey       string    `gorm:"size:255" json:"appKey"`
	AppSecret    string    `gorm:"size:255" json:"appSecret"`
	CustomerID   string    `gorm:"size:100" json:"customerId"`
	CheckWord    string    `gorm:"size:255" json:"checkWord"`
	Endpoint     string    `gorm:"size:255" json:"endpoint"`
	Status       string    `gorm:"size:20;default:'Enabled'" json:"status"`
	QuotaTotal   int       `gorm:"default:0" json:"quotaTotal"`
	QuotaUsed    int       `gorm:"default:0" json:"quotaUsed"`
	QuotaAlertAt int       `gorm:"default:100" json:"quotaAlertAt"`
}
