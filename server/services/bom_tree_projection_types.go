package services

// TreeProjectionNode 树投影节点（完整信息）
type TreeProjectionNode struct {
	NodeID       string                 `json:"nodeId"`
	ParentNodeID *string                `json:"parentNodeId"`
	ChildNodeIDs []string               `json:"childNodeIds"`
	NodeKind     string                 `json:"nodeKind"` // "root", "branch", "leaf"
	BranchRole   string                 `json:"branchRole,omitempty"` // "section", "collection"
	Label        string                 `json:"label"`
	SectionCode  string                 `json:"sectionCode"`
	SectionName  string                 `json:"sectionName,omitempty"`
	ItemID       string                 `json:"itemId,omitempty"` // 仅 leaf 节点
	Depth        int                    `json:"depth"` // 节点深度（0 = root）
	IsCollapsible bool                  `json:"isCollapsible"` // 是否可折叠
	IsCollapsed  bool                   `json:"isCollapsed"` // 是否已折叠
	Metadata     TreeProjectionMetadata `json:"metadata"` // 元数据
}

// TreeProjectionMetadata 节点元数据
type TreeProjectionMetadata struct {
	Icon       string `json:"icon,omitempty"` // 图标名称
	Color      string `json:"color,omitempty"` // 颜色
	Badge      string `json:"badge,omitempty"` // 徽章文本
	IsEmpty    bool   `json:"isEmpty"` // 是否为空节点
	ChildCount int    `json:"childCount"` // 子节点数量
}

// TreeProjectionResponse API 响应
type TreeProjectionResponse struct {
	RootNodeID string               `json:"rootNodeId"`
	Nodes      []TreeProjectionNode `json:"nodes"`
	TotalCount int                  `json:"totalCount"`
}

// TreeProjectionRequest API 请求参数
type TreeProjectionRequest struct {
	CollapseEmpty   bool     `json:"collapseEmpty"` // 折叠空节点
	MaxDepth        int      `json:"maxDepth"` // 最大深度（0 = 无限制）
	ExpandedNodeIDs []string `json:"expandedNodeIds"` // 已展开的节点 ID
}
