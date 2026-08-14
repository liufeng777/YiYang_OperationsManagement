# AGENTS.md

本文件用于规范 AI 智能体（AGENTS）在本仓库中的协作方式。AGENTS 在开始任何开发任务前，请先阅读本文件并严格遵守以下约定。

## 项目概述

- 名称：YiYang Admin —— 运营管理后台前端
- 技术栈：React 19 + TypeScript + antd 6 + axios + zustand 5 + react-router-dom 6 + less（Vite 5 构建）
- 构建 / 运行命令：

```bash
npm install     # 安装依赖
npm run dev     # 本地开发（http://localhost:5173）
npm run build   # 类型检查 + 生产构建
npm run type-check  # 仅类型检查
```

## 目录结构

```
src/
├── api/            # 接口层：modules/ 下按业务模块拆分，统一从 @/api 导出
├── assets/         # 静态资源（图片等）
├── components/     # 通用组件（如 PageContainer、PageLoading）
├── config/         # 全局配置（antd 主题 antdTheme.ts）
├── hooks/          # 自定义 Hooks
├── layouts/        # 布局组件（BasicLayout、SiderMenu、HeaderBar）
├── pages/          # 页面（按一级导航建目录）
├── router/         # 路由与菜单配置（routes.tsx 为单一数据源）
├── store/          # 全局状态（zustand，modules/ 下按领域拆分）
├── styles/         # less 设计变量（variables.less）、混入（mixins.less）、全局样式
├── types/          # 全局类型定义
└── utils/          # 工具函数（request.ts 为 axios 封装）
```

## 重要约定

### 1. 路由与菜单（重要）

- **单一数据源**：[src/router/routes.tsx](src/router/routes.tsx) 同时驱动「侧边栏一级导航」「二级导航」「路由表」。
- 一级导航 `path` 为绝对路径；二级导航 `path` 为相对路径（`''` 表示该一级导航默认页）。
- 新增一级导航 → 在 `routes` 数组追加；新增二级导航 → 在对应 `children` 追加。
- 不在菜单展示的页面（如详情页）设置 `meta.hideInMenu = true`。
- 页面文件放入 `src/pages/<模块>/`，懒加载引用，**禁止直接手写重复的 `Route` 定义**。
- 修改 `routes.tsx` 后无需改菜单组件，菜单由 [src/router/menu.tsx](src/router/menu.tsx) 自动生成。

### 2. 样式与设计规范（重要）

- 所有颜色、字号、间距一律使用 [src/styles/variables.less](src/styles/variables.less) 中的变量，禁止硬编码色值/字号。
- 常用文本样式使用 [src/styles/mixins.less](src/styles/mixins.less) 混入（如 `.text-title-page()`、`.card-surface()`）。
- 每个组件的 less 文件建议与其 tsx 同目录同名（如 `index.tsx` + `index.less`）。
- 修改设计规范时，须**同步**更新 `src/styles/variables.less` 与 [src/config/antdTheme.ts](src/config/antdTheme.ts)（antd 主题 token）。
- 统一字体 Noto Sans SC（已在 index.html 引入，样式变量 `@font-family-base`）。

### 3. 接口请求

- 所有请求通过 [src/utils/request.ts](src/utils/request.ts) 导出的 `http.get/post/put/delete` 发起。
- 后端统一返回 `{ code, message, data }`，`code === 0` 为成功；拦截器已自动解包 `data` 并做错误提示 / 401 处理。
- 接口方法按业务模块写在 `src/api/modules/<模块>.ts`，并导出对应 TS 类型；页面从 `@/api` 引入，禁止直接调用 axios。
- 开发环境通过 Vite proxy 转发 `/api`（见 vite.config.ts），后端地址需在代理中调整。

### 4. 状态管理

- 全局状态使用 zustand，按领域拆分到 `src/store/modules/<名称>.ts`，并在 `src/store/index.ts` 统一导出。
- 需持久化的状态使用 `persist` 中间件（如用户信息）。
- 页面级 / 组件级状态优先使用 React 本地 state，避免滥用全局 store。

### 5. 代码风格

- 使用 TypeScript 严格模式，组件统一函数式 + Hooks，`import type` 用于仅类型导入。
- 路径别名：`@/` → `src/`。
- 提交信息格式：`<类型>(<模块>): <说明>`，如 `feat(institution): 新增机构审核列表`、`fix(order): 修复金额精度问题`。
- 不引入未经评估的第三方依赖；确需新增时先在方案中说明理由。

### 6. 工作日志（强制）

- 每次开发任务完成后，必须在 `WORKLOG/worklog_YYYY-MM-DD.md` 中追加一条工作日志（模板见该文件既有记录），署名格式 `模型ID@Trae`。

## 禁止事项

- 不硬编码设计色值 / 字号 / 间距，不绕过 `http` 直接使用 axios。
- 不手工维护重复的路由 / 菜单定义。
- 不删除或破坏 `variables.less`、`antdTheme.ts`、`routes.tsx` 的单一来源原则。
