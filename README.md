# 丑猫画室 / Ugly Cat Studio

一个已经接通前端、API 与数据库的双语全栈 MVP。第一次访问只需设置昵称；浏览器通过 HTTP-only Cookie 保存匿名身份，没有登录、邮箱或密码。

## 已实现

- 中文优先，右上角一键切换 English，语言选择保存在浏览器。
- 上传 JPG / PNG / WEBP，预览、8 MB 限制和“这是我的猫”可选声明。
- 手机与 iPad 使用系统相册选择器：先显示用途说明，再由用户授权网站读取其主动选择的单张图片；网站无法浏览整个相册。
- 我的上传：状态、审核进度和绘画数量。
- 普通审核：每人每图一票、不能审核自己的图、10 票多数决、平票继续。
- 随机画猫：优先未画过且非自己上传的已过审图片。
- Canvas：画笔、橡皮、颜色、粗细、撤销、重做、清空和 PNG 提交。
- 空画板提交会被拦截，并弹出双语提示。
- 作品图库由服务端控制；上传者可直接查看自己猫图的作品，其他用户提交过该猫的画后才返回作品。
- 举报与二次审核；虐待、色情、暴力/血腥举报会暂时隐藏已过审图片。
- 用户画作可举报；被举报画作立即暂时隐藏，并进入独立的社区复核队列。
- 用户反馈页支持“发现 Bug”和“改进建议”，反馈保存在数据库中。
- 独立内部管理台可查看、隐藏、恢复或永久删除猫图和画作，集中处理举报与用户反馈。
- 桌面、平板和手机响应式布局。

## 本地启动

需要 Node.js 22.5 或更新版本（项目使用 Node 内置 SQLite）。

```bash
npm install
npm run dev
```

默认 `npm run dev` 绑定当前 Wi‑Fi 网卡，电脑及同一 Wi‑Fi 设备打开 <http://192.168.20.5:3000>。只希望本机访问时使用 `npm run dev:local`，再打开 <http://127.0.0.1:3000>。如果电脑重新连接网络后 IP 改变，需要同步更新 `package.json` 中的 `dev` 地址和 `next.config.ts` 中的 `allowedDevOrigins`。

数据库在首次请求时自动创建为 `data/ugly-cat.sqlite`，上传文件存放在 `data/uploads/`。演示数据会自动加入，使所有核心流程可以立即测试。

移动端使用标准 HTML file input（`accept="image/jpeg,image/png,image/webp"`）触发 iOS、iPadOS 或 Android 的原生照片选择界面。普通网站没有读取整套相册的 Web 权限；系统选择器返回用户明确选择的文件，这次选择本身就是最小范围授权。前端通过 Object URL 显示预览，再使用 `FormData` 上传到 Next.js Route Handler，服务端继续校验格式和 8 MB 大小限制。

## 校验

```bash
npm run typecheck
npm run lint
npm run build
npm run test:ui
npm run test:admin
```

浏览器测试使用系统中的 Chrome 或 Edge，并要求本地开发服务器已在 3000 端口运行。

## 内部管理台

内部地址为 <http://localhost:3000/internal-console>，公开页面没有入口。所有管理 API 都会在服务端校验签名后的 HttpOnly Cookie，因此只修改 URL 不能进入管理功能。

首次运行前复制 `.env.example` 为 `.env.local`，并将 `ADMIN_ACCESS_KEY` 改为至少 20 位的随机密钥。修改密钥后必须重启服务。不要提交或公开 `.env.local`。

## 数据库

- `database/schema.sql`：当前可运行 SQLite schema，包含猫图、画作、两类举报与审核、反馈等 9 张业务表及相关约束和索引。
- `database/supabase.sql`：Supabase/PostgreSQL 生产迁移草案，包含 Storage buckets 与默认关闭的直接浏览器表权限。

当前版本将匿名身份和业务规则放在 Next.js 服务端执行。正式部署到无持久磁盘的平台前，应把 `src/lib/db.ts` 和媒体读写切换为 Supabase PostgreSQL + Storage；不要把 service-role key 暴露给浏览器。

## 关键规则

- 正常审核目标为 10 人；至少 10 票且非平票时才产生结果。
- 二次审核目标为 5 人；达到目标且非平票时恢复或移除。
- 画作复核目标为 5 人；达到目标且非平票时恢复展示或继续隐藏。
- 严重举报会立即把已过审图片改为 `under_re_review`，停止进入随机绘画池。
- `GET /api/cats/:id/drawings` 会检查当前匿名用户是否为上传者或已经画过；两者都不是时返回 `403 DRAW_FIRST`。
