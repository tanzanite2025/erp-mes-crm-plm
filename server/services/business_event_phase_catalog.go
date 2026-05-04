package services

import "sort"

type BusinessEventPhaseCatalogItem struct {
	Code     string `json:"code"`
	Label    string `json:"label"`
	Semantic string `json:"semantic"`
	Order    int    `json:"order"`
}

var businessEventPhaseCatalog = []BusinessEventPhaseCatalogItem{
	{Code: "draft", Label: "草稿", Semantic: "draft", Order: 0},
	{Code: "pending", Label: "待处理", Semantic: "pending", Order: 1},
	{Code: "scheduling", Label: "排产中", Semantic: "pending", Order: 2},
	{Code: "active", Label: "进行中", Semantic: "active", Order: 3},
	{Code: "done", Label: "已完成", Semantic: "done", Order: 4},
	{Code: "cancelled", Label: "已取消", Semantic: "cancelled", Order: 5},
	{Code: "terminal", Label: "终态", Semantic: "terminal", Order: 6},
	{Code: "custom", Label: "自定义", Semantic: "custom", Order: 7},
}

var allowedBusinessStatusPhases = buildAllowedBusinessStatusPhases()

func buildAllowedBusinessStatusPhases() map[string]struct{} {
	allowed := make(map[string]struct{}, len(businessEventPhaseCatalog))
	for _, item := range businessEventPhaseCatalog {
		allowed[item.Code] = struct{}{}
	}
	return allowed
}

func ListBusinessEventPhaseCatalog() []BusinessEventPhaseCatalogItem {
	items := make([]BusinessEventPhaseCatalogItem, len(businessEventPhaseCatalog))
	copy(items, businessEventPhaseCatalog)
	sort.Slice(items, func(i, j int) bool {
		if items[i].Order == items[j].Order {
			return items[i].Code < items[j].Code
		}
		return items[i].Order < items[j].Order
	})
	return items
}
