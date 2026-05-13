# Requirements Document

## Introduction

This document specifies requirements for eliminating deep validation redundancy in the BOM (Bill of Materials) system. The system currently suffers from two critical architectural issues: (1) duplicate tree construction logic between the builder layer and adapter layer, creating inconsistency risks and maintenance burden, and (2) missing frontend dirty checking for tree structure changes, resulting in poor audit trail granularity. This feature will establish a single source of truth for tree construction rules and implement proper SDRTS-based change tracking for BOM tree modifications.

## Glossary

- **BOM_System**: The Bill of Materials management system responsible for product structure definition and tree representation
- **Builder_Layer**: The `bom-workspace-branch-relation-builder.ts` module containing `buildSyntheticBOMWorkspaceBranchRelations` function
- **Adapter_Layer**: The module responsible for parsing RelationSidecar and converting between storage format and workspace format
- **RelationSidecar**: The JSON structure stored in the database containing BOM tree relationship data using parent-children protocol
- **SDRTS_Protocol**: Systematic Delta Reactive Tracking System - the standardized change tracking protocol using DeltaSet and DeltaPayload
- **DeltaSet**: A record of field-level changes mapping dot-notation paths to DeltaItem objects containing old and new values
- **Tree_Construction_Rule**: The logic that maps sectionCode to nodeId (e.g., `section:${sectionCode}`)
- **Frontend_Dirty_Check**: Client-side change detection mechanism that identifies modified fields before submission
- **Audit_Log**: Backend system recording change history with granular field-level tracking

## Requirements

### Requirement 1: Eliminate Builder Layer Tree Construction Redundancy

**User Story:** As a system architect, I want tree construction logic centralized in the adapter layer, so that there is a single source of truth and no risk of inconsistent mapping rules.

#### Acceptance Criteria

1. THE Adapter_Layer SHALL provide a canonical function for mapping sectionCode to nodeId
2. THE Builder_Layer SHALL delegate all nodeId generation to the Adapter_Layer canonical function
3. WHEN the Builder_Layer constructs branch relations, THE BOM_System SHALL use the same nodeId mapping rules as the Adapter_Layer parsing logic
4. THE BOM_System SHALL NOT contain duplicate implementations of the `section:${sectionCode}` pattern
5. FOR ALL valid sectionCode values, applying the adapter's parsing function then the builder's construction function SHALL produce consistent nodeId values (round-trip property)

### Requirement 2: Implement Frontend SDRTS Delta Tracking for BOM Tree

**User Story:** As a developer, I want the frontend to track tree structure changes using SDRTS protocol, so that only modified fields are submitted and audit logs show precise changes.

#### Acceptance Criteria

1. WHEN a user modifies BOM tree structure, THE BOM_System SHALL capture changes as a DeltaSet
2. WHEN saving BOM changes, THE BOM_System SHALL submit a DeltaPayload containing only modified fields
3. THE BOM_System SHALL track changes to RelationSidecar.protocolDraft.rootChildren
4. THE BOM_System SHALL track changes to RelationSidecar.protocolDraft.branchNodes
5. THE BOM_System SHALL track changes to RelationSidecar.protocolDraft.itemNodes
6. THE BOM_System SHALL include version number in DeltaPayload metadata for optimistic locking

### Requirement 3: Parse and Pretty-Print RelationSidecar

**User Story:** As a developer, I want reliable parsing and serialization of RelationSidecar, so that tree structure data integrity is maintained through save/load cycles.

#### Acceptance Criteria

1. WHEN a valid RelationSidecar is provided, THE Adapter_Layer SHALL parse it into a workspace tree structure
2. WHEN an invalid RelationSidecar is provided, THE Adapter_Layer SHALL return a descriptive error message
3. THE Adapter_Layer SHALL serialize workspace tree structures back into valid RelationSidecar format
4. FOR ALL valid workspace tree structures, parsing then serializing then parsing SHALL produce an equivalent structure (round-trip property)

### Requirement 4: Enhance Audit Log Granularity for Tree Changes

**User Story:** As a system administrator, I want audit logs to show specific tree structure changes, so that I can understand exactly what was modified in each save operation.

#### Acceptance Criteria

1. WHEN BOM tree structure is saved with changes, THE Audit_Log SHALL record field-level modifications
2. THE Audit_Log SHALL distinguish between rootChildren changes, branchNodes changes, and itemNodes changes
3. THE Audit_Log SHALL NOT record generic "Sidecar JSON changed" messages when specific field changes are available
4. WHEN no tree structure changes exist, THE Audit_Log SHALL NOT create unnecessary change records
5. THE Audit_Log SHALL include old and new values for each modified field

### Requirement 5: Validate Tree Construction Consistency

**User Story:** As a quality engineer, I want automated validation that builder and adapter use consistent rules, so that tree construction bugs are caught early.

#### Acceptance Criteria

1. THE BOM_System SHALL provide a validation function that compares builder output with adapter parsing output
2. WHEN validation detects inconsistent nodeId mapping, THE BOM_System SHALL return an error with details of the mismatch
3. THE BOM_System SHALL validate consistency for all supported sectionCode values
4. IF builder and adapter produce different nodeId values for the same sectionCode, THEN THE BOM_System SHALL fail validation with a descriptive error message

### Requirement 6: Maintain Backward Compatibility During Migration

**User Story:** As a product owner, I want existing BOM data to remain functional during the refactoring, so that users experience no disruption.

#### Acceptance Criteria

1. THE BOM_System SHALL continue to load existing RelationSidecar data without modification
2. WHEN legacy BOM data is saved, THE BOM_System SHALL migrate it to the new tree construction approach
3. THE BOM_System SHALL preserve all existing tree relationships during migration
4. WHEN migration fails validation, THE BOM_System SHALL log the error and prevent data corruption
5. THE BOM_System SHALL support rollback to previous tree construction logic if critical issues are detected

### Requirement 7: Optimize Frontend Submission Payload Size

**User Story:** As a performance engineer, I want BOM save operations to transmit only changed data, so that network usage and save latency are minimized.

#### Acceptance Criteria

1. WHEN saving BOM with no tree structure changes, THE BOM_System SHALL NOT include RelationSidecar in the payload
2. WHEN saving BOM with partial tree changes, THE BOM_System SHALL include only the modified portions of RelationSidecar
3. THE BOM_System SHALL reduce payload size by at least 70% for typical edit operations affecting less than 30% of tree nodes
4. THE BOM_System SHALL measure and log payload size reduction metrics

### Requirement 8: Handle Concurrent Tree Modifications

**User Story:** As a concurrent user, I want the system to detect conflicting tree modifications, so that my changes don't overwrite others' work.

#### Acceptance Criteria

1. WHEN two users modify the same BOM tree concurrently, THE BOM_System SHALL detect the version conflict
2. WHEN a version conflict is detected, THE BOM_System SHALL reject the second save with a 409 Conflict status
3. THE BOM_System SHALL include the current version number in the conflict error response
4. THE BOM_System SHALL preserve the first user's changes and require the second user to refresh and reapply changes

