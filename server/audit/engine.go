package audit

import (
	"reflect"
	"sync"
)

// DiffItem 表示单个字段的差异
type DiffItem struct {
	Field string      `json:"f"` // 字段名
	Old   interface{} `json:"o"` // 旧值
	New   interface{} `json:"n"` // 新值
	Alias string      `json:"a"` // 中文别名
}

// fieldMeta 存储结构体字段的元数据
type fieldMeta struct {
	name   string
	alias  string
	ignore bool
}

var (
	// metadataCache 缓存结构体类型的元数据，避免重复反射
	metadataCache sync.Map
)

// ComputeDiff 对比两个同类型的结构体，返回差异列表
func ComputeDiff(old, new interface{}) []DiffItem {
	if old == nil || new == nil {
		return nil
	}

	t := reflect.TypeOf(old)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	// 确保是结构体
	if t.Kind() != reflect.Struct {
		return nil
	}

	vOld := reflect.ValueOf(old)
	vNew := reflect.ValueOf(new)

	if vOld.Kind() == reflect.Ptr {
		vOld = vOld.Elem()
	}
	if vNew.Kind() == reflect.Ptr {
		vNew = vNew.Elem()
	}

	metas := getFieldMetas(t)
	var diffs []DiffItem

	for i, meta := range metas {
		if meta.ignore {
			continue
		}

		fOld := vOld.Field(i).Interface()
		fNew := vNew.Field(i).Interface()

		// 使用 reflect.DeepEqual 判定差异
		if !reflect.DeepEqual(fOld, fNew) {
			diffs = append(diffs, DiffItem{
				Field: meta.name,
				Alias: meta.alias,
				Old:   fOld,
				New:   fNew,
			})
		}
	}

	return diffs
}

// getFieldMetas 获取并缓存结构体的元数据
func getFieldMetas(t reflect.Type) []fieldMeta {
	if val, ok := metadataCache.Load(t); ok {
		return val.([]fieldMeta)
	}

	numFields := t.NumField()
	metas := make([]fieldMeta, numFields)

	for i := 0; i < numFields; i++ {
		field := t.Field(i)
		meta := fieldMeta{
			name:  field.Name,
			alias: field.Name,
		}

		tag := field.Tag.Get("audit")
		if tag == "-" {
			meta.ignore = true
		} else if tag != "" {
			// 解析 audit:"alias:中文名"
			if len(tag) > 6 && tag[:6] == "alias:" {
				meta.alias = tag[6:]
			}
		}

		// 默认忽略一些通用字段（可选）
		if field.Name == "UpdatedAt" || field.Name == "DeletedAt" {
			meta.ignore = true
		}

		metas[i] = meta
	}

	metadataCache.Store(t, metas)
	return metas
}
