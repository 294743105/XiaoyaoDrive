# ☁️ 逍遥云盘 (Xiaoyao Cloud Drive)

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![OneDrive](https://img.shields.io/badge/Storage-OneDrive-0078D4?style=flat-square&logo=microsoftonedrive)](https://www.microsoft.com/onedrive)
[![R2](https://img.shields.io/badge/Storage-R2-f38020?style=flat-square&logo=cloudflare)](https://www.cloudflare.com/developer-platform/r2/)

基于 Cloudflare Workers 的轻量级、无服务器文件管理器。支持 **Cloudflare R2** 和 **Microsoft OneDrive** 双存储后端。前端采用 Vue 3 + Tailwind CSS 构建，单文件部署，开箱即用。

## ✨ 功能特性

*   **☁️ 双存储支持**：同时支持本地存储 (Cloudflare R2) 和 OneDrive 挂载，一键切换。
*   **🚀 Serverless 部署**：完全运行在 Cloudflare Workers 上，无需购买服务器。
*   **📂 文件管理**：支持文件上传、新建文件夹、删除文件（需管理员权限）。
*   **🔒 安全隐私**：
    *   管理员后台登录。
    *   **文件夹密码保护**（支持 R2 和 OneDrive）。
    *   **文件/文件夹隐藏**（游客不可见）。
*   **👀 在线预览**：支持图片懒加载预览、视频在线播放。
*   **🌓 深色模式**：自动跟随系统或手动切换亮/暗模式。
*   **📱 响应式设计**：完美适配 PC 和移动端。
*   **⚡ 极速体验**：前端内嵌于 Worker，全球 CDN 加速。

## 🛠️ 部署指南

### 1. 准备工作
*   一个 Cloudflare 账号。
*   (可选) 如果使用 OneDrive，需要一个 Microsoft 账号（个人版/E5均可）。

### 2. 创建 R2 存储桶
1.  登录 Cloudflare Dashboard。
2.  进入 **R2** 页面，点击 "Create Bucket"。
3.  命名你的存储桶（例如 `mydrive`），并创建。
4.  (可选) 在存储桶设置中连接自定义域名，以获得更好的下载体验。

### 3. 创建 Worker
1.  进入 **Workers & Pages**，点击 "Create Application" -> "Create Worker"。
2.  命名 Worker（例如 `cloud-drive`），点击 "Deploy"。
3.  点击 "Edit code"，将本项目提供的 `xiaoyaodrive.js` 代码完整复制进去。
4.  保存并部署。

### 4. 绑定 R2 存储桶
1.  在 Worker 的设置页面，找到 **Settings** -> **Variables**。
2.  向下滚动到 **R2 Bucket Bindings**。
3.  点击 "Add Binding"：
    *   **Variable name**: `MY_BUCKET` (必须完全一致)
    *   **R2 Bucket**: 选择你刚才创建的存储桶。
4.  点击 "Deploy" 保存设置。

### 5. 配置环境变量 (Admin 密码)
1.  在 Worker 的 **Settings** -> **Variables** -> **Environment Variables** 中添加：
    *   **Variable name**: `ADMIN_PASSWORD`
    *   **Value**: 设置你的管理员密码。
2.  保存并部署。

---

## 💾 OneDrive 配置 (可选)

如果你需要挂载 OneDrive，请执行以下额外步骤：

### 1. 注册 Azure 应用
1.  登录 [Azure App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)。
2.  点击 "新注册" (New registration)。
3.  **名称**: 任意（如 `XiaoyaoDrive`）。
4.  **受支持的账户类型**: 选择 "任何组织目录(任何 Azure AD 目录 - 多租户)中的账户和个人 Microsoft 账户" (第三个选项)。
5.  **重定向 URI (Web)**: 填入 `https://你的worker域名.workers.dev/api/onedrive/callback`。
6.  注册完成后，记下 **应用程序(客户端) ID** (Client ID)。
7.  进入 **证书和密码** (Certificates & secrets) -> "新客户端密码"，记下 **值** (Client Secret)。
8.  进入 **API 权限** (API permissions) -> "添加权限" -> "Microsoft Graph" -> "Delegated permissions"，搜索并添加 `Files.ReadWrite.All` 和 `Sites.Read.All`。
9.  点击✅授予管理员同意
   
### 2. 添加环境变量
回到 Cloudflare Worker 的环境变量设置，添加以下变量：

| 变量名 | 描述 |
| :--- | :--- |
| `ONEDRIVE_CLIENT_ID` | 刚才获取的 客户端 ID |
| `ONEDRIVE_CLIENT_SECRET` | 刚才获取的 客户端密码 |
| `ONEDRIVE_REDIRECT_URI` | `https://你的worker域名/api/onedrive/callback` |

### 3. 进行授权
1.  访问 `https://你的worker域名/api/onedrive/login`。
2.  登录你的微软账号并同意授权。
3.  如果成功，页面会提示 "OneDrive 授权成功！"。
4.  回到网盘首页，点击右上角切换到 OneDrive 即可使用。

---

## ⚙️ 其他配置

| 变量名 | 描述 |
| :--- | :--- |
| `PUBLIC_DOMAIN` | (可选) 你的 R2 自定义域名，例如 `cdn.example.com`。设置后，R2 文件下载将走此域名直接从r2下载，节省 Worker 费用。 |

## 📖 使用说明

*   **登录管理**：点击右上角的 "管理" (或盾牌图标)，输入 `ADMIN_PASSWORD` 设置的密码。
*   **上传文件**：登录后，可以直接拖拽文件到窗口，或点击 "上传文件" 按钮。
*   **加密文件夹**：
    1.  进入要加密的文件夹。
    2.  管理员登录状态下，点击 "加密" 按钮。
    3.  输入密码。成功后，该文件夹（及子文件夹）访问时将需要密码。
    4.  *注意：OneDrive 和 本地存储 的加密配置是独立的。*
*   **隐藏文件夹**：
    1.  进入文件夹。
    2.  点击 "显隐" 按钮。
    3.  隐藏后，未登录状态下该文件夹将不可见。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 开源协议

MIT License
