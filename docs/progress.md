# read.qiaomu.ai 发布记录

## 2026-08-01 · 第一版

- 创建 `codex/ebook-reader-mvp` 功能分支。
- 使用 Kimi K3 完成实现前设计定稿与实现后截图审稿。
- 本地通过 lint、TypeScript、生产构建和真实浏览器自动化。
- 验证路径覆盖登录、EPUB 上传、打开阅读、目录、划线、AI 选区请求、桌面与移动无横向溢出。
- 生产计划：`/opt/qiaomu-apps/qmreader-books`、私有端口 `127.0.0.1:3487`、域名 `read.qiaomu.ai`。
- 切换前备份目标目录、DNS 与反代配置；失败则恢复原记录并停止新容器。
