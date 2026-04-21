# Snake Rush Arena

一个支持注册、登录、全站排行榜的网页版贪吃蛇小游戏，基于 Next.js App Router 构建。

## 功能

- 用户注册与登录
- HttpOnly Cookie 会话
- 贪吃蛇游戏主界面
- 自动提交历史最高分
- 全站排行榜
- 适配桌面键盘和移动端按钮操作

## 本地运行

```bash
npm install
npm run dev
```

默认地址：

```text
http://localhost:3000
```

## 生产构建

```bash
npm run build
npm run start
```

## 远程存储

当前项目使用一个远程 JSON 文档作为轻量持久化存储，这样部署到 Vercel 后注册、登录和排行榜仍然可用。

可选环境变量：

```bash
JSONBLOB_STORE_URL=https://jsonblob.com/api/jsonBlob/your-store-id
SESSION_SECRET=replace-this-with-a-long-random-string
```


## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## 接口

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/leaderboard`
- `POST /api/score`
