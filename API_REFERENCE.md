# CombFind 接口摘要

后端默认地址：`http://localhost:8001/api`

## 检索

### `POST /search`

传统混合检索。

请求：

```json
{
  "formula": "\\sum_{k=0}^{n}\\binom{n}{k}=2^n",
  "input_type": "latex"
}
```

返回结果包含：

- `similarity`
- `structural_score`
- `semantic_score`
- `normalized_score`
- `equivalence_score`
- `vector_score`
- `reasoning_steps`

### `POST /search/ai-enhanced`

AI 增强检索，可选指定模型配置。

```json
{
  "formula": "C_n=\\frac{1}{n+1}\\binom{2n}{n}",
  "use_ai": true,
  "top_k": 10,
  "config_id": "optional-ai-config-id"
}
```

未传 `config_id` 时使用本地规则推理链。

## 评测

### `GET /admin/evaluation/run?top_k=10`

运行内置评测集，返回：

- `top1_accuracy`
- `recall_at_k`
- `precision_at_k`
- `mrr`
- `ndcg_at_k`
- `failed_cases`

## 向量检索

### `GET /admin/vector/status`

查看 pgvector 环境是否就绪，以及当前本地 embedding 维度。

### `GET /admin/vector/export`

导出当前公式库的本地向量记录，用于初始化 pgvector 表。

### `POST /admin/vector/sync`

将当前 JSON 公式库和 64 维 embedding 写入 PostgreSQL + pgvector。

未配置数据库或连接失败时返回 `success=false`，系统仍会使用本地 token 向量检索。

## AI 配置与日志

### `POST /admin/ai-configs`

创建 AI 配置。API Key 会保存到 `ai_config_secrets.json`，列表接口只返回脱敏值。

### `POST /admin/ai-configs/{config_id}/test`

使用指定配置进行真实模型连通性测试。

### `GET /admin/ai-call-logs?limit=50`

查看最近 LLM 调用日志。

AI Key 保存在 `ai_config_secrets.json` 时会经过本地密钥封装；生产部署建议设置 `COMBFIND_SECRET_KEY`，并迁移到数据库加密字段或密钥管理服务。

## 公式 OCR

### `GET /ai/ocr/status`

查看 OCR 状态。文本文件 fallback 始终可用，图片 OCR 需要配置 Mathpix。

### `GET /ai/ocr/self-test`

运行文本 fallback 自测，用固定 LaTeX 文本验证 OCR 入口到公式提取的链路。

### `POST /ai/ocr-formula`

支持：

- `.txt`
- `.tex`
- `.md`
- 图片文件，需配置 `MATHPIX_APP_ID` 和 `MATHPIX_APP_KEY`

请求：

```json
{
  "filename": "formula.png",
  "content_type": "image/png",
  "content_base64": "base64-encoded-file-content"
}
```

也可以直接传文本：

```json
{
  "filename": "formula.tex",
  "content_type": "text/plain",
  "text": "$$\\sum_{k=0}^{n}\\binom{n}{k}=2^n$$"
}
```

返回：

- `latex`
- `raw_text`
- `provider`
- `extracted_formulas`
