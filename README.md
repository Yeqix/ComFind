# CombFind - 组合数学公式检索系统

一个面向组合数学公式的垂直检索工具，目标类似 "组合数学公式版 OEIS"。

## 一键启动

### 环境要求
- Python 3.8+
- Node.js 16+

### 快速开始

```bash
# 克隆项目后，直接运行
python start.py
```

启动器会自动：
1. 检查并安装 Python 依赖
2. 检查并安装前端依赖 (npm install)
3. 启动后端服务 (端口 8001)
4. 启动前端服务 (端口 5173)
5. 自动打开浏览器

访问地址：
- **前端界面**: http://localhost:5173
- **API 接口**: http://localhost:8001
- **API 文档**: http://localhost:8001/docs

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- KaTeX (数学公式渲染)
- React Router (路由)
- Axios (HTTP 请求)

### 后端
- Python 3.9+
- FastAPI (Web 框架)
- Pydantic (数据验证)
- 本地 JSON 文件持久化

## 项目结构

```
e:/AIProject/
├── start.py            # 一键启动脚本
├── frontend/           # React + TypeScript + Vite 前端
│   ├── src/
│   │   ├── components/   # 通用组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API 请求
│   │   └── ...
│   └── package.json
│
├── backend/            # FastAPI 后端
│   ├── app/
│   │   ├── api/          # 路由层
│   │   ├── services/     # 业务逻辑
│   │   ├── data/         # 数据文件存储
│   │   └── main.py       # 应用入口
│   └── requirements.txt
│
├── PRD.md              # 产品需求文档
├── TECH_DESIGN.md      # 技术设计文档
└── AGENT.md            # 开发规范
```

## 数据持久化

所有数据自动保存在 `backend/app/data/` 目录：
- `formulas.json` - 公式数据
- `ai_configs.json` - AI 配置数据

重启服务后数据自动恢复。

## API 接口

### 公式检索
- `POST /api/search` - 搜索相似公式
- `POST /api/search/ai-enhanced` - AI 增强搜索
- `GET /api/formulas/{id}` - 获取公式详情

### 管理后台
- `GET /api/admin/formulas` - 获取公式列表
- `POST /api/admin/formulas` - 创建新公式
- `PUT /api/admin/formulas/{id}` - 更新公式

### AI 配置
- `GET /api/admin/ai-configs` - 获取 AI 配置列表
- `POST /api/admin/ai-configs` - 创建 AI 配置

## 页面说明

1. **首页** (`/`) - 公式输入和搜索
2. **搜索结果页** (`/search`) - 显示相似公式列表
3. **公式详情页** (`/formula/:id`) - 显示公式详细信息
4. **管理后台** (`/admin`) - 添加和管理公式

## 开发规范

参考 `AGENT.md` 了解详细的开发规范和要求。

## 数据模型

参考 `TECH_DESIGN.md` 了解数据模型设计。

## 许可证

MIT
