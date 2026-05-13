-- Migration: Add unique constraint for BOM version sequence
-- Created: 2026-05-13
-- Purpose: Prevent race condition in version sequence generation
-- Related: BOM Audit & History Security Audit - Risk #10 (Version Sequence Race)

-- Add unique constraint on (bom_id, version_sequence)
-- This ensures no two versions can have the same sequence number for the same BOM
ALTER TABLE bom_version_snapshots 
ADD CONSTRAINT uk_bom_version_sequence 
UNIQUE (bom_id, version_sequence);

-- Benefits:
-- - Prevents concurrent inserts from creating duplicate sequence numbers
-- - Works in conjunction with FOR UPDATE lock in application code
-- - Database-level guarantee of sequence uniqueness

-- Rollback migration (uncomment to rollback)
-- ALTER TABLE bom_version_snapshots DROP CONSTRAINT uk_bom_version_sequence;
