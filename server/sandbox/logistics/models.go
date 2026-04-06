package logistics

import (
	"crypto/md5"
	"fmt"
	"time"
)

// =========================================================================
// 物流 API 隔离砂箱 · 数据模型层
// 订阅推送制 (Push-Native) 架构
// =========================================================================

// DeliveryOrderStatus 物流订单状态机
type DeliveryOrderStatus string

const (
	StatusPending    DeliveryOrderStatus = "Pending"    // 待揽收
	StatusCollected  DeliveryOrderStatus = "Collected"  // 已揽收
	StatusInTransit  DeliveryOrderStatus = "InTransit"  // 运输中
	StatusDelivering DeliveryOrderStatus = "Delivering" // 派送中
	StatusSigned     DeliveryOrderStatus = "Signed"     // 已签收
	StatusException  DeliveryOrderStatus = "Exception"  // 异常件
	StatusReturned   DeliveryOrderStatus = "Returned"   // 退回件
)

// SubscriptionStatus 订阅状态
type SubscriptionStatus string

const (
	SubNone       SubscriptionStatus = "None"       // 未订阅
	SubSubscribed SubscriptionStatus = "Subscribed" // 已订阅
	SubExpired    SubscriptionStatus = "Expired"    // 订阅过期
	SubFailed     SubscriptionStatus = "Failed"     // 订阅失败
)

// -------------------------------------------------------------------------
// DeliveryOrder 物流主表
// 存储单号、承运商、当前最新状态、订阅状态位
// -------------------------------------------------------------------------
type DeliveryOrder struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 业务关联
	BizOrderNo string `gorm:"size:100;index" json:"bizOrderNo"`    // 关联的业务订单号 (采购单/销售单)
	BizType    string `gorm:"size:20;default:'Sales'" json:"bizType"` // Sales / Purchase

	// 物流核心
	CarrierCode string              `gorm:"size:50;not null;index" json:"carrierCode"`   // 承运商编码 (SF, JD, ZTO)
	CarrierName string              `gorm:"size:100" json:"carrierName"`                 // 承运商名称
	TrackingNo  string              `gorm:"size:100;not null;uniqueIndex" json:"trackingNo"` // 快递单号 (全局唯一)
	Status      DeliveryOrderStatus `gorm:"size:30;default:'Pending';index" json:"status"`   // 当前状态

	// 订阅管理
	SubscriptionStatus SubscriptionStatus `gorm:"size:30;default:'None'" json:"subscriptionStatus"`
	SubscribedAt       *time.Time         `json:"subscribedAt,omitempty"`
	LastPushAt         *time.Time         `json:"lastPushAt,omitempty"` // 最后一次收到推送的时间

	// 最新路由摘要 (冗余存储，加速列表查询)
	LastLocation string     `gorm:"size:255" json:"lastLocation"`
	LastEvent    string     `gorm:"size:500" json:"lastEvent"`
	SignedAt     *time.Time `json:"signedAt,omitempty"`

	// 乐观锁
	Version int `gorm:"default:1" json:"version"`
}

// -------------------------------------------------------------------------
// DeliveryTrackingDetail 轨迹明细表
// 一单多轨迹，每条路由信息独立存储
// -------------------------------------------------------------------------
type DeliveryTrackingDetail struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	// 关联主表
	DeliveryOrderID uint `gorm:"not null;index" json:"deliveryOrderId"`

	// 轨迹信息
	Time     time.Time `gorm:"not null" json:"time"`               // 路由发生时间
	Context  string    `gorm:"size:1000;not null" json:"context"`   // 路由描述
	Location string    `gorm:"size:255" json:"location"`            // 当前城市

	// 幂等性校验：使用 MD5(trackingNo + time + context) 生成
	// 唯一约束防止重复推送写入
	HashKey string `gorm:"size:32;uniqueIndex:idx_tracking_hash" json:"hashKey"`
}

// GenerateHashKey 基于 单号+时间+内容 生成幂等性哈希
// 用于在写入前拦截重复的物流推送
func GenerateHashKey(trackingNo string, eventTime time.Time, context string) string {
	raw := fmt.Sprintf("%s|%s|%s", trackingNo, eventTime.Format(time.RFC3339), context)
	hash := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// -------------------------------------------------------------------------
// LogisticsProvider 物流服务商配置 (从上一阶段砂箱保留)
// -------------------------------------------------------------------------
type LogisticsProvider struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	Name        string `gorm:"size:100;not null" json:"name"`
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	AppKey      string `gorm:"size:255" json:"appKey"`
	AppSecret   string `gorm:"size:255" json:"appSecret"`
	CustomerID  string `gorm:"size:100" json:"customerId"`
	CheckWord   string `gorm:"size:255" json:"checkWord"`
	Endpoint    string `gorm:"size:255" json:"endpoint"`
	Environment string `gorm:"size:20;default:'Sandbox'" json:"environment"`
	Status      string `gorm:"size:20;default:'Enabled'" json:"status"`

	// API 额度监控
	QuotaTotal     int `gorm:"default:0" json:"quotaTotal"`     // 总额度
	QuotaUsed      int `gorm:"default:0" json:"quotaUsed"`      // 已消耗
	QuotaAlertAt   int `gorm:"default:100" json:"quotaAlertAt"` // 剩余低于此值时告警
}
