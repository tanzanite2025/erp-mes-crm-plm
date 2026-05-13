# Tasks

## 1. Database Migration for Query Indexes

Create database migration to add indexes on status and bom_type columns for efficient filtering.

- Create migration file with index creation SQL
- Add index on boms.status column
- Add index on boms.bom_type column
- Add composite index on (status, bom_type)
- Include rollback commands
- Test migration execution
- Verify index creation in database

## 2. Backend Data Structure Enhancement

Update BOMListQuery structure to support status and bomType filter parameters.

- Add Status field to BOMListQuery struct
- Add BOMType field to BOMListQuery struct
- Add JSON tags with omitempty
- Update struct documentation

## 3. Backend Validation Functions [depends: 2]

Implement validation functions for status and BOM type filter values.

- Define ValidBOMStatuses constant array
- Define ValidBOMTypes constant array
- Implement parseAndValidateStatuses function
- Implement parseAndValidateBOMTypes function
- Implement contains helper function
- Add comprehensive error messages with valid options
- Handle whitespace and case normalization

## 4. Backend Service Layer Query Building [depends: 3]

Enhance BOM service ListBOMs method to build filtered queries.

- Call parseAndValidateStatuses for status filter
- Call parseAndValidateBOMTypes for BOM type filter
- Add WHERE IN clause for status filtering
- Add WHERE IN clause for BOM type filtering
- Ensure filters combine with AND logic
- Maintain existing productId filter compatibility
- Preserve pagination and sorting behavior

## 5. Backend API Handler Enhancement [depends: 4]

Update HTTP handler to extract and pass filter query parameters.

- Extract status query parameter using c.Query()
- Extract bomType query parameter using c.Query()
- Pass parameters to service layer
- Handle validation errors with 400 status
- Distinguish validation errors from server errors
- Maintain existing parameter parsing patterns

## 6. Backend Unit Tests [depends: 5]

Write comprehensive unit tests for validation and query building.

- Test parseAndValidateStatuses with valid single status
- Test parseAndValidateStatuses with valid multiple statuses
- Test parseAndValidateStatuses with invalid status
- Test parseAndValidateStatuses with mixed valid/invalid
- Test parseAndValidateStatuses with empty string
- Test parseAndValidateBOMTypes with valid types
- Test parseAndValidateBOMTypes with invalid types
- Test ListBOMs with status filter
- Test ListBOMs with BOM type filter
- Test ListBOMs with combined filters
- Test ListBOMs without filters (backward compatibility)

## 7. Backend Integration Tests [depends: 6]

Write integration tests for HTTP handler with filters.

- Test GET /api/boms with valid status filter
- Test GET /api/boms with valid bomType filter
- Test GET /api/boms with invalid status returns 400
- Test GET /api/boms with invalid bomType returns 400
- Test GET /api/boms with combined filters
- Test GET /api/boms with no filters (backward compatibility)
- Test GET /api/boms with filters returning empty results

## 8. Frontend Service Interface Enhancement

Update BOM service TypeScript interface to support filter parameters.

- Add statuses field to BOMListQueryParams interface
- Add bomTypes field to BOMListQueryParams interface
- Update listBOMs method to accept new parameters
- Convert statuses array to comma-separated string
- Convert bomTypes array to comma-separated string
- Use URLSearchParams for proper encoding
- Maintain error handling patterns

## 9. Frontend React Query Hook Enhancement [depends: 8]

Update useBOMList hook to accept and handle filter parameters.

- Add statuses field to UseBOMListOptions interface
- Add bomTypes field to UseBOMListOptions interface
- Include filter options in queryKey for cache invalidation
- Pass filter options to bomService.listBOMs
- Maintain existing staleTime and gcTime settings
- Ensure automatic refetch on filter changes

## 10. Frontend Filter Panel Component

Create BOMFilterPanel component for user filter selection.

- Create BOMFilterPanel.tsx component file
- Define STATUS_OPTIONS with Chinese labels
- Define BOM_TYPE_OPTIONS with Chinese labels
- Initialize filter state from URL search params
- Implement status checkbox change handler
- Implement BOM type checkbox change handler
- Update URL params when filters change
- Implement clear all filters functionality
- Display active filter count
- Add proper TypeScript types
- Style filter panel with CSS

## 11. Frontend BOM List Page Integration [depends: 9, 10]

Integrate filter panel into BOM list page and connect to query hook.

- Import BOMFilterPanel component
- Parse filters from URL search params
- Pass filters to useBOMList hook
- Render filter panel in sidebar
- Handle loading state
- Handle error state with retry button
- Handle empty results state
- Display result count
- Maintain existing pagination
- Ensure URL updates trigger refetch

## 12. Frontend Service Unit Tests [depends: 8]

Write unit tests for BOM service filter functionality.

- Test listBOMs includes status filter in query params
- Test listBOMs includes bomType filter in query params
- Test listBOMs handles multiple statuses
- Test listBOMs handles multiple BOM types
- Test listBOMs works without filters
- Test listBOMs properly encodes query parameters

## 13. Frontend Component Unit Tests [depends: 10]

Write unit tests for BOMFilterPanel component.

- Test component renders all status options
- Test component renders all BOM type options
- Test component updates URL when filter selected
- Test component initializes from URL params
- Test clear all filters functionality
- Test active filter count display
- Test checkbox state management
