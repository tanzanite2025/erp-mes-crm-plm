-- Migration: Add composite index for BOM items sort order optimization
-- Created: 2026-05-13
-- Purpose: Improve query performance for large BOM item lists (1000+ rows)
-- Related: BOM Security Audit - Risk #6 (Performance)

-- Add composite index on (bom_id, sort_order) for efficient ordered retrieval
-- This index supports the common query pattern:
--   SELECT * FROM bom_items WHERE bom_id = ? ORDER BY sort_order ASC
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id_sort_order 
ON bom_items(bom_id, sort_order);

-- Performance Impact:
-- - Before: O(n log n) sorting in memory for 1000+ rows
-- - After:  O(n) index scan with pre-sorted results
-- - Expected improvement: 5-10x faster for large BOMs

-- Rollback migration (uncomment to rollback)
-- DROP INDEX IF EXISTS idx_bom_items_bom_id_sort_order;
