# 数据库迁移执行指南

**创建时间**: 2026-05-20  
**状态**: ⏳ 待执行  
**优先级**: 🔴 高 (P1 任务的最后一步)

---

## 📋 概述

本指南将帮助您执行搜索性能优化的数据库迁移脚本。这是 P1 任务的最后一步，完成后将使搜索性能提升 **10-100 倍**。

---

## 🎯 迁移目标

### 功能
- ✅ 添加全文搜索向量列 (`search_vector`)
- ✅ 创建自动更新触发器
- ✅ 为现有数据生成搜索向量
- ✅ 创建 GIN 索引加速搜索
- ✅ 创建复合索引优化常用查询

### 性能提升
| 数据量 | 迁移前 (LIKE) | 迁移后 (FTS) | 提升倍数 |
|--------|--------------|-------------|---------|
| 1,000 条 | 10-50ms | 1-5ms | 10x |
| 10,000 条 | 100-500ms | 5-20ms | 20-50x |
| 100,000 条 | 1-5s | 10-50ms | 100x |

---

## ⚠️ 执行前准备

### 1. 备份数据库 (必需)

```bash
# 方法1: 使用 pg_dump (推荐)
pg_dump -U xdfc_admin -d xdfc_official > backup_before_migration_20260520.sql

# 方法2: 使用 Docker (如果数据库在 Docker 中)
docker exec -t xdfc-postgres pg_dump -U xdfc_admin xdfc_official > backup_before_migration_20260520.sql
```

**验证备份**:
```bash
# 检查备份文件大小
ls -lh backup_before_migration_20260520.sql

# 检查备份文件内容
head -n 20 backup_before_migration_20260520.sql
```

### 2. 检查数据库连接

```bash
# 方法1: 使用 psql
psql -U xdfc_admin -d xdfc_official -h 127.0.0.1 -p 5432

# 方法2: 使用 Docker (如果数据库在 Docker 中)
docker exec -it xdfc-postgres psql -U xdfc_admin -d xdfc_official

# 测试连接
\conninfo
\dt maintenance_records
```

### 3. 检查磁盘空间

```bash
# 检查数据库大小
psql -U xdfc_admin -d xdfc_official -c "SELECT pg_size_pretty(pg_database_size('xdfc_official'));"

# 检查表大小
psql -U xdfc_admin -d xdfc_official -c "SELECT pg_size_pretty(pg_total_relation_size('maintenance_records'));"

# 确保有足够空间 (至少 30% 的表大小)
df -h
```

### 4. 检查当前数据量

```bash
# 查询记录数
psql -U xdfc_admin -d xdfc_official -c "SELECT COUNT(*) FROM maintenance_records;"

# 预估迁移时间
# - 1,000 条: ~1 秒
# - 10,000 条: ~5-10 秒
# - 100,000 条: ~30-60 秒
```

---

## 🚀 执行迁移

### 方法1: 使用 psql 命令 (推荐)

```bash
# 进入项目目录
cd c:\Users\P16V\Desktop\纤镀软件开发\XDFC

# 执行迁移脚本
psql -U xdfc_admin -d xdfc_official -h 127.0.0.1 -p 5432 -f server/migrations/20260520_add_maintenance_record_search_index.sql

# 输入密码: xdfc_local_dev_password
```

### 方法2: 使用 Docker (如果数据库在 Docker 中)

```bash
# 进入项目目录
cd c:\Users\P16V\Desktop\纤镀软件开发\XDFC

# 复制迁移脚本到容器
docker cp server/migrations/20260520_add_maintenance_record_search_index.sql xdfc-postgres:/tmp/

# 执行迁移
docker exec -it xdfc-postgres psql -U xdfc_admin -d xdfc_official -f /tmp/20260520_add_maintenance_record_search_index.sql
```

### 方法3: 使用交互式 psql

```bash
# 连接到数据库
psql -U xdfc_admin -d xdfc_official -h 127.0.0.1 -p 5432

# 在 psql 中执行
\i server/migrations/20260520_add_maintenance_record_search_index.sql

# 或者在 Windows 中使用完整路径
\i 'c:/Users/P16V/Desktop/纤镀软件开发/XDFC/server/migrations/20260520_add_maintenance_record_search_index.sql'
```

---

## ✅ 验证迁移

### 1. 检查列是否添加

```sql
-- 连接到数据库
psql -U xdfc_admin -d xdfc_official -h 127.0.0.1 -p 5432

-- 查看表结构
\d maintenance_records

-- 应该看到 search_vector 列 (tsvector 类型)
```

**预期输出**:
```
Column         | Type      | Collation | Nullable | Default
---------------+-----------+-----------+----------+---------
...
search_vector  | tsvector  |           |          |
```

### 2. 检查索引是否创建

```sql
-- 查看所有索引
\di idx_maintenance_records_*

-- 或使用 SQL 查询
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'maintenance_records' 
  AND indexname LIKE 'idx_maintenance_records_%';
```

**预期输出**:
```
idx_maintenance_records_search_vector
idx_maintenance_records_status_created
idx_maintenance_records_asset
idx_maintenance_records_priority
idx_maintenance_records_type
```

### 3. 检查触发器是否创建

```sql
-- 查看触发器
\df maintenance_records_search_vector_update

-- 查看触发器详情
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'maintenance_records'::regclass;
```

**预期输出**:
```
tgname: maintenance_records_search_vector_trigger
tgtype: 7 (BEFORE INSERT OR UPDATE)
tgenabled: O (enabled)
```

### 4. 检查搜索向量是否生成

```sql
-- 查看前5条记录的搜索向量
SELECT id, title, asset_sn, search_vector 
FROM maintenance_records 
LIMIT 5;

-- 检查是否有 NULL 值
SELECT COUNT(*) as null_count 
FROM maintenance_records 
WHERE search_vector IS NULL;
```

**预期结果**: `null_count` 应该为 0

### 5. 测试全文搜索

```sql
-- 测试搜索功能
SELECT id, title, asset_sn 
FROM maintenance_records 
WHERE search_vector @@ plainto_tsquery('simple', '测试')
LIMIT 5;

-- 测试相关性排序
SELECT 
  id, 
  title, 
  asset_sn,
  ts_rank(search_vector, plainto_tsquery('simple', '紧急')) as rank
FROM maintenance_records 
WHERE search_vector @@ plainto_tsquery('simple', '紧急')
ORDER BY rank DESC
LIMIT 5;
```

### 6. 测试触发器自动更新

```sql
-- 插入测试记录
INSERT INTO maintenance_records (
  id, title, asset_type, asset_id, asset_sn, type, priority, status, 
  scheduled_date, created_by, created_at, updated_at, version
) VALUES (
  'test-migration-001',
  '测试迁移记录',
  'MOLD',
  'mold-001',
  'SN-TEST-001',
  'PREVENTIVE',
  'MEDIUM',
  'OPEN',
  NOW(),
  'admin',
  NOW(),
  NOW(),
  1
);

-- 检查搜索向量是否自动生成
SELECT id, title, search_vector 
FROM maintenance_records 
WHERE id = 'test-migration-001';

-- 更新记录
UPDATE maintenance_records 
SET title = '更新后的测试记录' 
WHERE id = 'test-migration-001';

-- 检查搜索向量是否自动更新
SELECT id, title, search_vector 
FROM maintenance_records 
WHERE id = 'test-migration-001';

-- 清理测试记录
DELETE FROM maintenance_records WHERE id = 'test-migration-001';
```

---

## 📊 性能测试

### 1. 测试搜索性能

```sql
-- 启用查询计时
\timing on

-- 测试1: 全文搜索 (使用索引)
EXPLAIN ANALYZE
SELECT * FROM maintenance_records 
WHERE search_vector @@ plainto_tsquery('simple', '紧急')
LIMIT 10;

-- 测试2: LIKE 查询 (全表扫描 - 对比)
EXPLAIN ANALYZE
SELECT * FROM maintenance_records 
WHERE title LIKE '%紧急%' OR asset_sn LIKE '%紧急%'
LIMIT 10;

-- 测试3: 复合查询
EXPLAIN ANALYZE
SELECT * FROM maintenance_records 
WHERE status = 'OPEN' 
  AND search_vector @@ plainto_tsquery('simple', '维修')
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果**:
- 全文搜索应该使用 `Bitmap Index Scan on idx_maintenance_records_search_vector`
- 执行时间应该在 5-50ms 之间 (取决于数据量)
- LIKE 查询应该使用 `Seq Scan` (全表扫描)
- 执行时间应该明显慢于全文搜索

### 2. 测试索引使用情况

```sql
-- 查看索引统计
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'maintenance_records'
ORDER BY idx_scan DESC;
```

---

## 🔄 回滚迁移 (如果需要)

### 何时需要回滚
- 迁移失败
- 发现严重问题
- 需要重新执行迁移

### 回滚步骤

```bash
# 方法1: 使用 psql 命令
psql -U xdfc_admin -d xdfc_official -h 127.0.0.1 -p 5432 -f server/migrations/20260520_add_maintenance_record_search_index_down.sql

# 方法2: 使用 Docker
docker exec -it xdfc-postgres psql -U xdfc_admin -d xdfc_official -f /tmp/20260520_add_maintenance_record_search_index_down.sql

# 方法3: 使用交互式 psql
psql -U xdfc_admin -d xdfc_official -h 127.0.0.1 -p 5432
\i server/migrations/20260520_add_maintenance_record_search_index_down.sql
```

### 验证回滚

```sql
-- 检查列是否删除
\d maintenance_records

-- 检查索引是否删除
\di idx_maintenance_records_*

-- 检查触发器是否删除
\df maintenance_records_search_vector_update
```

---

## 🐛 故障排除

### 问题1: 连接数据库失败

**错误信息**:
```
psql: error: connection to server at "127.0.0.1", port 5432 failed
```

**解决方案**:
1. 检查数据库是否运行:
   ```bash
   # 检查 Docker 容器
   docker ps | grep postgres
   
   # 或检查 PostgreSQL 服务
   sc query postgresql
   ```

2. 检查端口是否正确:
   ```bash
   netstat -an | findstr 5432
   ```

3. 检查防火墙设置

### 问题2: 权限不足

**错误信息**:
```
ERROR: permission denied for table maintenance_records
```

**解决方案**:
1. 使用正确的数据库用户 (`xdfc_admin`)
2. 检查用户权限:
   ```sql
   \du xdfc_admin
   ```

### 问题3: 列已存在

**错误信息**:
```
ERROR: column "search_vector" of relation "maintenance_records" already exists
```

**解决方案**:
- 迁移脚本已使用 `IF NOT EXISTS`,应该不会出现此问题
- 如果仍然出现,说明迁移已经执行过,无需重复执行

### 问题4: 搜索向量为 NULL

**检查**:
```sql
SELECT COUNT(*) FROM maintenance_records WHERE search_vector IS NULL;
```

**解决方案**:
```sql
-- 手动更新搜索向量
UPDATE maintenance_records SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(asset_sn, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;
```

### 问题5: 迁移时间过长

**原因**: 数据量过大

**解决方案**:
1. 在低峰期执行迁移
2. 分批更新搜索向量:
   ```sql
   -- 分批更新 (每次 1000 条)
   UPDATE maintenance_records SET search_vector = 
     setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
     setweight(to_tsvector('simple', COALESCE(asset_sn, '')), 'B') ||
     setweight(to_tsvector('simple', COALESCE(description, '')), 'C')
   WHERE id IN (
     SELECT id FROM maintenance_records 
     WHERE search_vector IS NULL 
     LIMIT 1000
   );
   ```

---

## 📝 迁移后检查清单

- [ ] 备份数据库已创建
- [ ] 迁移脚本执行成功
- [ ] `search_vector` 列已添加
- [ ] 5 个索引已创建
- [ ] 触发器已创建
- [ ] 现有数据的搜索向量已生成
- [ ] 全文搜索功能正常
- [ ] 触发器自动更新功能正常
- [ ] 搜索性能已提升
- [ ] 后端代码已更新 (Repository 层)
- [ ] 前端搜索功能正常

---

## 🎯 下一步行动

### 1. 手动测试 (推荐)

#### 测试搜索功能
1. 启动后端服务: `cd server && go run main.go`
2. 访问 Swagger UI: http://localhost:8080/swagger/index.html
3. 测试 `/api/v1/maintenance-records` 端点
4. 使用 `search` 参数测试搜索功能

#### 测试前端
1. 启动前端服务: `pnpm run dev`
2. 访问: http://localhost:5173
3. 进入设备维保模块
4. 测试搜索功能
5. 观察搜索速度

### 2. 性能监控 (可选)

```sql
-- 创建性能监控视图
CREATE OR REPLACE VIEW maintenance_records_search_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as total_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'maintenance_records'
ORDER BY idx_scan DESC;

-- 查看统计
SELECT * FROM maintenance_records_search_stats;
```

### 3. 生产部署准备

1. **测试环境验证**: 先在测试环境执行迁移
2. **性能基准测试**: 记录迁移前后的性能数据
3. **回滚方案**: 准备好回滚脚本和流程
4. **监控准备**: 准备好监控和告警
5. **低峰期执行**: 选择低峰期执行迁移
6. **通知团队**: 提前通知相关人员

---

## 📚 相关文档

- [数据库迁移说明](./server/migrations/README.md)
- [P1 任务完成报告](./P1_COMPLETION_REPORT.md)
- [P1 任务进度报告](./P1_TASKS_PROGRESS.md)
- [搜索优化实施总结](./TASK4_SEARCH_OPTIMIZATION_SUMMARY.md)

---

## 📞 支持

如果遇到问题,请:
1. 查看本文档的故障排除部分
2. 查看 PostgreSQL 日志
3. 查看应用日志
4. 联系技术支持

---

**文档创建时间**: 2026-05-20  
**最后更新时间**: 2026-05-20  
**状态**: ⏳ 待执行迁移

---

## ✅ 执行记录

### 执行日期: ___________
### 执行人: ___________
### 执行结果: [ ] 成功 [ ] 失败
### 备注: ___________

