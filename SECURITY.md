# Security Policy

请不要在公开 Issue 中提交密码、模型密钥、电子书内容或服务器日志中的私人信息。

安全问题请通过 GitHub 的 Private vulnerability reporting 联系维护者。报告应包含受影响版本、复现步骤、预期影响与建议缓解方式。

API 密钥必须只放在服务端 `.env`，不要提交到仓库。生产部署必须设置 `READER_PASSWORD`、HTTPS、上传体积限制，并定期备份 `DATA_DIR`。
