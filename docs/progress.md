# read.qiaomu.ai 发布记录

## 2026-08-01 · 第一版

- 创建 `codex/ebook-reader-mvp` 功能分支。
- 使用 Kimi K3 完成实现前设计定稿与实现后截图审稿。
- 本地通过 lint、TypeScript、生产构建和真实浏览器自动化。
- 验证路径覆盖登录、EPUB 上传、打开阅读、目录、划线、AI 选区请求、桌面与移动无横向溢出。
- 生产计划：`/opt/qiaomu-apps/qmreader-books`、私有端口 `127.0.0.1:3487`、域名 `read.qiaomu.ai`。
- 切换前备份目标目录、DNS 与反代配置；失败则恢复原记录并停止新容器。

### 上线结果

- Cloudflare DNS：`read.qiaomu.ai A 76.13.103.27`，DNS only。
- Nginx：HTTPS / HTTP2，私有反代 `127.0.0.1:3487`，上传上限 `110 MB`。
- TLS：Let's Encrypt，有效期至 2026-10-29，已启用自动续期。
- 运行时：Docker Compose，容器健康检查通过；数据位于 `/opt/qiaomu-apps/qmreader-books/data`。
- AI：复用服务器现有 OpenAI-compatible DeepSeek 配置，生产流式回答已验证，密钥未进入仓库或浏览器。
- 公网验收：登录、EPUB 上传、阅读、划线、AI、桌面与移动截图通过；测试书已删除。
- GitHub：`https://github.com/joeseesun/qmreader-books`，PR #1 已合并，MIT License。
- 第一版边界：轻量生产镜像未内置完整 Calibre；EPUB 已上线，AZW3/MOBI 需要后续接入独立 `ebook-convert` 运行时。
