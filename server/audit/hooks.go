package audit

import (
	"encoding/json"
	"reflect"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	auditOldValueKey = "audit:old_value"
)

// RegisterHooks 注册 GORM 全局审计钩子
func RegisterHooks(db *gorm.DB) {
	// 在更新前快照旧数据
	db.Callback().Update().Before("gorm:update").Register("audit:before_update", beforeUpdate)
	// 在更新后对比并记录
	db.Callback().Update().After("gorm:update").Register("audit:after_update", afterUpdate)
}

func beforeUpdate(db *gorm.DB) {
	if db.Error != nil || db.Statement.Schema == nil {
		return
	}

	// 排除 AuditLog 自身的更新（防止死循环）
	if db.Statement.Schema.Name == "AuditLog" {
		return
	}

	// 注意：这里需要深拷贝或重新查询。重新查询最稳妥但有性能开销。
	// 为了简化，我们假设主键已存在并进行查询。
	
	// 如果主键为空，说明是非法更新，忽略
	pk := db.Statement.ReflectValue.FieldByName("ID")
	if !pk.IsValid() || pk.Interface() == "" {
		return
	}

	// 创建一个与当前模型同类型的新实例
	oldRecord := reflect.New(db.Statement.ReflectValue.Type()).Interface()
	if err := db.Session(&gorm.Session{NewDB: true}).First(oldRecord, "id = ?", pk.Interface()).Error; err != nil {
		// 找不到旧记录可能意味着是逻辑上的首次保存，忽略或作为 Create 处理
		return
	}

	// 将旧数据存入 Statement Context
	db.InstanceSet(auditOldValueKey, oldRecord)
}

func afterUpdate(db *gorm.DB) {
	if db.Error != nil || db.Statement.Schema == nil {
		return
	}

	if db.Statement.Schema.Name == "AuditLog" {
		return
	}

	// 获取旧数据
	oldRaw, ok := db.InstanceGet(auditOldValueKey)
	if !ok {
		return
	}

	newRecord := db.Statement.ReflectValue.Interface()
	
	// 计算差异
	diffs := ComputeDiff(oldRaw, newRecord)
	if len(diffs) == 0 {
		return
	}

	diffJSON, _ := json.Marshal(diffs)

	// 获取操作人信息（假设已通过 db.Set("audit:operator", "...") 传入）
	operator, _ := db.Get("audit:operator")
	ip, _ := db.Get("audit:ip")

	operatorStr, _ := operator.(string)
	if operatorStr == "" {
		operatorStr = "system"
	}
	ipStr, _ := ip.(string)

	pk := db.Statement.ReflectValue.FieldByName("ID").Interface().(string)

	// 异步或同步写入审计日志？
	// 按照“审计中断=业务拦截”原则，这里使用同步写入（复用当前事务）
	log := models.AuditLog{
		ID:        uuid.NewString(),
		Module:     db.Statement.Schema.Name,
		TargetID:  pk,
		Action:    "Update",
		Diff:      diffJSON,
		Operator:  operatorStr,
		IP:        ipStr,
	}

	// 使用新 Session 写入，避免钩子递归
	if err := db.Session(&gorm.Session{NewDB: true}).Create(&log).Error; err != nil {
		_ = db.AddError(err)
	}
}
