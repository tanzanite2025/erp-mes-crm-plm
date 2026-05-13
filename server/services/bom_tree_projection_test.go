package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// Unit Tests for BuildTreeProjection (BOM Tree Projection Feature)
// ============================================================================

// TestBuildTreeProjection_SimpleTree tests a simple tree structure with 1 section and 3 items
func TestBuildTreeProjection_SimpleTree(t *testing.T) {
	// Arrange: Create a simple BOM with 1 section and 3 items
	item1ID := uuid.New().String()
	item2ID := uuid.New().String()
	item3ID := uuid.New().String()

	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{"section1"},
			BranchNodes: []BOMParentChildrenProtocolBranchDraft{
				{
					ID:          "section1",
					ParentID:    ptrString("root"),
					Children:    []string{"item1", "item2", "item3"},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Section A",
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
			ItemNodes: []BOMParentChildrenProtocolItemDraft{
				{
					ID:          "item1",
					ParentID:    ptrString("section1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item1ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "item2",
					ParentID:    ptrString("section1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item2ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "item3",
					ParentID:    ptrString("section1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item3ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-001",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items: []models.BOMItem{
			{ID: item1ID, BOMID: "bom1", MaterialID: "mat1"},
			{ID: item2ID, BOMID: "bom1", MaterialID: "mat2"},
			{ID: item3ID, BOMID: "bom1", MaterialID: "mat3"},
		},
	}

	request := TreeProjectionRequest{
		CollapseEmpty:   false,
		MaxDepth:        0,
		ExpandedNodeIDs: []string{},
	}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "root", result.RootNodeID)
	assert.Equal(t, 5, result.TotalCount) // root + 1 section + 3 items

	// Verify root node
	rootNode := findNodeByID(result.Nodes, "root")
	require.NotNil(t, rootNode)
	assert.Equal(t, "root", rootNode.NodeKind)
	assert.Equal(t, 0, rootNode.Depth)
	assert.Equal(t, []string{"section1"}, rootNode.ChildNodeIDs)
	assert.True(t, rootNode.IsCollapsible)
	assert.False(t, rootNode.IsCollapsed)

	// Verify section node
	sectionNode := findNodeByID(result.Nodes, "section1")
	require.NotNil(t, sectionNode)
	assert.Equal(t, "branch", sectionNode.NodeKind)
	assert.Equal(t, "section", sectionNode.BranchRole)
	assert.Equal(t, 1, sectionNode.Depth)
	assert.Equal(t, 3, len(sectionNode.ChildNodeIDs))
	assert.True(t, sectionNode.IsCollapsible)
	assert.False(t, sectionNode.IsCollapsed)
	assert.Equal(t, "Section A", sectionNode.Label)
	assert.Equal(t, "A", sectionNode.SectionCode)

	// Verify item nodes
	item1Node := findNodeByID(result.Nodes, "item1")
	require.NotNil(t, item1Node)
	assert.Equal(t, "leaf", item1Node.NodeKind)
	assert.Equal(t, 2, item1Node.Depth)
	assert.Equal(t, item1ID, item1Node.ItemID)
	assert.False(t, item1Node.IsCollapsible)
	assert.False(t, item1Node.IsCollapsed)
}

// TestBuildTreeProjection_ComplexTree tests a complex tree with multiple levels
func TestBuildTreeProjection_ComplexTree(t *testing.T) {
	// Arrange: Create a complex BOM with nested sections and collections
	item1ID := uuid.New().String()
	item2ID := uuid.New().String()
	item3ID := uuid.New().String()

	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{"section1"},
			BranchNodes: []BOMParentChildrenProtocolBranchDraft{
				{
					ID:          "section1",
					ParentID:    ptrString("root"),
					Children:    []string{"collection1", "item1"},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Section A",
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "collection1",
					ParentID:    ptrString("section1"),
					Children:    []string{"item2", "item3"},
					NodeKind:    "branch",
					BranchRole:  "collection",
					Label:       "Collection 1",
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
			ItemNodes: []BOMParentChildrenProtocolItemDraft{
				{
					ID:          "item1",
					ParentID:    ptrString("section1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item1ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "item2",
					ParentID:    ptrString("collection1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item2ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "item3",
					ParentID:    ptrString("collection1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item3ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-002",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items: []models.BOMItem{
			{ID: item1ID, BOMID: "bom2", MaterialID: "mat1"},
			{ID: item2ID, BOMID: "bom2", MaterialID: "mat2"},
			{ID: item3ID, BOMID: "bom2", MaterialID: "mat3"},
		},
	}

	request := TreeProjectionRequest{
		CollapseEmpty:   false,
		MaxDepth:        0,
		ExpandedNodeIDs: []string{},
	}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 6, result.TotalCount) // root + 1 section + 1 collection + 3 items

	// Verify depth calculation
	rootNode := findNodeByID(result.Nodes, "root")
	assert.Equal(t, 0, rootNode.Depth)

	sectionNode := findNodeByID(result.Nodes, "section1")
	assert.Equal(t, 1, sectionNode.Depth)

	collectionNode := findNodeByID(result.Nodes, "collection1")
	assert.Equal(t, 2, collectionNode.Depth)
	assert.Equal(t, "collection", collectionNode.BranchRole)

	item1Node := findNodeByID(result.Nodes, "item1")
	assert.Equal(t, 2, item1Node.Depth)

	item2Node := findNodeByID(result.Nodes, "item2")
	assert.Equal(t, 3, item2Node.Depth)

	item3Node := findNodeByID(result.Nodes, "item3")
	assert.Equal(t, 3, item3Node.Depth)
}

// TestBuildTreeProjection_EmptyTree tests an empty tree with no items
func TestBuildTreeProjection_EmptyTree(t *testing.T) {
	// Arrange: Create a BOM with only root
	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{},
			BranchNodes:  []BOMParentChildrenProtocolBranchDraft{},
			ItemNodes:    []BOMParentChildrenProtocolItemDraft{},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-003",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items:           []models.BOMItem{},
	}

	request := TreeProjectionRequest{
		CollapseEmpty:   false,
		MaxDepth:        0,
		ExpandedNodeIDs: []string{},
	}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "root", result.RootNodeID)
	assert.Equal(t, 1, result.TotalCount) // only root

	rootNode := findNodeByID(result.Nodes, "root")
	require.NotNil(t, rootNode)
	assert.Equal(t, 0, len(rootNode.ChildNodeIDs))
	assert.False(t, rootNode.IsCollapsible)
	assert.True(t, rootNode.Metadata.IsEmpty)
}

// TestBuildTreeProjection_CollapseEmpty tests collapsing empty nodes
func TestBuildTreeProjection_CollapseEmpty(t *testing.T) {
	// Arrange: Create a BOM with an empty section
	item1ID := uuid.New().String()

	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{"section1", "section2"},
			BranchNodes: []BOMParentChildrenProtocolBranchDraft{
				{
					ID:          "section1",
					ParentID:    ptrString("root"),
					Children:    []string{},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Empty Section",
					SectionCode: "A",
					SectionName: "Empty Section",
				},
				{
					ID:          "section2",
					ParentID:    ptrString("root"),
					Children:    []string{"item1"},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Non-Empty Section",
					SectionCode: "B",
					SectionName: "Non-Empty Section",
				},
			},
			ItemNodes: []BOMParentChildrenProtocolItemDraft{
				{
					ID:          "item1",
					ParentID:    ptrString("section2"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item1ID,
					SectionCode: "B",
					SectionName: "Non-Empty Section",
				},
			},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-004",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items:           []models.BOMItem{{ID: item1ID}},
	}

	request := TreeProjectionRequest{
		CollapseEmpty:   true,
		MaxDepth:        0,
		ExpandedNodeIDs: []string{},
	}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)

	// Empty section should be collapsed
	section1Node := findNodeByID(result.Nodes, "section1")
	require.NotNil(t, section1Node)
	assert.True(t, section1Node.IsCollapsed)
	assert.True(t, section1Node.Metadata.IsEmpty)

	// Non-empty section should not be collapsed
	section2Node := findNodeByID(result.Nodes, "section2")
	require.NotNil(t, section2Node)
	assert.False(t, section2Node.IsCollapsed)
	assert.False(t, section2Node.Metadata.IsEmpty)
}

// TestBuildTreeProjection_MaxDepth tests maximum depth limitation
func TestBuildTreeProjection_MaxDepth(t *testing.T) {
	// Arrange: Create a deep tree
	item1ID := uuid.New().String()
	item2ID := uuid.New().String()

	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{"section1"},
			BranchNodes: []BOMParentChildrenProtocolBranchDraft{
				{
					ID:          "section1",
					ParentID:    ptrString("root"),
					Children:    []string{"collection1"},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Section A",
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "collection1",
					ParentID:    ptrString("section1"),
					Children:    []string{"item1", "item2"},
					NodeKind:    "branch",
					BranchRole:  "collection",
					Label:       "Collection 1",
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
			ItemNodes: []BOMParentChildrenProtocolItemDraft{
				{
					ID:          "item1",
					ParentID:    ptrString("collection1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item1ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "item2",
					ParentID:    ptrString("collection1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item2ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-005",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items: []models.BOMItem{
			{ID: item1ID, BOMID: "bom5", MaterialID: "mat1"},
			{ID: item2ID, BOMID: "bom5", MaterialID: "mat2"},
		},
	}

	request := TreeProjectionRequest{
		CollapseEmpty:   false,
		MaxDepth:        2, // Collapse nodes at depth >= 2
		ExpandedNodeIDs: []string{},
	}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)

	// Nodes at depth < 2 should not be collapsed
	rootNode := findNodeByID(result.Nodes, "root")
	assert.False(t, rootNode.IsCollapsed)

	sectionNode := findNodeByID(result.Nodes, "section1")
	assert.False(t, sectionNode.IsCollapsed)

	// Nodes at depth >= 2 should be collapsed
	collectionNode := findNodeByID(result.Nodes, "collection1")
	assert.True(t, collectionNode.IsCollapsed)

	item1Node := findNodeByID(result.Nodes, "item1")
	assert.True(t, item1Node.IsCollapsed)
}

// TestBuildTreeProjection_ExpandedNodes tests expanding specific nodes
func TestBuildTreeProjection_ExpandedNodes(t *testing.T) {
	// Arrange: Create a tree with maxDepth but some nodes explicitly expanded
	item1ID := uuid.New().String()

	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{"section1"},
			BranchNodes: []BOMParentChildrenProtocolBranchDraft{
				{
					ID:          "section1",
					ParentID:    ptrString("root"),
					Children:    []string{"item1"},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Section A",
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
			ItemNodes: []BOMParentChildrenProtocolItemDraft{
				{
					ID:          "item1",
					ParentID:    ptrString("section1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item1ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-006",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items:           []models.BOMItem{{ID: item1ID}},
	}

	request := TreeProjectionRequest{
		CollapseEmpty:   false,
		MaxDepth:        1, // Would normally collapse section1
		ExpandedNodeIDs: []string{"section1"}, // But explicitly expand it
	}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)

	// section1 should be expanded despite maxDepth
	sectionNode := findNodeByID(result.Nodes, "section1")
	require.NotNil(t, sectionNode)
	assert.False(t, sectionNode.IsCollapsed)

	// item1 should still be collapsed (depth >= maxDepth and not in expandedNodeIDs)
	item1Node := findNodeByID(result.Nodes, "item1")
	require.NotNil(t, item1Node)
	assert.True(t, item1Node.IsCollapsed)
}

// TestBuildTreeProjection_Metadata tests metadata generation
func TestBuildTreeProjection_Metadata(t *testing.T) {
	// Arrange
	item1ID := uuid.New().String()

	sidecar := BOMRelationSidecar{
		Kind:    "parent_children_protocol",
		Version: "v1",
		ProtocolDraft: BOMParentChildrenProtocolDraft{
			RootChildren: []string{"section1"},
			BranchNodes: []BOMParentChildrenProtocolBranchDraft{
				{
					ID:          "section1",
					ParentID:    ptrString("root"),
					Children:    []string{"collection1"},
					NodeKind:    "branch",
					BranchRole:  "section",
					Label:       "Section A",
					SectionCode: "A",
					SectionName: "Section A",
				},
				{
					ID:          "collection1",
					ParentID:    ptrString("section1"),
					Children:    []string{"item1"},
					NodeKind:    "branch",
					BranchRole:  "collection",
					Label:       "Collection 1",
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
			ItemNodes: []BOMParentChildrenProtocolItemDraft{
				{
					ID:          "item1",
					ParentID:    ptrString("collection1"),
					Children:    []string{},
					NodeKind:    "item",
					ItemID:      item1ID,
					SectionCode: "A",
					SectionName: "Section A",
				},
			},
		},
	}

	sidecarJSON, err := json.Marshal(sidecar)
	require.NoError(t, err)

	bom := models.BOM{
		BOMNo:           "BOM-007",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: sidecarJSON,
		Items:           []models.BOMItem{{ID: item1ID}},
	}

	request := TreeProjectionRequest{}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	require.NoError(t, err)

	// Check root metadata
	rootNode := findNodeByID(result.Nodes, "root")
	assert.Equal(t, "home", rootNode.Metadata.Icon)
	assert.Equal(t, 1, rootNode.Metadata.ChildCount)
	assert.Equal(t, "1", rootNode.Metadata.Badge)

	// Check section metadata
	sectionNode := findNodeByID(result.Nodes, "section1")
	assert.Equal(t, "folder", sectionNode.Metadata.Icon)
	assert.Equal(t, "#1890ff", sectionNode.Metadata.Color)
	assert.Equal(t, 1, sectionNode.Metadata.ChildCount)

	// Check collection metadata
	collectionNode := findNodeByID(result.Nodes, "collection1")
	assert.Equal(t, "folder-open", collectionNode.Metadata.Icon)
	assert.Equal(t, "#52c41a", collectionNode.Metadata.Color)
	assert.Equal(t, 1, collectionNode.Metadata.ChildCount)

	// Check leaf metadata
	item1Node := findNodeByID(result.Nodes, "item1")
	assert.Equal(t, "file", item1Node.Metadata.Icon)
	assert.Equal(t, 0, item1Node.Metadata.ChildCount)
	assert.True(t, item1Node.Metadata.IsEmpty)
}

// TestBuildTreeProjection_InvalidSidecar tests error handling for invalid sidecar
func TestBuildTreeProjection_InvalidSidecar(t *testing.T) {
	// Arrange: BOM with invalid JSON
	bom := models.BOM{
		BOMNo:           "BOM-008",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: []byte("invalid json"),
		Items:           []models.BOMItem{},
	}

	request := TreeProjectionRequest{}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
}

// TestBuildTreeProjection_NilSidecar tests error handling for nil sidecar
func TestBuildTreeProjection_NilSidecar(t *testing.T) {
	// Arrange: BOM with nil sidecar
	bom := models.BOM{
		BOMNo:           "BOM-009",
		BOMType:         models.BOMTypeEBOM,
		RelationSidecar: nil,
		Items:           []models.BOMItem{},
	}

	request := TreeProjectionRequest{}

	// Act
	result, err := BuildTreeProjection(bom, request)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "relation sidecar is required")
}

// ============================================================================
// Helper Functions
// ============================================================================

// findNodeByID finds a node by its ID in the result
func findNodeByID(nodes []TreeProjectionNode, nodeID string) *TreeProjectionNode {
	for i := range nodes {
		if nodes[i].NodeID == nodeID {
			return &nodes[i]
		}
	}
	return nil
}

// ptrString returns a pointer to a string
func ptrString(s string) *string {
	return &s
}
