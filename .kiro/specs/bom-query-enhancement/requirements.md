# Requirements Document

## Introduction

This document specifies the requirements for enhancing the BOM (Bill of Materials) list query functionality by adding filtering capabilities for Status and BOMType parameters. Currently, the BOM query system lacks these critical filtering options, forcing users to manually search through complete lists as data volume grows. This enhancement will enable efficient querying of specific BOM types and statuses, which is essential for an industrial ERP system.

## Glossary

- **BOM_Query_Service**: The backend service responsible for retrieving BOM lists from the database
- **BOM_API_Handler**: The backend HTTP handler that processes BOM list requests
- **BOM_Frontend_Service**: The frontend TypeScript service layer that calls BOM APIs
- **BOM_List_Query**: The data structure containing query parameters for BOM list retrieval
- **Status**: The lifecycle state of a BOM (DRAFT, REVIEWING, APPROVED, VALIDATING, RELEASED, OBSOLETE)
- **BOMType**: The classification of a BOM (EBOM for engineering BOM, MBOM for manufacturing BOM)
- **Query_Parameter**: An optional filter value passed in the HTTP request to narrow down results
- **Database_Index**: A database structure that improves query performance for filtered columns

## Requirements

### Requirement 1: Backend Query Parameter Support

**User Story:** As a backend developer, I want the BOMListQuery structure to accept status and bomType filter parameters, so that the service layer can filter BOM records based on these criteria.

#### Acceptance Criteria

1. THE BOM_List_Query SHALL include an optional Status field that accepts a comma-separated list of status values
2. THE BOM_List_Query SHALL include an optional BOMType field that accepts a comma-separated list of BOM type values
3. WHEN Status is empty or null, THE BOM_Query_Service SHALL return BOMs of all statuses
4. WHEN BOMType is empty or null, THE BOM_Query_Service SHALL return BOMs of all types
5. WHEN Status contains multiple values, THE BOM_Query_Service SHALL return BOMs matching any of the specified statuses
6. WHEN BOMType contains multiple values, THE BOM_Query_Service SHALL return BOMs matching any of the specified types
7. FOR ALL valid Status values (DRAFT, REVIEWING, APPROVED, VALIDATING, RELEASED, OBSOLETE), THE BOM_Query_Service SHALL correctly filter records
8. FOR ALL valid BOMType values (EBOM, MBOM), THE BOM_Query_Service SHALL correctly filter records

### Requirement 2: Backend Query Validation

**User Story:** As a backend developer, I want invalid filter values to be rejected with clear error messages, so that API consumers receive actionable feedback.

#### Acceptance Criteria

1. WHEN Status contains an invalid value, THE BOM_API_Handler SHALL return a 400 Bad Request error with a descriptive message
2. WHEN BOMType contains an invalid value, THE BOM_API_Handler SHALL return a 400 Bad Request error with a descriptive message
3. THE error message SHALL specify which value was invalid and list the valid options
4. WHEN both Status and BOMType contain invalid values, THE BOM_API_Handler SHALL report all validation errors in a single response

### Requirement 3: Backend Query Performance

**User Story:** As a system administrator, I want BOM list queries with filters to execute efficiently, so that response times remain acceptable as data volume grows.

#### Acceptance Criteria

1. THE BOM_Query_Service SHALL use database indexes on the status column for filtering
2. THE BOM_Query_Service SHALL use database indexes on the bomType column for filtering
3. WHEN filtering by Status and BOMType together, THE BOM_Query_Service SHALL execute in a single database query
4. THE query execution time SHALL NOT increase by more than 10% compared to unfiltered queries for datasets up to 10,000 records

### Requirement 4: Backend API Endpoint Enhancement

**User Story:** As a frontend developer, I want to pass status and bomType query parameters in the GET request, so that I can retrieve filtered BOM lists.

#### Acceptance Criteria

1. THE BOM_API_Handler SHALL accept an optional "status" query parameter containing comma-separated status values
2. THE BOM_API_Handler SHALL accept an optional "bomType" query parameter containing comma-separated BOM type values
3. WHEN status parameter is "DRAFT,RELEASED", THE BOM_API_Handler SHALL return only BOMs with status DRAFT or RELEASED
4. WHEN bomType parameter is "EBOM", THE BOM_API_Handler SHALL return only BOMs with type EBOM
5. WHEN both status and bomType parameters are provided, THE BOM_API_Handler SHALL apply both filters using AND logic
6. THE BOM_API_Handler SHALL maintain backward compatibility by returning all BOMs when no filter parameters are provided

### Requirement 5: Frontend Service Layer Enhancement

**User Story:** As a frontend developer, I want the BOM service to support filter parameters, so that I can request filtered BOM lists from the backend.

#### Acceptance Criteria

1. THE BOM_Frontend_Service SHALL accept an optional statuses parameter as an array of status strings
2. THE BOM_Frontend_Service SHALL accept an optional bomTypes parameter as an array of BOM type strings
3. WHEN statuses array is provided, THE BOM_Frontend_Service SHALL convert it to a comma-separated query parameter
4. WHEN bomTypes array is provided, THE BOM_Frontend_Service SHALL convert it to a comma-separated query parameter
5. THE BOM_Frontend_Service SHALL construct the correct API URL with query parameters
6. WHEN both filter parameters are empty or undefined, THE BOM_Frontend_Service SHALL call the API without filter query parameters

### Requirement 6: Frontend Query Hook Enhancement

**User Story:** As a frontend developer, I want the BOM query hook to accept filter parameters, so that React components can easily fetch filtered BOM lists.

#### Acceptance Criteria

1. THE BOM query hook SHALL accept an optional statuses parameter
2. THE BOM query hook SHALL accept an optional bomTypes parameter
3. WHEN filter parameters change, THE BOM query hook SHALL automatically refetch the BOM list
4. THE BOM query hook SHALL maintain TanStack Query caching behavior with filter-specific cache keys
5. WHEN filter parameters are removed, THE BOM query hook SHALL fetch the unfiltered list

### Requirement 7: Frontend UI Filter Component

**User Story:** As a user, I want a filter UI component on the BOM list page, so that I can easily select which statuses and types to display.

#### Acceptance Criteria

1. THE BOM list page SHALL display a filter panel with status and BOM type options
2. THE status filter SHALL allow multiple selection from all valid status values
3. THE BOM type filter SHALL allow multiple selection from EBOM and MBOM
4. WHEN a user selects filter options, THE BOM list SHALL update to show only matching records
5. THE filter panel SHALL display the count of currently applied filters
6. THE filter panel SHALL include a "Clear All" button that removes all filters
7. WHEN filters are applied, THE URL query parameters SHALL reflect the current filter state for bookmarking and sharing

### Requirement 8: Frontend Filter State Persistence

**User Story:** As a user, I want my filter selections to persist when I navigate away and return to the BOM list page, so that I don't have to reapply filters repeatedly.

#### Acceptance Criteria

1. WHEN a user applies filters, THE filter state SHALL be stored in the URL query parameters
2. WHEN a user navigates to the BOM list page with filter query parameters, THE filters SHALL be automatically applied
3. WHEN a user refreshes the page, THE filter state SHALL be preserved
4. THE filter state SHALL be cleared when the user explicitly clicks "Clear All"

### Requirement 9: Database Migration for Indexes

**User Story:** As a database administrator, I want database indexes on status and bomType columns, so that filtered queries execute efficiently.

#### Acceptance Criteria

1. THE database migration SHALL create an index on the boms.status column
2. THE database migration SHALL create an index on the boms.bom_type column
3. THE migration SHALL be reversible for rollback scenarios
4. THE migration SHALL execute without locking the boms table for extended periods

### Requirement 10: API Documentation

**User Story:** As an API consumer, I want clear documentation of the new query parameters, so that I can correctly integrate with the enhanced BOM list endpoint.

#### Acceptance Criteria

1. THE API documentation SHALL describe the status query parameter with examples
2. THE API documentation SHALL describe the bomType query parameter with examples
3. THE API documentation SHALL list all valid status values
4. THE API documentation SHALL list all valid BOM type values
5. THE API documentation SHALL provide example requests with single and multiple filter values
6. THE API documentation SHALL document the error responses for invalid filter values

### Requirement 11: Backward Compatibility

**User Story:** As a system maintainer, I want the enhanced query functionality to be fully backward compatible, so that existing API consumers continue to work without modification.

#### Acceptance Criteria

1. WHEN no filter parameters are provided, THE BOM_API_Handler SHALL return all BOMs as before
2. THE response structure SHALL remain unchanged regardless of filter parameters
3. THE pagination behavior SHALL work correctly with filtered results
4. THE existing productId filter SHALL continue to work and combine correctly with new filters using AND logic

### Requirement 12: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when filters produce no results or when errors occur, so that I understand what happened and how to proceed.

#### Acceptance Criteria

1. WHEN filters produce zero results, THE UI SHALL display a message indicating no BOMs match the criteria
2. WHEN a backend error occurs, THE UI SHALL display a user-friendly error message
3. WHEN network errors occur, THE UI SHALL display a retry option
4. THE loading state SHALL be clearly indicated while fetching filtered results
