#!/bin/bash

################################################################################
# 安全补丁快速应用脚本
# 
# 用途：在服务器上拉取 Git 后，一键应用 CVE-2026-31431 安全补丁
# 使用：chmod +x apply-security-patch.sh && ./apply-security-patch.sh
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "========================================"
echo "CVE-2026-31431 安全补丁快速应用"
echo "========================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "deploy.sh" ]; then
    log_error "请在 /var/www/erp 目录下执行此脚本"
    exit 1
fi

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    log_error "请使用 root 权限运行"
    echo "使用方法: sudo ./server/security/apply-security-patch.sh"
    exit 1
fi

log_info "当前目录: $(pwd)"
log_info "当前内核: $(uname -r)"
echo ""

# 检查安全脚本是否存在
if [ ! -f "server/security/cve-2026-31431-mitigation.sh" ]; then
    log_error "安全脚本不存在，请确保已拉取最新代码"
    exit 1
fi

# 赋予执行权限
log_info "赋予脚本执行权限..."
chmod +x server/security/cve-2026-31431-mitigation.sh
chmod +x server/security/cve-2026-31431-upgrade.sh 2>/dev/null || true

# 询问执行哪个操作
echo ""
log_warning "请选择要执行的操作:"
echo "  1) 立即缓解（禁用模块，无需重启）- 推荐先执行"
echo "  2) 完整升级（升级内核，需要重启）"
echo "  3) 仅查看状态"
echo ""
read -p "请输入选项 (1/2/3): " choice

case $choice in
    1)
        log_info "执行立即缓解措施..."
        echo ""
        ./server/security/cve-2026-31431-mitigation.sh
        ;;
    2)
        log_warning "此操作将升级内核并需要重启服务器"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./server/security/cve-2026-31431-upgrade.sh
        else
            log_info "已取消"
        fi
        ;;
    3)
        log_info "检查当前状态..."
        echo ""
        echo "内核版本:"
        uname -r
        echo ""
        echo "algif_aead 模块状态:"
        lsmod | grep algif_aead || echo "✅ 模块未加载"
        echo ""
        echo "黑名单配置:"
        if [ -f /etc/modprobe.d/blacklist-cve-2026-31431.conf ]; then
            echo "✅ 已配置"
            cat /etc/modprobe.d/blacklist-cve-2026-31431.conf
        else
            echo "❌ 未配置"
        fi
        ;;
    *)
        log_error "无效的选项"
        exit 1
        ;;
esac

echo ""
log_success "操作完成！"
echo ""
