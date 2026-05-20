# 数据库迁移执行脚本 (PowerShell)
# 用法: .\run_migration.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "XDFC 数据库迁移工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置数据库连接参数
$env:PGUSER = "xdfc_admin"
$env:PGPASSWORD = "xdfc_local_dev_password"
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGDATABASE = "xdfc_official"

Write-Host "数据库连接信息:" -ForegroundColor Yellow
Write-Host "- 主机: $env:PGHOST:$env:PGPORT"
Write-Host "- 数据库: $env:PGDATABASE"
Write-Host "- 用户: $env:PGUSER"
Write-Host ""

# 检查 psql 是否可用
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "[错误] 未找到 psql 命令" -ForegroundColor Red
    Write-Host "请确保 PostgreSQL 客户端已安装并添加到 PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "安装方法:" -ForegroundColor Yellow
    Write-Host "1. 下载 PostgreSQL: https://www.postgresql.org/download/windows/"
    Write-Host "2. 安装时选择 'Command Line Tools'"
    Write-Host "3. 将 PostgreSQL\bin 目录添加到系统 PATH"
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查数据库连接
Write-Host "[1/5] 检查数据库连接..." -ForegroundColor Yellow
$testConnection = psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -c "\conninfo" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 无法连接到数据库" -ForegroundColor Red
    Write-Host "请检查:" -ForegroundColor Red
    Write-Host "1. 数据库是否运行"
    Write-Host "2. 连接参数是否正确"
    Write-Host "3. 防火墙设置"
    Write-Host ""
    Write-Host "错误信息: $testConnection" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}
Write-Host "[成功] 数据库连接正常" -ForegroundColor Green
Write-Host ""

# 检查数据量
Write-Host "[2/5] 检查数据量..." -ForegroundColor Yellow
$recordCount = psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -t -c "SELECT COUNT(*) FROM maintenance_records;" 2>&1
$recordCount = $recordCount.Trim()
Write-Host "当前记录数: $recordCount"
Write-Host "预计迁移时间:" -ForegroundColor Yellow
if ([int]$recordCount -lt 1000) {
    Write-Host "  约 1 秒" -ForegroundColor Green
} elseif ([int]$recordCount -lt 10000) {
    Write-Host "  约 5-10 秒" -ForegroundColor Green
} else {
    Write-Host "  约 30-60 秒" -ForegroundColor Yellow
}
Write-Host ""

# 创建备份
Write-Host "[3/5] 创建备份..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_before_migration_$timestamp.sql"
Write-Host "备份文件: $backupFile"
pg_dump -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE > $backupFile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 备份失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}
$backupSize = (Get-Item $backupFile).Length / 1MB
Write-Host "[成功] 备份完成 (大小: $([math]::Round($backupSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# 执行迁移
Write-Host "[4/5] 执行迁移脚本..." -ForegroundColor Yellow
Write-Host "迁移文件: 20260520_add_maintenance_record_search_index.sql"
$migrationResult = psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -f "20260520_add_maintenance_record_search_index.sql" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 迁移失败" -ForegroundColor Red
    Write-Host "错误信息: $migrationResult" -ForegroundColor Red
    Write-Host ""
    $rollback = Read-Host "是否需要回滚? (Y/N)"
    if ($rollback -eq "Y" -or $rollback -eq "y") {
        Write-Host "执行回滚..." -ForegroundColor Yellow
        psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -f "20260520_add_maintenance_record_search_index_down.sql"
        Write-Host "回滚完成" -ForegroundColor Green
    }
    Read-Host "按 Enter 键退出"
    exit 1
}
Write-Host "[成功] 迁移完成" -ForegroundColor Green
Write-Host ""

# 验证迁移
Write-Host "[5/5] 验证迁移..." -ForegroundColor Yellow
Write-Host ""
Write-Host "检查索引:" -ForegroundColor Cyan
psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -c "SELECT indexname FROM pg_indexes WHERE tablename = 'maintenance_records' AND indexname LIKE 'idx_maintenance_records_%';"
Write-Host ""

Write-Host "检查搜索向量:" -ForegroundColor Cyan
psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -c "SELECT COUNT(*) as total, COUNT(search_vector) as with_vector FROM maintenance_records;"
Write-Host ""

Write-Host "测试搜索功能:" -ForegroundColor Cyan
psql -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -c "SELECT id, title FROM maintenance_records WHERE search_vector @@ plainto_tsquery('simple', 'test') LIMIT 3;"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "迁移完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "备份文件: $backupFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 测试搜索功能"
Write-Host "2. 检查性能提升"
Write-Host "3. 查看详细文档: .kiro\specs\equipment-maintenance\DATABASE_MIGRATION_GUIDE.md"
Write-Host ""
Read-Host "按 Enter 键退出"
