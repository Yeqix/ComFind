# AI 自动填充功能使用指南

## 功能介绍

AddAutofill 组件能够根据用户输入的 LaTeX 公式，自动识别公式类型并填充以下信息：

- **标题**：自动生成的公式名称
- **分类**：公式所属的组合数学类别（14 种分类）
- **标签**：相关关键词标签
- **描述**：公式的用途和意义
- **适用条件**：变量的约束条件
- **参考文献**：建议的参考书籍和资料

## 工作原理

### 1. 本地规则引擎（默认）

系统内置了常见组合数学公式的识别规则：

| 识别模式 | 分类 | 示例 |
|---------|------|------|
| `\sum + \binom` | 二项式恒等式 | `\sum_{k=0}^n \binom{n}{k}` |
| `F_{n} = F_{n-1} + F_{n-2}` | Fibonacci 数 | 递推公式 |
| `S(n,k)` 或 `\sum S` | Stirling 数 | Stirling 恒等式 |
| `C_n` 或 Catalan 相关 | Catalan 相关 | Catalan 数公式 |
| `G(x)` 或生成函数形式 | 生成函数 | 母函数表达式 |

### 2. AI API 增强（可选）

如需更精准的识别，可以配置大模型 API：

#### 配置 OpenAI API

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-api-key-here"

# 或永久设置（系统环境变量）
setx OPENAI_API_KEY "sk-your-api-key-here"
```

#### 配置 Claude API

```bash
$env:ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
```

#### 修改后端配置

编辑 `backend/app/services/ai_service.py` 中的 `_call_ai_api` 方法，取消注释 API 调用代码：

```python
# 示例：OpenAI 集成
import openai

client = openai.OpenAI(api_key=api_key)
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{
        "role": "user",
        "content": f"分析这个组合数学公式: {latex}\n请识别：1)公式类型 2)所属分类 3)适用条件 4)建议标签"
    }]
)
# 解析响应...
```

## 使用方式

### 在公式录入页面

1. 进入 `/admin` 管理后台
2. 在 LaTeX 公式输入框中输入公式，例如：
   ```
   \sum_{k=0}^{n} \binom{n}{k} = 2^n
   ```
3. 点击 **"AI 自动填充"** 按钮
4. 系统自动识别并填充标题、分类、描述等信息
5. 检查并修改自动填充的内容
6. 提交保存

### 验证功能

点击 **"仅验证"** 按钮可以：
- 检查 LaTeX 语法错误（括号匹配等）
- 检测可能的拼写错误
- 给出改进建议

## API 端点

### 自动填充

```http
POST /api/ai/autofill
Content-Type: application/json

{
  "latex": "\\sum_{k=0}^{n} \\binom{n}{k} = 2^n"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "title": "二项式求和公式",
    "category": "二项式恒等式",
    "tags": ["求和", "二项式系数"],
    "description": "二项式系数的基本求和公式",
    "conditions": "n \\geq 0",
    "references": ["组合数学, Richard P. Stanley"],
    "confidence": 0.85,
    "method": "rule"
  },
  "validation": {
    "is_valid": true,
    "issues": [],
    "suggestions": []
  }
}
```

### 公式验证

```http
POST /api/ai/validate
Content-Type: application/json

{
  "latex": "\\binom{n}{k}"
}
```

## 支持的公式分类

1. **二项式恒等式** - 二项式系数相关公式
2. **排列与组合计数** - 计数原理公式
3. **Stirling 数** - 第一/二类 Stirling 数
4. **Bell 数** - 集合分拆数
5. **Catalan 相关** - Catalan 数及其应用
6. **分拆理论** - 整数分拆
7. **生成函数** - 形式幂级数
8. **递推关系** - 数列递推定义
9. **容斥原理** - 包含-排除公式
10. **q-组合** - q-模拟组合
11. **概率组合公式** - 组合概率
12. **Fibonacci 数** - Fibonacci 数列
13. **Lucas 数** - Lucas 数列
14. **其他** - 未分类公式

## 示例公式

### 示例 1：二项式定理
```
\sum_{k=0}^{n} \binom{n}{k} x^k = (1+x)^n
```
- 识别分类：二项式恒等式
- 建议标签：求和、二项式系数、生成函数

### 示例 2：Fibonacci 递推
```
F_{n} = F_{n-1} + F_{n-2}
```
- 识别分类：Fibonacci 数
- 建议标签：Fibonacci、递推
- 适用条件：n \geq 2

### 示例 3：Catalan 数
```
C_n = \frac{1}{n+1}\binom{2n}{n}
```
- 识别分类：Catalan 相关
- 建议标签：Catalan数、闭式
- 参考文献：Enumerative Combinatorics

## 常见问题

### Q1: 自动填充不准确怎么办？
- 本地规则引擎基于模式匹配，对于复杂公式可能不够精准
- 建议配置 OpenAI API 以获得更好的识别效果
- 始终检查并手动修改自动填充的内容

### Q2: 如何添加新的识别规则？
编辑 `backend/app/services/ai_service.py`，在 `FORMULA_PATTERNS` 中添加新模式：

```python
FORMULA_PATTERNS = {
    r'你的正则表达式': {
        'category': '分类名称',
        'tags': ['标签1', '标签2'],
        'title_template': '标题模板',
    },
}
```

### Q3: API 调用失败怎么办？
- 检查环境变量是否设置正确
- 检查 API Key 是否有效
- 查看后端日志获取详细错误信息
- 系统会自动回退到本地规则引擎

### Q4: 置信度是什么意思？
- 置信度表示 AI 对识别结果的把握程度
- 0.9+：高置信度，结果通常准确
- 0.7-0.9：中等置信度，需要检查
- 低于 0.7：建议手动填写

## 技术细节

### 组件架构

```
AddFormula (公式录入)
  └── AddAutofill (自动填充组件)
       ├── 调用 /api/ai/autofill
       ├── 显示 AI 分析结果
       └── 提供验证反馈

AI Service (后端)
  ├── 本地规则引擎 (FORMULA_PATTERNS)
  ├── 变量提取器
  └── AI API 接口 (可选)
```

### 前端 Hook

```typescript
import { useAutofill } from './components/AddAutofill'

function MyComponent() {
  const { autofillData, isAutofilling, doAutofill } = useAutofill()
  
  // 执行自动填充
  const handleClick = async () => {
    const data = await doAutofill('\\sum_{k=0}^n \\binom{n}{k}')
    console.log(data)
  }
}
```
