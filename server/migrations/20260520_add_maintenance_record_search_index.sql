-- 添加全文搜索向量列
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 创建触发器函数,自动更新搜索向量
CREATE OR REPLACE FUNCTION maintenance_records_search_vector_update() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.asset_sn, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器(如果存在)
DROP TRIGGER IF EXISTS maintenance_records_search_vector_trigger ON maintenance_records;

-- 创建触发器
CREATE TRIGGER maintenance_records_search_vector_trigger
BEFORE INSERT OR UPDATE ON maintenance_records
FOR EACH ROW
EXECUTE FUNCTION maintenance_records_search_vector_update();

-- 为现有数据生成搜索向量
UPDATE maintenance_records SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(asset_sn, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;

-- 创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_maintenance_records_search_vector 
ON maintenance_records USING gin(search_vector);

-- 创建复合索引优化常用查询
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status_created 
ON maintenance_records(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_asset 
ON maintenance_records(asset_type, asset_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_priority 
ON maintenance_records(priority);

-- 创建类型索引
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type 
ON maintenance_records(type);
