-- 删除索引
DROP INDEX IF EXISTS idx_maintenance_records_search_vector;
DROP INDEX IF EXISTS idx_maintenance_records_status_created;
DROP INDEX IF EXISTS idx_maintenance_records_asset;
DROP INDEX IF EXISTS idx_maintenance_records_priority;
DROP INDEX IF EXISTS idx_maintenance_records_type;

-- 删除触发器
DROP TRIGGER IF EXISTS maintenance_records_search_vector_trigger ON maintenance_records;

-- 删除触发器函数
DROP FUNCTION IF EXISTS maintenance_records_search_vector_update();

-- 删除搜索向量列
ALTER TABLE maintenance_records DROP COLUMN IF EXISTS search_vector;
