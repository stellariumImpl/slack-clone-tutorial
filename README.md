这是一份为您定制的、针对项目下一阶段开发的总体需求分析文档。我将剩下的工作划分为**四个核心板块**，每个板块下详细列出了对应的功能点和技术实现要求。

你可以将此作为接下来的开发清单。

---

### 1. 工作区头部功能增强 (Workspace Header Features)

**目标**：提升用户在当前工作区内的操作效率，快速发起对话和筛选信息。

- **1.1 新建消息 (New Message / Quick Switcher)**
- **功能描述**：点击 Header 上的 "New Message" 按钮（或快捷键 `Cmd+K`），弹出一个模态框（Modal）。
- **前端实现**：
- 创建一个 `Dialog` 组件。
- 包含一个搜索输入框，实时过滤当前 Workspace 下的**成员**和**频道**。
- 选中成员 -> 跳转到私聊（如果不存在则创建）。
- 选中频道 -> 跳转到该频道。

- **后端支持**：
- 需要一个高效的 `searchMembers` 和 `searchChannels` 查询接口。
- 复用现有的 `conversations.createOrGet` mutation。

- **1.2 侧边栏筛选 (Sidebar Filter)**
- **功能描述**：在侧边栏顶部增加一个“筛选”按钮或输入框，用于在频道和私聊列表变长时快速查找。
- **前端实现**：
- 纯前端过滤：获取 `channels` 和 `members` 列表后，根据用户输入在本地进行 `filter`，只渲染匹配的项。
- 不需要后端额外请求，响应速度最快。

---

### 2. 全局搜索功能 (Global Search - Powered by Algolia)

**目标**：提供商业级的全文搜索体验，支持容错、高亮，并能精准跳转到历史消息。

- **2.1 数据同步机制 (Backend - Indexing)**
- **功能描述**：确保 Convex 数据库中的消息实时同步到 Algolia 搜索引擎。
- **实现细节**：
- **Algolia 配置**：注册账号，创建 `messages` 索引，配置 searchable attributes (body, authorName)。
- **Convex Action**：编写 `internalAction`，用于调用 Algolia API (`saveObject`, `deleteObject`)。
- **触发器改造**：修改 `convex/messages.ts` 中的 `create`, `update`, `remove` mutation，在数据落库后，使用 `ctx.scheduler.runAfter(0, ...)` 异步调度同步 Action。

- **2.2 搜索界面交互 (Frontend - Search UI)**
- **功能描述**：用户输入关键词，即时展示带有高亮片段的结果列表。
- **实现细节**：
- 集成 `react-instantsearch` 或使用 Algolia 的 Headless UI。
- **结果展示**：显示发送者头像、名字、所在的频道/私聊名称、以及高亮的消息内容片段。
- **跳转逻辑**：点击搜索结果，根据结果中的 `channelId` 或 `conversationId` + `messageId`，跳转到对应位置并滚动到该消息（利用现有的 ID 锚点机制）。

---

### 3. 用户个人中心 (User Profile)

**目标**：允许用户管理自己的身份信息，提升个性化体验。

- **3.1 个人信息展示与编辑 (Profile UI)**
- **功能描述**：用户点击头像或设置，弹出个人资料面板。
- **前端实现**：
- **查看模式**：展示大头像、全名、邮箱、加入时间。
- **编辑模式**：
- **头像上传**：复用现有的图片上传逻辑（生成上传 URL -> 存入 Storage -> 获取 Storage ID）。
- **昵称修改**：简单的文本输入框。

- **后端支持**：
- `users.update` mutation：允许用户更新自己的 `name` 和 `image` 字段。
- 权限校验：确保用户只能修改自己的资料。

---

### 4. 跨工作区聚合 (Cross-Workspace Aggregation - "Plan A")

**目标**：打造“上帝视角”，打破工作区隔离，在一个视图下处理所有未读消息和动态。这是项目的**核心亮点**。

- **4.1 聚合导航栏 (Unified Sidebar)**
- **功能描述**：左侧最外层导航栏的三个按钮（Home, DMs, Activity）不再局限于当前 Workspace，而是展示全局信息。
- **实现细节**：
- **Home**：(可选) 保持为当前 Workspace 的仪表盘，或者做一个“所有未读消息”的聚合页。
- **DMs (All DMs)**：列出用户在**所有**加入的 Workspace 中的私聊列表，按最新消息时间排序。
- **Activity (Mentions)**：列出**所有** Workspace 中“提到我”或“回复我”的消息。

- **4.2 全局数据查询 (Backend - Global Queries)**
- **功能描述**：跨越 `workspaceId` 的边界进行查询。
- **数据库索引**：
- 需要在 `conversations` 和 `messages` 表中建立**不包含** `workspaceId` 的索引。
- 例如：`by_user_id` (查询所有与我有关的私聊)，`by_mentioned_user` (查询所有 @我的消息)。

- **API 设计**：
- `users.getAllConversations`：返回 `{ workspaceId, conversationInfo, lastMessage }` 的列表。
- `users.getGlobalActivity`：返回 `{ workspaceId, messageId, content, type }` 的列表。

- **4.3 跨域跳转 (Cross-Workspace Routing)**
- **功能描述**：在聚合列表中点击某条消息，系统自动切换到目标 Workspace。
- **前端实现**：
- 不尝试在当前页面渲染异构数据（这会非常复杂）。
- **硬路由跳转**：点击列表项 -> 获取目标的 `workspaceId` -> `router.push(/workspace/${targetId}/...)`。
- 这样用户点击后，界面会刷新并进入目标工作区的上下文，体验流畅且逻辑解耦。

---

### 建议开发顺序

1. **Workspace Header** (新消息 & 筛选) —— _最简单，热身。_
2. **User Profile** —— _独立模块，容易完成。_
3. **Algolia Search** —— _技术难点，需要引入外部服务，优先攻克。_
4. **Cross-Workspace Aggregation** —— _压轴大戏，涉及后端索引调整和全局逻辑，最后做。_
