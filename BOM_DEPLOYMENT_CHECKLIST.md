# BOM 安全加固部署检查清单
## 生产环境部署指南

**部署日期**: _____________  
**执行人**: _____________  
**审核人**: _____________

---

## ✅ 部署前检查

### 1. 代码准备
- [ ] 拉取最新代码
  ```bash
  git fetch origin
  git checkout master
  git pull origin master
  ```

- [ ] 验证提交历史
  ```bash
  git log --oneline -5
  # 应该看到以下提交：
  # 1b865a8f perf(bom): add unique constraint for version sequence
  # cb47b5f0 fix(bom): Phase 3 audit & history hardening
  # 8c509d65 fix(bom): Phase 2 security hardening
  # d3db19c3 perf(bom): add composite index for BOM items sort order
  # b6b2070b fix(bom): Phase 1 security hardening
  ```

- [ ] 编译验证
  ```bash
  cd server
  go build -o xdfc-server .
  # 应该无错误
  ```

### 2. 数据库备份（必须！）
- [ ] 备份生产数据库
  ```bash
  pg_dump -U postgres -d xdfc_production > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] 验证备份文件
  ```bash
  ls -lh backup_*.sql
  # 确认文件大小合理
  ```

### 3. 预生产环境测试
- [ ] 在预生产环境执行迁移
- [ ] 运行完整测试套件
- [ ] 验证性能指标
- [ ] 验证错误处理

---

## 🚀 部署步骤

### Step 1: 执行数据库迁移

#### 1.1 连接到生产数据库
```bash
psql -U postgres -d xdfc_production
```

#### 1.2 执行迁移 1 - BOM Items 排序索引
```bash
\i server/migrations/20260513_add_bom_items_sort_order_index.sql
```

**验证**:
```sql
\d bom_items
-- 应该看到 idx_bom_items_bom_id_sort_order 索引
```

- [ ] 索引创建成功
- [ ] 无错误信息

#### 1.3 执行迁移 2 - 版本序列唯一约束
```bash
\i server/migrations/20260513_add_bom_version_sequence_unique_constraint.sql
```

**验证**:
```sql
\d bom_version_snapshots
-- 应该看到 uk_bom_version_sequence 约束
```

- [ ] 约束创建成功
- [ ] 无错误信息

**注意**: 如果约束创建失败（提示已存在重复数据），执行以下修复：
```sql
-- 查找重复数据
SELECT bom_id, version_sequence, COUNT(*) 
FROM bom_version_snapshots 
GROUP BY bom_id, version_sequence 
HAVING COUNT(*) > 1;

-- 如果有重复，需要手动清理后再添加约束
```

### Step 2: 部署代码

#### 2.1 停止服务
```bash
systemctl stop xdfc-server
```

- [ ] 服务已停止
- [ ] 确认无活动连接

#### 2.2 备份旧版本
```bash
cp /path/to/xdfc-server /path/to/xdfc-server.backup.$(date +%Y%m%d)
```

- [ ] 旧版本已备份

#### 2.3 部署新版本
```bash
cd server
go build -o xdfc-server .
cp xdfc-server /path/to/production/
```

- [ ] 新版本已部署
- [ ] 文件权限正确

#### 2.4 启动服务
```bash
systemctl start xdfc-server
```

- [ ] 服务已启动
- [ ] 无启动错误

### Step 3: 验证部署

#### 3.1 检查服务状态
```bash
systemctl status xdfc-server
```

- [ ] 服务状态为 active (running)
- [ ] 无错误日志

#### 3.2 查看启动日志
```bash
journalctl -u xdfc-server -n 50 --no-pager
```

- [ ] 无 ERROR 级别日志
- [ ] 无 PANIC 日志
- [ ] 数据库连接成功

#### 3.3 测试 API 响应
```bash
# 测试健康检查
curl http://localhost:8080/health

# 测试 BOM 查询
curl http://localhost:8080/api/v1/engineering/bom/{test-bom-id}
```

- [ ] API 响应正常
- [ ] 响应时间合理（< 2 秒）

---

## 🧪 功能验证

### 验证 1: MBOM 派生保留排序（RISK-1）
**测试步骤**:
1. 登录系统
2. 创建一个 EBOM，添加 5 行物料
3. 手动调整物料顺序
4. 发布 EBOM
5. 派生为 MBOM
6. 验证 MBOM 的物料顺序与 EBOM 一致

- [ ] 排序保留正确
- [ ] 无错误提示

### 验证 2: 空 BOM 发布拦截（RISK-4）
**测试步骤**:
1. 创建一个空 BOM（不添加任何物料）
2. 尝试发布（DRAFT -> RELEASED）
3. 应该被拒绝，提示 "Cannot release an empty BOM"

- [ ] 空 BOM 被正确拦截
- [ ] 错误提示清晰

### 验证 3: 性能提升（RISK-6）
**测试步骤**:
1. 查询一个包含 1000+ 行物料的 BOM
2. 记录响应时间

- [ ] 响应时间 < 2 秒
- [ ] 性能符合预期

### 验证 4: 审计快照包含 SortOrder（RISK-7）
**测试步骤**:
```sql
SELECT snapshot FROM bom_version_snapshots 
WHERE bom_id = '{test-bom-id}' 
ORDER BY created_at DESC LIMIT 1;
```

- [ ] JSON 中包含 sortOrder 字段
- [ ] 值正确

### 验证 5: 操作类型区分（RISK-8）
**测试步骤**:
1. 执行不同操作：保存、状态流转、派生
2. 查询版本历史
3. 验证 operation 字段显示为 SAVE、PROMOTE、DERIVE

- [ ] 操作类型正确区分
- [ ] 版本历史清晰

### 验证 6: 版本序列无重复（RISK-10）
**测试步骤**:
```sql
SELECT bom_id, version_sequence, COUNT(*) 
FROM bom_version_snapshots 
GROUP BY bom_id, version_sequence 
HAVING COUNT(*) > 1;
```

- [ ] 返回 0 行（无重复）
- [ ] 唯一约束生效

### 验证 7: 主数据状态警告（RISK-11）
**测试步骤**:
1. 查看一个历史版本，其中包含已禁用的物料
2. 验证响应中包含 _materialStatusWarning 字段

- [ ] 警告字段存在
- [ ] 警告信息准确

---

## 📊 性能监控

### 监控指标
- [ ] CPU 使用率正常（< 80%）
- [ ] 内存使用率正常（< 80%）
- [ ] 数据库连接数正常（< 100）
- [ ] API 响应时间正常（P95 < 2s）

### 监控命令
```bash
# CPU 和内存
top -p $(pgrep xdfc-server)

# 数据库连接
psql -U postgres -d xdfc_production -c "SELECT count(*) FROM pg_stat_activity WHERE datname='xdfc_production';"

# API 响应时间
ab -n 100 -c 10 http://localhost:8080/api/v1/engineering/bom/{test-bom-id}
```

---

## 🔄 回滚计划（如果需要）

### 回滚步骤

#### 1. 停止服务
```bash
systemctl stop xdfc-server
```

#### 2. 恢复旧版本
```bash
cp /path/to/xdfc-server.backup.YYYYMMDD /path/to/production/xdfc-server
```

#### 3. 回滚数据库迁移

**回滚迁移 2**:
```sql
ALTER TABLE bom_version_snapshots DROP CONSTRAINT uk_bom_version_sequence;
```

**回滚迁移 1**:
```sql
DROP INDEX IF EXISTS idx_bom_items_bom_id_sort_order;
```

#### 4. 启动服务
```bash
systemctl start xdfc-server
```

#### 5. 验证回滚
```bash
systemctl status xdfc-server
curl http://localhost:8080/health
```

---

## 📝 部署记录

### 部署信息
- **部署日期**: _____________
- **部署时间**: _____________
- **执行人**: _____________
- **审核人**: _____________

### 部署结果
- [ ] 部署成功
- [ ] 部署失败（原因：_____________）
- [ ] 已回滚

### 遇到的问题
```
问题描述：


解决方案：


```

### 性能指标
- **部署前 API 响应时间**: _______ ms
- **部署后 API 响应时间**: _______ ms
- **性能提升**: _______ %

### 备注
```




```

---

## 📞 紧急联系

### 技术支持
- **开发负责人**: _____________
- **DBA**: _____________
- **运维负责人**: _____________

### 回滚决策
如果出现以下情况，立即回滚：
- [ ] 服务无法启动
- [ ] API 错误率 > 5%
- [ ] 响应时间增加 > 50%
- [ ] 数据库连接异常
- [ ] 关键业务功能失效

---

## ✅ 部署完成确认

- [ ] 所有迁移脚本执行成功
- [ ] 服务正常运行
- [ ] 所有功能验证通过
- [ ] 性能指标符合预期
- [ ] 监控告警正常
- [ ] 部署文档已归档

**最终确认人**: _____________  
**确认时间**: _____________  
**签名**: _____________

---

**文档版本**: v1.0  
**最后更新**: 2026-05-13
