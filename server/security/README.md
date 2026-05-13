# CVE-2026-31431 安全补丁使用说明

## 🚀 快速开始（推荐流程）

### 在服务器上执行以下命令：

```bash
# 1. 进入项目目录
cd /var/www/erp

# 2. 拉取最新代码（包含安全脚本）
git fetch --all && git reset --hard origin/master

# 3. 一键应用安全补丁
chmod +x server/security/apply-security-patch.sh && sudo ./server/security/apply-security-patch.sh
```

就这么简单！脚本会引导你完成后续操作。

---

## 📋 详细步骤说明

### 步骤 1：拉取代码
```bash
cd /var/www/erp
git fetch --all && git reset --hard origin/master
```

### 步骤 2：执行安全补丁脚本
```bash
chmod +x server/security/apply-security-patch.sh
sudo ./server/security/apply-security-patch.sh
```

### 步骤 3：选择操作
脚本会提示你选择：
- **选项 1**：立即缓解（推荐先执行，无需重启）
- **选项 2**：完整升级（需要重启，建议在维护窗口执行）
- **选项 3**：查看当前状态

---

## 🎯 推荐执行顺序

### 第一次执行（今天，立即）
```bash
cd /var/www/erp
git fetch --all && git reset --hard origin/master
chmod +x server/security/apply-security-patch.sh
sudo ./server/security/apply-security-patch.sh
# 选择 1 - 立即缓解
```

### 第二次执行（本周，维护窗口）
```bash
cd /var/www/erp
sudo ./server/security/apply-security-patch.sh
# 选择 2 - 完整升级
```

---

## 📁 文件说明

| 文件 | 用途 | 是否需要重启 |
|------|------|-------------|
| `apply-security-patch.sh` | 主入口脚本 | 取决于选择 |
| `cve-2026-31431-mitigation.sh` | 立即缓解脚本 | ❌ 否 |
| `cve-2026-31431-upgrade.sh` | 完整升级脚本 | ✅ 是 |
| `CVE-2026-31431-QUICK-GUIDE.md` | 详细指南 | - |

---

## ✅ 验证补丁是否生效

```bash
# 检查模块状态
lsmod | grep algif_aead
# 预期：没有输出

# 检查黑名单配置
cat /etc/modprobe.d/blacklist-cve-2026-31431.conf
# 预期：包含 "blacklist algif_aead"

# 查看操作日志
cat /var/log/security-patches.log
```

---

## 🆘 常见问题

### Q: 脚本执行失败怎么办？
A: 查看错误信息，或手动执行命令（见 CVE-2026-31431-QUICK-GUIDE.md）

### Q: 需要停止 ERP 服务吗？
A: 
- 立即缓解（选项 1）：不需要
- 完整升级（选项 2）：脚本会询问是否停止

### Q: 多久需要重启？
A: 
- 立即缓解后：不需要重启
- 完整升级后：必须重启

### Q: 如何回滚？
A: 脚本会自动创建备份，位置在 `/root/cve-2026-31431-backup-*` 或 `/root/kernel-upgrade-backup-*`

---

## 📞 紧急联系

如有问题，请联系：
- 运维负责人：[填写]
- 技术负责人：[填写]

---

**最后更新**: 2026-05-13  
**版本**: 1.0
