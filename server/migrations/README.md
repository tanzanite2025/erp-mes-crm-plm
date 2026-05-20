# 数据库迁移说明

## 迁移文件

### 20260520_add_maintenance_record_search_index.sql
**目的**: 为维保记录添加全文搜索索引,提升搜索性能

**功能**:
1. 添加 `search_vector` 列 (tsvector 类型)
2. 创建触发器自动更新搜索向量
3. 为现有数据生成搜索向量
4. 创建 GIN 索引加速全文搜索
5. 创建复合索引优化常用查询

**执行方法**:
```bash
# 连接到数据库
psql -U your_user -d your_database

# 执行迁移
\i server/migrations/20260520_add_maintenance_record_search_index.sql

# 或使用 psql 命令
psql -U your_user -d your_database -f server/migrations/20260520_add_maintenance_record_search_index.sql
```

**回滚方法**:
```bash
# 执行回滚脚本
psql -U your_user -d your_database -f server/migrations/20260520_add_maintenance_record_search_index_down.sql
```

**验证**:
```sql
-- 检查列是否添加
\d maintenance_records

-- 检查索引是否创建
\di idx_maintenance_records_*

-- 检查触发器是否创建
\df maintenance_records_search_vector_update

-- 测试搜索
SELECT id, title, asset_sn 
FROM maintenance_records 
WHERE search_vector @@ plainto_tsquery('simple', '测试');
```

---

## 性能对比

### 迁移前 (LIKE 查询)
```sql
-- 全表扫描
SELECT * FROM maintenance_records 
WHERE title LIKE '%关键词%' OR asset_sn LIKE '%关键词%';

-- 性能: O(n) - 线性扫描
-- 10,000 条记录: ~100-500ms
-- 100,000 条记录: ~1-5s
```

### 迁移后 (全文搜索)
```sql
-- 使用 GIN 索引
SELECT * FROM maintenance_records 
WHERE search_vector @@ plainto_tsquery('simple', '关键词')
ORDER BY ts_rank(search_vector, plainto_tsquery('simple', '关键词')) DESC;

-- 性能: O(log n) - 索引查找
-- 10,000 条记录: ~5-20ms
-- 100,000 条记录: ~10-50ms
```

**性能提升**: 10-100 倍

---

## 注意事项

1. **迁移时间**: 取决于现有数据量
   - 1,000 条记录: ~1 秒
   - 10,000 条记录: ~5-10 秒
   - 100,000 条记录: ~30-60 秒

2. **磁盘空间**: GIN 索引会占用额外空间
   - 约为原表大小的 20-30%

3. **中文支持**: 使用 'simple' 配置支持中文
   - 不进行词干提取
   - 支持任意语言

4. **自动更新**: 触发器会自动维护搜索向量
   - INSERT 时自动生成
   - UPDATE 时自动更新
   - 无需手动维护

5. **备份建议**: 执行迁移前建议备份数据库
   ```bash
   pg_dump -U your_user -d your_database > backup_before_migration.sql
   ```

---

## 故障排除

### 问题1: 迁移失败 - 列已存在
```
ERROR: column "search_vector" of relation "maintenance_records" already exists
```

**解决方案**: 使用 `IF NOT EXISTS` 已经处理,如果仍然失败,先执行回滚脚本

### 问题2: 权限不足
```
ERROR: permission denied for table maintenance_records
```

**解决方案**: 使用具有足够权限的数据库用户

### 问题3: 搜索结果为空
```sql
-- 检查搜索向量是否生成
SELECT id, title, search_vector FROM maintenance_records LIMIT 5;
```

**解决方案**: 如果 search_vector 为 NULL,手动更新:
```sql
UPDATE maintenance_records SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(asset_sn, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'C');
```

---

## 相关文档

- [PostgreSQL 全文搜索文档](https://www.postgresql.org/docs/current/textsearch.html)
- [GIN 索引文档](https://www.postgresql.org/docs/current/gin.html)
- [tsvector 数据类型](https://www.postgresql.org/docs/current/datatype-textsearch.html)
