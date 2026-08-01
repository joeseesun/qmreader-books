# read.qiaomu.ai 发布记录

## 2026-08-01 · 第一版

- 创建 `codex/ebook-reader-mvp` 功能分支。
- 使用 Kimi K3 完成实现前设计定稿与实现后截图审稿。
- 本地通过 lint、TypeScript、生产构建和真实浏览器自动化。
- 验证路径覆盖公共访问、EPUB 上传、打开阅读、目录、划线、AI 选区请求、桌面与移动无横向溢出。
- 生产计划：`/opt/qiaomu-apps/qmreader-books`、私有端口 `127.0.0.1:3487`、域名 `read.qiaomu.ai`。
- 切换前备份目标目录、DNS 与反代配置；失败则恢复原记录并停止新容器。

### 上线结果

- Cloudflare DNS：`read.qiaomu.ai A 76.13.103.27`，DNS only。
- Nginx：HTTPS / HTTP2，私有反代 `127.0.0.1:3487`，上传上限 `110 MB`。
- TLS：Let's Encrypt，有效期至 2026-10-29，已启用自动续期。
- 运行时：Docker Compose，容器健康检查通过；数据位于 `/opt/qiaomu-apps/qmreader-books/data`。
- AI：复用服务器现有 OpenAI-compatible DeepSeek 配置，生产流式回答已验证，密钥未进入仓库或浏览器。
- 公网验收：免登录访问、EPUB 上传、阅读、划线、AI、桌面与移动截图通过；测试书已删除。
- GitHub：`https://github.com/joeseesun/qmreader-books`，PR #1 已合并，MIT License。
- 格式转换：宿主机独立安装官方 Calibre 9.12.0 到 `/opt/calibre/calibre`，只读挂载进容器；生产镜像从零重建后，MOBI、AZW3 → EPUB 的上传、转换、读取和清理均已实际通过（仅支持无 DRM 文件）。
- 公共访问：已移除密码页与全部 API 登录鉴权；匿名用户可直接上传、阅读和使用 AI。删除使用上传时生成、仅保存在原浏览器的匿名凭证，避免访客互删。
