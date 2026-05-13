-- Migration: Add indexes for BOM query filtering
-- Created: 2025-01-12
-- Purpose: Improve query performance for status and bom_type filtering

-- Add index on status column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_boms_status ON boms(status);

-- Add index on bom_type column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_boms_bom_type ON boms(bom_type);

-- Add composite index for combined filtering (most common use case)
CREATE INDEX IF NOT EXISTS idx_boms_status_bom_type ON boms(status, bom_type);

-- Rollback migration (uncomment to rollback)
-- DROP INDEX IF EXISTS idx_boms_status;
-- DROP INDEX IF EXISTS idx_boms_bom_type;
-- DROP INDEX IF EXISTS idx_boms_status_bom_type;
