# 如何创建GitHub Issue

由于gh CLI工具无法正常工作，请按以下步骤手动创建issue：

## 📝 步骤

### 1. 访问GitHub仓库的Issues页面

打开以下链接：
```
https://github.com/philipzhang18/Legend/issues/new
```

### 2. 填写Issue标题

复制以下标题：
```
[修复] 五子棋游戏 - 游客认证和房间创建功能已修复 ✅
```

### 3. 填写Issue正文

**选项A**: 直接复制GITHUB_ISSUE.md文件内容
- 打开项目中的 `GITHUB_ISSUE.md` 文件
- 复制全部内容
- 粘贴到GitHub issue的描述框

**选项B**: 使用以下命令查看内容（在终端中）
```bash
cat /home/dify/Legend/Legend-main/gomoku-game/GITHUB_ISSUE.md
```

### 4. 添加标签 (Labels)

在右侧面板中添加以下标签：
- `enhancement` (功能增强)
- `bug` (Bug修复)
- `documentation` (文档)

如果这些标签不存在，可以创建它们或使用默认标签。

### 5. 提交Issue

点击 "Submit new issue" 按钮完成创建。

---

## 📋 快速复制区域

### Issue标题：
```
[修复] 五子棋游戏 - 游客认证和房间创建功能已修复 ✅
```

### 建议的标签：
- enhancement
- bug
- documentation

---

## 🔗 相关文件

- Issue内容模板: `GITHUB_ISSUE.md`
- 更新日志: `CHANGELOG.md`
- 项目完成报告: `PROJECT_COMPLETION_REPORT.md`
- 软件成熟度评估: `SOFTWARE_MATURITY_ASSESSMENT.md`

---

## ✅ 完成后

创建issue后，您可以：
1. 在issue中@提及相关开发者
2. 关联到相关的commit (fe67544, 17360b0)
3. 设置里程碑（如果有）
4. 分配给相关人员

---

**提示**: 如果您有GitHub CLI访问权限，也可以使用以下命令（需要先认证）：
```bash
gh auth login
gh issue create --title "[修复] 五子棋游戏 - 游客认证和房间创建功能已修复 ✅" \
  --body-file GITHUB_ISSUE.md \
  --label "enhancement,bug,documentation"
```
