@echo off
REM 数据库迁移执行脚本
REM 用法: run_migration.bat

echo ========================================
echo XDFC 数据库迁移工具
echo ========================================
echo.

REM 设置数据库连接参数
set PGUSER=xdfc_admin
set PGPASSWORD=xdfc_local_dev_password
set PGHOST=127.0.0.1
set PGPORT=5432
set PGDATABASE=xdfc_official

echo 数据库连接信息:
echo - 主机: %PGHOST%:%PGPORT%
echo - 数据库: %PGDATABASE%
echo - 用户: %PGUSER%
echo.

REM 检查 psql 是否可用
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 psql 命令
    echo 请确保 PostgreSQL 客户端已安装并添加到 PATH
    echo.
    echo 安装方法:
    echo 1. 下载 PostgreSQL: https://www.postgresql.org/download/windows/
    echo 2. 安装时选择 "Command Line Tools"
    echo 3. 将 PostgreSQL\bin 目录添加到系统 PATH
    echo.
    pause
    exit /b 1
)

echo [1/5] 检查数据库连接...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -c "\conninfo" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 无法连接到数据库
    echo 请检查:
    echo 1. 数据库是否运行
    echo 2. 连接参数是否正确
    echo 3. 防火墙设置
    echo.
    pause
    exit /b 1
)
echo [成功] 数据库连接正常
echo.

echo [2/5] 检查数据量...
for /f "tokens=*" %%i in ('psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -t -c "SELECT COUNT(*) FROM maintenance_records;"') do set RECORD_COUNT=%%i
echo 当前记录数: %RECORD_COUNT%
echo 预计迁移时间: 
if %RECORD_COUNT% LSS 1000 (
    echo   约 1 秒
) else if %RECORD_COUNT% LSS 10000 (
    echo   约 5-10 秒
) else (
    echo   约 30-60 秒
)
echo.

echo [3/5] 创建备份...
set BACKUP_FILE=backup_before_migration_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%
echo 备份文件: %BACKUP_FILE%
pg_dump -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% > %BACKUP_FILE%
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 备份失败
    pause
    exit /b 1
)
echo [成功] 备份完成
echo.

echo [4/5] 执行迁移脚本...
echo 迁移文件: 20260520_add_maintenance_record_search_index.sql
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f 20260520_add_maintenance_record_search_index.sql
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 迁移失败
    echo.
    echo 是否需要回滚? (Y/N)
    set /p ROLLBACK=
    if /i "%ROLLBACK%"=="Y" (
        echo 执行回滚...
        psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f 20260520_add_maintenance_record_search_index_down.sql
        echo 回滚完成
    )
    pause
    exit /b 1
)
echo [成功] 迁移完成
echo.

echo [5/5] 验证迁移...
echo 检查索引...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -c "SELECT indexname FROM pg_indexes WHERE tablename = 'maintenance_records' AND indexname LIKE 'idx_maintenance_records_%%';"
echo.

echo 检查搜索向量...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -c "SELECT COUNT(*) as total, COUNT(search_vector) as with_vector FROM maintenance_records;"
echo.

echo ========================================
echo 迁移完成!
echo ========================================
echo.
echo 备份文件: %BACKUP_FILE%
echo.
echo 下一步:
echo 1. 测试搜索功能
echo 2. 检查性能提升
echo 3. 查看详细文档: .kiro\specs\equipment-maintenance\DATABASE_MIGRATION_GUIDE.md
echo.
pause
