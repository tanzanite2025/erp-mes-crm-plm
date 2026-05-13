package services

import (
	"fmt"
	"xdfc-server/models"
)

// BuildTreeProjection 构建树投影
func BuildTreeProjection(
	bom models.BOM,
	request TreeProjectionRequest,
) (*TreeProjectionResponse, error) {
	// Step 1: 解析 RelationSidecar
	sidecar, err := parseBOMRelationSidecar(bom.RelationSidecar)
	if err != nil {
		return nil, fmt.Errorf("failed to parse relation sidecar: %w", err)
	}

	if sidecar == nil {
		return nil, fmt.Errorf("relation sidecar is required")
	}

	// Step 2: 构建节点映射
	nodeMap := buildNodeMap(sidecar, bom.Items)

	// Step 3: 计算节点深度
	calculateNodeDepth(nodeMap, sidecar.ProtocolDraft.RootChildren, 1)

	// Step 4: 生成元数据（必须在计算折叠状态之前）
	generateMetadata(nodeMap, bom.Items)

	// Step 5: 计算折叠状态
	calculateCollapseState(nodeMap, request)

	// Step 6: 转换为响应格式
	nodes := convertToProjectionNodes(nodeMap)

	return &TreeProjectionResponse{
		RootNodeID: "root",
		Nodes:      nodes,
		TotalCount: len(nodes),
	}, nil
}

// buildNodeMap 构建节点映射
func buildNodeMap(sidecar *BOMRelationSidecar, items []models.BOMItem) map[string]*TreeProjectionNode {
	nodeMap := make(map[string]*TreeProjectionNode)

	// 创建 root 节点
	rootNode := &TreeProjectionNode{
		NodeID:       "root",
		ParentNodeID: nil,
		ChildNodeIDs: sidecar.ProtocolDraft.RootChildren,
		NodeKind:     "root",
		Label:        "Root",
		SectionCode:  "",
		SectionName:  "",
		Depth:        0,
	}
	nodeMap["root"] = rootNode

	// 创建 branch 节点
	for _, branch := range sidecar.ProtocolDraft.BranchNodes {
		node := &TreeProjectionNode{
			NodeID:       branch.ID,
			ParentNodeID: branch.ParentID,
			ChildNodeIDs: branch.Children,
			NodeKind:     "branch",
			BranchRole:   branch.BranchRole,
			Label:        branch.Label,
			SectionCode:  branch.SectionCode,
			SectionName:  branch.SectionName,
		}
		nodeMap[branch.ID] = node
	}

	// 创建 item (leaf) 节点
	for _, item := range sidecar.ProtocolDraft.ItemNodes {
		node := &TreeProjectionNode{
			NodeID:       item.ID,
			ParentNodeID: item.ParentID,
			ChildNodeIDs: item.Children,
			NodeKind:     "leaf",
			Label:        resolveItemLabel(item.ItemID, items),
			SectionCode:  item.SectionCode,
			SectionName:  item.SectionName,
			ItemID:       item.ItemID,
		}
		nodeMap[item.ID] = node
	}

	return nodeMap
}

// resolveItemLabel 解析 item 的标签（从 BOMItem 中获取物料信息）
func resolveItemLabel(itemID string, items []models.BOMItem) string {
	for _, item := range items {
		if item.ID == itemID {
			// 这里可以根据实际需求返回物料名称或编码
			// 暂时返回 itemID
			return fmt.Sprintf("Item %s", itemID)
		}
	}
	return fmt.Sprintf("Item %s", itemID)
}

// calculateNodeDepth 递归计算节点深度
func calculateNodeDepth(
	nodeMap map[string]*TreeProjectionNode,
	childIDs []string,
	currentDepth int,
) {
	for _, childID := range childIDs {
		node, exists := nodeMap[childID]
		if !exists {
			continue
		}
		node.Depth = currentDepth
		calculateNodeDepth(nodeMap, node.ChildNodeIDs, currentDepth+1)
	}
}

// calculateCollapseState 计算折叠状态
func calculateCollapseState(
	nodeMap map[string]*TreeProjectionNode,
	request TreeProjectionRequest,
) {
	// 构建已展开节点集合
	expandedSet := make(map[string]bool)
	for _, id := range request.ExpandedNodeIDs {
		expandedSet[id] = true
	}

	for _, node := range nodeMap {
		// 判断是否可折叠
		node.IsCollapsible = len(node.ChildNodeIDs) > 0

		// 判断是否已折叠
		if request.CollapseEmpty && node.Metadata.IsEmpty {
			// 折叠空节点
			node.IsCollapsed = true
		} else if expandedSet[node.NodeID] {
			// 用户明确展开的节点
			node.IsCollapsed = false
		} else {
			// 默认折叠深度 > maxDepth 的节点
			if request.MaxDepth > 0 && node.Depth >= request.MaxDepth {
				node.IsCollapsed = true
			} else {
				// 默认展开
				node.IsCollapsed = false
			}
		}
	}
}

// generateMetadata 生成节点元数据
func generateMetadata(
	nodeMap map[string]*TreeProjectionNode,
	items []models.BOMItem,
) {
	// 构建 itemID -> item 映射
	itemMap := make(map[string]models.BOMItem)
	for _, item := range items {
		itemMap[item.ID] = item
	}

	for _, node := range nodeMap {
		metadata := &node.Metadata

		// 设置图标
		switch node.NodeKind {
		case "root":
			metadata.Icon = "home"
		case "branch":
			if node.BranchRole == "section" {
				metadata.Icon = "folder"
			} else if node.BranchRole == "collection" {
				metadata.Icon = "folder-open"
			} else {
				metadata.Icon = "folder"
			}
		case "leaf":
			metadata.Icon = "file"
		}

		// 设置颜色
		if node.BranchRole == "section" {
			metadata.Color = "#1890ff"
		} else if node.BranchRole == "collection" {
			metadata.Color = "#52c41a"
		}

		// 判断是否为空
		metadata.IsEmpty = len(node.ChildNodeIDs) == 0

		// 设置子节点数量
		metadata.ChildCount = len(node.ChildNodeIDs)

		// 设置徽章（显示子节点数量）
		if metadata.ChildCount > 0 {
			metadata.Badge = fmt.Sprintf("%d", metadata.ChildCount)
		}
	}
}

// convertToProjectionNodes 转换为响应格式
func convertToProjectionNodes(nodeMap map[string]*TreeProjectionNode) []TreeProjectionNode {
	nodes := make([]TreeProjectionNode, 0, len(nodeMap))
	for _, node := range nodeMap {
		nodes = append(nodes, *node)
	}
	return nodes
}
