# Design Document

## Overview

This document provides the technical design for implementing BOM list query filtering by Status and BOMType. The design follows a layered architecture approach, enhancing the existing query system with minimal disruption to current functionality.

## Architecture

### System Layers

```
┌─────────────────────────────────────────┐
│   Frontend UI (React Components)       │
│   - Filter Panel Component              │
│   - BOM List Page                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Frontend Service Layer                │
│   - BOM Service (TypeScript)            │
│   - React Query Hooks                   │
└─────────────────┬───────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────┐
│   Backend API Layer (Go)                │
│   - HTTP Handlers                       │
│   - Request Validation                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Backend Service Layer (Go)            │
│   - BOM Service                         │
│   - Query Building                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Database Layer (PostgreSQL)           │
│   - boms table with indexes             │
└─────────────────────────────────────────┘
```

## Component Design

### 1. Backend Data Structures

#### 1.1 BOMListQuery Enhancement

**File**: `server/services/engineering_master_types.go`

```go
type BOMListQuery struct {
    ProductID   *int64  `json:"productId,omitempty"`
    Status      string  `json:"status,omitempty"`      // NEW: comma-separated status values
    BOMType     string  `json:"bomType,omitempty"`     // NEW: comma-separated BOM type values
    Page        int     `json:"page"`
    PageSize    int     `json:"pageSize"`
}
```

**Design Rationale**:
- Use string type for comma-separated values to simplify HTTP query parameter parsing
- Keep fields optional (omitempty) to maintain backward compatibility
- Parsing to arrays happens in the service layer, not at the struct level

#### 1.2 Query Validation

**File**: `server/services/bom_service.go`

```go
// ValidBOMStatuses defines all valid BOM status values
var ValidBOMStatuses = []string{
    "DRAFT", "REVIEWING", "APPROVED", "VALIDATING", "RELEASED", "OBSOLETE",
}

// ValidBOMTypes defines all valid BOM type values
var ValidBOMTypes = []string{
    "EBOM", "MBOM",
}

// parseAndValidateStatuses parses comma-separated status string and validates each value
func parseAndValidateStatuses(statusStr string) ([]string, error) {
    if statusStr == "" {
        return nil, nil
    }
    
    statuses := strings.Split(statusStr, ",")
    var result []string
    var invalid []string
    
    for _, s := range statuses {
        trimmed := strings.TrimSpace(strings.ToUpper(s))
        if trimmed == "" {
            continue
        }
        
        if !contains(ValidBOMStatuses, trimmed) {
            invalid = append(invalid, s)
        } else {
            result = append(result, trimmed)
        }
    }
    
    if len(invalid) > 0 {
        return nil, fmt.Errorf("invalid status values: %s. Valid values are: %s",
            strings.Join(invalid, ", "),
            strings.Join(ValidBOMStatuses, ", "))
    }
    
    return result, nil
}

// parseAndValidateBOMTypes parses comma-separated BOM type string and validates each value
func parseAndValidateBOMTypes(bomTypeStr string) ([]string, error) {
    if bomTypeStr == "" {
        return nil, nil
    }
    
    types := strings.Split(bomTypeStr, ",")
    var result []string
    var invalid []string
    
    for _, t := range types {
        trimmed := strings.TrimSpace(strings.ToUpper(t))
        if trimmed == "" {
            continue
        }
        
        if !contains(ValidBOMTypes, trimmed) {
            invalid = append(invalid, t)
        } else {
            result = append(result, trimmed)
        }
    }
    
    if len(invalid) > 0 {
        return nil, fmt.Errorf("invalid BOM type values: %s. Valid values are: %s",
            strings.Join(invalid, ", "),
            strings.Join(ValidBOMTypes, ", "))
    }
    
    return result, nil
}

func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}
```

**Design Rationale**:
- Centralize validation logic for reusability
- Provide clear error messages with valid options
- Normalize input to uppercase for consistency
- Handle whitespace and empty values gracefully

### 2. Backend Service Layer

#### 2.1 Query Building Enhancement

**File**: `server/services/bom_service.go`

```go
func (s *BOMService) ListBOMs(ctx context.Context, query BOMListQuery) (*PaginatedBOMList, error) {
    // Validate and parse status filter
    statuses, err := parseAndValidateStatuses(query.Status)
    if err != nil {
        return nil, err
    }
    
    // Validate and parse BOM type filter
    bomTypes, err := parseAndValidateBOMTypes(query.BOMType)
    if err != nil {
        return nil, err
    }
    
    // Build base query
    db := s.db.WithContext(ctx).Model(&models.BOM{})
    
    // Apply product filter (existing)
    if query.ProductID != nil {
        db = db.Where("product_id = ?", *query.ProductID)
    }
    
    // Apply status filter (NEW)
    if len(statuses) > 0 {
        db = db.Where("status IN ?", statuses)
    }
    
    // Apply BOM type filter (NEW)
    if len(bomTypes) > 0 {
        db = db.Where("bom_type IN ?", bomTypes)
    }
    
    // Count total matching records
    var total int64
    if err := db.Count(&total).Error; err != nil {
        return nil, fmt.Errorf("failed to count BOMs: %w", err)
    }
    
    // Apply pagination
    offset := (query.Page - 1) * query.PageSize
    var boms []models.BOM
    if err := db.Offset(offset).Limit(query.PageSize).
        Order("created_at DESC").
        Find(&boms).Error; err != nil {
        return nil, fmt.Errorf("failed to list BOMs: %w", err)
    }
    
    return &PaginatedBOMList{
        Items:      boms,
        Total:      total,
        Page:       query.Page,
        PageSize:   query.PageSize,
        TotalPages: (total + int64(query.PageSize) - 1) / int64(query.PageSize),
    }, nil
}
```

**Design Rationale**:
- Use GORM's `IN` clause for efficient multi-value filtering
- Validate before building query to fail fast
- Apply filters using AND logic (all conditions must match)
- Maintain existing pagination and sorting behavior

### 3. Backend API Layer

#### 3.1 HTTP Handler Enhancement

**File**: `server/handlers/bom.go`

```go
func (h *BOMHandler) ListBOMs(c *gin.Context) {
    // Parse query parameters
    var query services.BOMListQuery
    
    // Parse productId (existing)
    if productIDStr := c.Query("productId"); productIDStr != "" {
        productID, err := strconv.ParseInt(productIDStr, 10, 64)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": "invalid productId parameter",
            })
            return
        }
        query.ProductID = &productID
    }
    
    // Parse status (NEW)
    query.Status = c.Query("status")
    
    // Parse bomType (NEW)
    query.BOMType = c.Query("bomType")
    
    // Parse pagination
    query.Page = 1
    if pageStr := c.Query("page"); pageStr != "" {
        if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
            query.Page = page
        }
    }
    
    query.PageSize = 20
    if pageSizeStr := c.Query("pageSize"); pageSizeStr != "" {
        if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
            query.PageSize = pageSize
        }
    }
    
    // Call service layer
    result, err := h.bomService.ListBOMs(c.Request.Context(), query)
    if err != nil {
        // Check if it's a validation error
        if strings.Contains(err.Error(), "invalid status values") ||
           strings.Contains(err.Error(), "invalid BOM type values") {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": err.Error(),
            })
            return
        }
        
        // Other errors
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "failed to list BOMs",
        })
        return
    }
    
    c.JSON(http.StatusOK, result)
}
```

**Design Rationale**:
- Simple query parameter extraction using Gin's `c.Query()`
- Validation happens in service layer, not handler
- Distinguish validation errors (400) from server errors (500)
- Maintain existing parameter parsing patterns

### 4. Database Layer

#### 4.1 Index Creation Migration

**File**: `server/migrations/YYYYMMDDHHMMSS_add_bom_query_indexes.sql`

```sql
-- Migration: Add indexes for BOM query filtering
-- Created: 2025-01-12

-- Add index on status column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_boms_status ON boms(status);

-- Add index on bom_type column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_boms_bom_type ON boms(bom_type);

-- Add composite index for combined filtering (optional, for optimization)
CREATE INDEX IF NOT EXISTS idx_boms_status_bom_type ON boms(status, bom_type);

-- Rollback migration
-- DROP INDEX IF EXISTS idx_boms_status;
-- DROP INDEX IF EXISTS idx_boms_bom_type;
-- DROP INDEX IF EXISTS idx_boms_status_bom_type;
```

**Design Rationale**:
- Single-column indexes for individual filter queries
- Composite index for combined filter queries (most common use case)
- Use `IF NOT EXISTS` for idempotent migrations
- Include rollback commands for easy reversal

### 5. Frontend Service Layer

#### 5.1 BOM Service Enhancement

**File**: `src/features/product-structure/services/bom-service.ts`

```typescript
export interface BOMListQueryParams {
  productId?: number;
  statuses?: string[];      // NEW: array of status values
  bomTypes?: string[];      // NEW: array of BOM type values
  page?: number;
  pageSize?: number;
}

export const bomService = {
  // ... existing methods ...
  
  async listBOMs(params: BOMListQueryParams = {}): Promise<PaginatedBOMList> {
    const queryParams = new URLSearchParams();
    
    // Add productId if provided (existing)
    if (params.productId !== undefined) {
      queryParams.append('productId', params.productId.toString());
    }
    
    // Add status filter if provided (NEW)
    if (params.statuses && params.statuses.length > 0) {
      queryParams.append('status', params.statuses.join(','));
    }
    
    // Add bomType filter if provided (NEW)
    if (params.bomTypes && params.bomTypes.length > 0) {
      queryParams.append('bomType', params.bomTypes.join(','));
    }
    
    // Add pagination
    if (params.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params.pageSize !== undefined) {
      queryParams.append('pageSize', params.pageSize.toString());
    }
    
    const response = await fetch(`/api/boms?${queryParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch BOMs');
    }
    
    return response.json();
  },
};
```

**Design Rationale**:
- Accept arrays for type safety and ease of use
- Convert arrays to comma-separated strings for API
- Use URLSearchParams for proper query string encoding
- Maintain consistent error handling

#### 5.2 React Query Hook Enhancement

**File**: `src/features/product-structure/hooks/use-bom-queries.ts`

```typescript
export interface UseBOMListOptions {
  productId?: number;
  statuses?: string[];      // NEW
  bomTypes?: string[];      // NEW
  page?: number;
  pageSize?: number;
}

export function useBOMList(options: UseBOMListOptions = {}) {
  return useQuery({
    queryKey: ['boms', 'list', options],  // Include all options in cache key
    queryFn: () => bomService.listBOMs(options),
    staleTime: 30000,  // 30 seconds
    gcTime: 300000,    // 5 minutes
  });
}
```

**Design Rationale**:
- Include all filter options in query key for proper cache invalidation
- Automatic refetch when filter options change
- Maintain existing staleTime and gcTime settings

### 6. Frontend UI Components

#### 6.1 Filter Panel Component

**File**: `src/features/product-structure/components/BOMFilterPanel.tsx`

```typescript
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface BOMFilterPanelProps {
  onFilterChange: (filters: { statuses: string[]; bomTypes: string[] }) => void;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'REVIEWING', label: '评审中' },
  { value: 'APPROVED', label: '已批准' },
  { value: 'VALIDATING', label: '验证中' },
  { value: 'RELEASED', label: '已发布' },
  { value: 'OBSOLETE', label: '已废弃' },
];

const BOM_TYPE_OPTIONS = [
  { value: 'EBOM', label: '工程BOM' },
  { value: 'MBOM', label: '制造BOM' },
];

export function BOMFilterPanel({ onFilterChange }: BOMFilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const statusParam = searchParams.get('status');
    return statusParam ? statusParam.split(',') : [];
  });
  
  const [selectedBOMTypes, setSelectedBOMTypes] = useState<string[]>(() => {
    const bomTypeParam = searchParams.get('bomType');
    return bomTypeParam ? bomTypeParam.split(',') : [];
  });
  
  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter(s => s !== status);
    
    setSelectedStatuses(newStatuses);
    updateFilters(newStatuses, selectedBOMTypes);
  };
  
  const handleBOMTypeChange = (bomType: string, checked: boolean) => {
    const newBOMTypes = checked
      ? [...selectedBOMTypes, bomType]
      : selectedBOMTypes.filter(t => t !== bomType);
    
    setSelectedBOMTypes(newBOMTypes);
    updateFilters(selectedStatuses, newBOMTypes);
  };
  
  const updateFilters = (statuses: string[], bomTypes: string[]) => {
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    
    if (statuses.length > 0) {
      newParams.set('status', statuses.join(','));
    } else {
      newParams.delete('status');
    }
    
    if (bomTypes.length > 0) {
      newParams.set('bomType', bomTypes.join(','));
    } else {
      newParams.delete('bomType');
    }
    
    setSearchParams(newParams);
    
    // Notify parent
    onFilterChange({ statuses, bomTypes });
  };
  
  const handleClearAll = () => {
    setSelectedStatuses([]);
    setSelectedBOMTypes([]);
    updateFilters([], []);
  };
  
  const activeFilterCount = selectedStatuses.length + selectedBOMTypes.length;
  
  return (
    <div className="bom-filter-panel">
      <div className="filter-header">
        <h3>筛选条件</h3>
        {activeFilterCount > 0 && (
          <button onClick={handleClearAll} className="clear-all-btn">
            清除全部 ({activeFilterCount})
          </button>
        )}
      </div>
      
      <div className="filter-section">
        <h4>状态</h4>
        {STATUS_OPTIONS.map(option => (
          <label key={option.value} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selectedStatuses.includes(option.value)}
              onChange={(e) => handleStatusChange(option.value, e.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      
      <div className="filter-section">
        <h4>BOM类型</h4>
        {BOM_TYPE_OPTIONS.map(option => (
          <label key={option.value} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selectedBOMTypes.includes(option.value)}
              onChange={(e) => handleBOMTypeChange(option.value, e.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

**Design Rationale**:
- Use URL search params for filter state persistence
- Initialize filter state from URL on mount
- Update URL when filters change (enables bookmarking/sharing)
- Show active filter count for user awareness
- Provide clear all functionality

#### 6.2 BOM List Page Integration

**File**: `src/features/product-structure/pages/BOMListPage.tsx`

```typescript
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBOMList } from '../hooks/use-bom-queries';
import { BOMFilterPanel } from '../components/BOMFilterPanel';

export function BOMListPage() {
  const [searchParams] = useSearchParams();
  
  // Parse filters from URL
  const filters = useMemo(() => {
    const statusParam = searchParams.get('status');
    const bomTypeParam = searchParams.get('bomType');
    
    return {
      statuses: statusParam ? statusParam.split(',') : undefined,
      bomTypes: bomTypeParam ? bomTypeParam.split(',') : undefined,
    };
  }, [searchParams]);
  
  // Fetch BOM list with filters
  const { data, isLoading, error } = useBOMList(filters);
  
  const handleFilterChange = (newFilters: { statuses: string[]; bomTypes: string[] }) => {
    // Filter state is managed by URL params, so this is just for side effects if needed
    console.log('Filters changed:', newFilters);
  };
  
  if (error) {
    return (
      <div className="error-message">
        <p>加载BOM列表失败: {error.message}</p>
        <button onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }
  
  return (
    <div className="bom-list-page">
      <div className="page-header">
        <h1>BOM列表</h1>
      </div>
      
      <div className="page-content">
        <aside className="filter-sidebar">
          <BOMFilterPanel onFilterChange={handleFilterChange} />
        </aside>
        
        <main className="bom-list-main">
          {isLoading ? (
            <div className="loading-spinner">加载中...</div>
          ) : data?.items.length === 0 ? (
            <div className="empty-state">
              <p>没有找到符合条件的BOM</p>
              {(filters.statuses || filters.bomTypes) && (
                <p>请尝试调整筛选条件</p>
              )}
            </div>
          ) : (
            <>
              <div className="bom-list-header">
                <span>共 {data?.total} 条记录</span>
              </div>
              <div className="bom-list-items">
                {data?.items.map(bom => (
                  <BOMListItem key={bom.id} bom={bom} />
                ))}
              </div>
              <Pagination
                current={data?.page || 1}
                total={data?.totalPages || 1}
                pageSize={data?.pageSize || 20}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

**Design Rationale**:
- Use URL as single source of truth for filter state
- Parse filters from URL and pass to query hook
- Automatic refetch when URL params change
- Show appropriate empty states and error messages
- Maintain existing pagination behavior

## Data Flow

### Query Flow with Filters

```
User selects filters in UI
    ↓
Filter state updates URL params
    ↓
URL change triggers React Query refetch
    ↓
Frontend service converts arrays to comma-separated strings
    ↓
HTTP GET request with query parameters
    ↓
Backend handler extracts query parameters
    ↓
Backend service validates and parses filters
    ↓
GORM builds SQL query with WHERE IN clauses
    ↓
PostgreSQL executes query using indexes
    ↓
Results returned through layers
    ↓
UI displays filtered BOM list
```

## Error Handling

### Validation Errors

**Backend Response** (400 Bad Request):
```json
{
  "error": "invalid status values: INVALID, UNKNOWN. Valid values are: DRAFT, REVIEWING, APPROVED, VALIDATING, RELEASED, OBSOLETE"
}
```

**Frontend Handling**:
- Display error message in toast notification
- Keep filter UI in current state
- Allow user to correct invalid selections

### Empty Results

**Backend Response** (200 OK):
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

**Frontend Handling**:
- Display "No BOMs match the criteria" message
- Suggest adjusting filters
- Show "Clear All" button prominently

## Performance Considerations

### Database Query Optimization

1. **Index Usage**:
   - Single-column indexes for individual filters
   - Composite index for combined filters
   - PostgreSQL query planner will choose optimal index

2. **Query Execution**:
   - Use `IN` clause instead of multiple `OR` conditions
   - Single database query for all filters
   - Count and data fetch in separate queries for pagination

3. **Expected Performance**:
   - Unfiltered query: ~50ms for 10,000 records
   - Filtered query: ~55ms for 10,000 records (10% overhead)
   - Index creation: ~100ms (one-time cost)

### Frontend Performance

1. **React Query Caching**:
   - Cache filtered results for 30 seconds
   - Separate cache entries for different filter combinations
   - Automatic background refetch on stale data

2. **URL State Management**:
   - Minimal re-renders when filters change
   - URL updates don't trigger full page reload
   - Browser back/forward navigation works correctly

## Testing Strategy

### Backend Unit Tests

**File**: `server/services/bom_service_test.go`

```go
func TestParseAndValidateStatuses(t *testing.T) {
    // Valid single status
    // Valid multiple statuses
    // Invalid status
    // Mixed valid and invalid
    // Empty string
    // Whitespace handling
}

func TestParseAndValidateBOMTypes(t *testing.T) {
    // Valid single type
    // Valid multiple types
    // Invalid type
    // Mixed valid and invalid
    // Empty string
}

func TestListBOMs_WithFilters(t *testing.T) {
    // Filter by single status
    // Filter by multiple statuses
    // Filter by single BOM type
    // Filter by multiple BOM types
    // Filter by both status and BOM type
    // No filters (backward compatibility)
}
```

### Backend Integration Tests

**File**: `server/handlers/bom_test.go`

```go
func TestBOMHandler_ListBOMs_WithFilters(t *testing.T) {
    // Valid status filter
    // Valid BOM type filter
    // Invalid status returns 400
    // Invalid BOM type returns 400
    // Combined filters
    // Empty results
}
```

### Frontend Unit Tests

**File**: `src/features/product-structure/services/bom-service.test.ts`

```typescript
describe('bomService.listBOMs', () => {
  it('should include status filter in query params');
  it('should include bomType filter in query params');
  it('should handle multiple statuses');
  it('should handle multiple BOM types');
  it('should work without filters');
});
```

### Frontend Component Tests

**File**: `src/features/product-structure/components/BOMFilterPanel.test.tsx`

```typescript
describe('BOMFilterPanel', () => {
  it('should render all status options');
  it('should render all BOM type options');
  it('should update URL when filter selected');
  it('should initialize from URL params');
  it('should clear all filters');
  it('should show active filter count');
});
```

## Migration Plan

### Phase 1: Backend Implementation
1. Add database indexes
2. Update BOMListQuery structure
3. Implement validation functions
4. Enhance ListBOMs service method
5. Update HTTP handler
6. Write backend tests

### Phase 2: Frontend Implementation
1. Update BOM service interface
2. Enhance React Query hook
3. Create filter panel component
4. Integrate into BOM list page
5. Write frontend tests

### Phase 3: Testing & Deployment
1. Run all unit tests
2. Run integration tests
3. Manual testing of UI
4. Performance testing with large datasets
5. Deploy to staging
6. User acceptance testing
7. Deploy to production

## Backward Compatibility

### API Compatibility

**Before Enhancement**:
```
GET /api/boms?productId=123&page=1&pageSize=20
```

**After Enhancement** (same request still works):
```
GET /api/boms?productId=123&page=1&pageSize=20
```

**New Capabilities**:
```
GET /api/boms?status=DRAFT,RELEASED&bomType=EBOM&page=1&pageSize=20
```

### Database Compatibility

- Index creation is non-breaking
- Existing queries continue to work
- No schema changes to existing columns
- Rollback is safe (just drop indexes)

## Security Considerations

1. **Input Validation**:
   - Validate all filter values against whitelist
   - Prevent SQL injection through parameterized queries
   - Sanitize error messages (don't expose internal details)

2. **Authorization**:
   - Maintain existing BOM access control
   - Filters don't bypass permission checks
   - Users only see BOMs they have access to

3. **Rate Limiting**:
   - Apply existing rate limits to filtered queries
   - No special treatment for filter parameters

## Monitoring & Observability

### Metrics to Track

1. **Query Performance**:
   - Average query execution time with filters
   - 95th percentile query time
   - Index usage statistics

2. **Usage Patterns**:
   - Most common filter combinations
   - Filter usage frequency
   - Empty result rate

3. **Error Rates**:
   - Validation error frequency
   - Which invalid values are most common

### Logging

```go
log.Info("BOM list query",
    "statuses", statuses,
    "bomTypes", bomTypes,
    "resultCount", len(boms),
    "executionTime", duration,
)
```

## Documentation Updates

### API Documentation

Add to OpenAPI/Swagger spec:

```yaml
/api/boms:
  get:
    parameters:
      - name: status
        in: query
        description: Comma-separated list of status values to filter by
        schema:
          type: string
          example: "DRAFT,RELEASED"
      - name: bomType
        in: query
        description: Comma-separated list of BOM types to filter by
        schema:
          type: string
          example: "EBOM"
    responses:
      200:
        description: Successful response
      400:
        description: Invalid filter values
```

### User Documentation

Add to user guide:
- How to use filter panel
- Explanation of each status
- Explanation of BOM types
- How to bookmark filtered views

## Future Enhancements

### Potential Improvements

1. **Advanced Filters**:
   - Date range filtering (created_at, updated_at)
   - Text search in BOM name/description
   - Filter by creator/owner

2. **Saved Filters**:
   - Allow users to save filter presets
   - Quick access to common filter combinations

3. **Filter Analytics**:
   - Show result count before applying filter
   - Suggest popular filter combinations

4. **Export Filtered Results**:
   - Export filtered BOM list to Excel/CSV
   - Include filter criteria in export

## Conclusion

This design provides a comprehensive solution for BOM query filtering that:
- Maintains backward compatibility
- Follows existing architectural patterns
- Provides excellent performance through database indexes
- Offers a user-friendly filter interface
- Includes proper validation and error handling
- Is fully testable and maintainable

The implementation can be completed in phases, with each phase delivering incremental value while maintaining system stability.
