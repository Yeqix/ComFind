# CombFind 部署说明

## 本地启动

```bash
python start.py
```

默认服务：

- 前端：http://localhost:5173
- 后端：http://localhost:8001
- API 文档：http://localhost:8001/docs

## 后端环境变量

基础配置：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/combfind
PGVECTOR_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/combfind
COMBFIND_SECRET_KEY=change-this-to-a-long-random-secret
```

OpenAI 兼容模型：

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

也可以使用通用变量：

```env
LLM_API_KEY=your_api_key
```

公式 OCR：

```env
MATHPIX_APP_ID=your_mathpix_app_id
MATHPIX_APP_KEY=your_mathpix_app_key
```

## pgvector 初始化

1. 安装 PostgreSQL 与 pgvector 扩展。
2. 创建数据库 `combfind`。
3. 执行 SQL：

```bash
psql "$DATABASE_URL" -f backend/app/db/pgvector_schema.sql
```

4. 启动后端后访问：

```text
GET /api/admin/vector/status
GET /api/admin/vector/export
POST /api/admin/vector/sync
```

`/api/admin/vector/export` 会导出当前公式库的 64 维本地 token-hash embedding，可用于初始化 `formula_embeddings` 表。

`/api/admin/vector/sync` 会把当前 JSON 公式库与 embedding 写入 PostgreSQL。同步成功后，搜索服务会优先使用 pgvector 召回候选公式，再执行原有混合相似度细排；数据库不可用时自动回退到本地检索。

## 构建前端

```bash
cd frontend
npm install
npm run build
```

当前 Vite 可能提示单个 chunk 超过 500 kB，这是体积优化提示，不影响构建产物可用性。

## 数据文件

后端当前仍保留 JSON 文件持久化：

- `backend/app/data/formulas.json`
- `backend/app/data/ai_configs.json`
- `backend/app/data/ai_config_secrets.json`
- `backend/app/data/evaluation_queries.json`
- `backend/app/data/llm_call_logs.json`

`ai_config_secrets.json` 中的 API Key 会经过本地密钥封装。部署到多人环境时，建议设置稳定的 `COMBFIND_SECRET_KEY`，并进一步迁移到数据库加密字段或密钥管理服务，同时限制文件权限。
