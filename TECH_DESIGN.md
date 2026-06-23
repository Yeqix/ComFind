1. 下面按照你给的“记账应用技术设计”格式，给出这个**组合数学公式检索应用**的推荐技术设计。

   ---

   # 组合数学公式检索应用技术设计

   ## 技术栈
   - 前端：React + TypeScript + Vite
   - 样式：Tailwind CSS
   - 后端：Python + FastAPI
   - 数据存储：PostgreSQL
   - 向量检索：pgvector
   - 缓存：Redis
   - 数学公式渲染：KaTeX
   - 数学解析：SymPy + latex2sympy2
   - AI能力：大模型 API
   - 部署：Vercel（前端） + Docker / 云服务器（后端）

   ---

   ## 项目结构

   ### 前端
   ```text
   src/
     components/     # 通用组件
     pages/          # 页面
     hooks/          # 自定义 Hooks
     services/       # API 请求
     utils/          # 工具函数
     types/          # 类型定义
     styles/         # 全局样式
   ```

   ### 后端
   ```text
   app/
     api/            # 路由层
     core/           # 配置、常量
     models/         # 数据模型
     schemas/        # Pydantic 请求/响应结构
     services/       # 业务逻辑
     parsers/        # 公式解析
     normalizers/    # 公式标准化
     search/         # 检索与排序
     ai/             # AI 辅助能力
     db/             # 数据库相关
     utils/          # 工具函数
   ```

   ---

   ## 数据模型

   ### Formula（公式条目）
   - id: string
   - title: string
   - latex: string
   - normalizedExpression: string
   - formulaType: string
   - category: string
   - tags: string[]
   - description: string
   - conditions: string
   - references: string[]
   - createdAt: string
   - updatedAt: string

   ### SearchQuery（搜索记录）
   - id: string
   - inputFormula: string
   - normalizedFormula: string
   - topResultIds: string[]
   - createdAt: string

   ### FormulaFeature（公式特征）
   - formulaId: string
   - symbols: string[]
   - operators: string[]
   - hasSummation: boolean
   - hasRecurrence: boolean
   - hasGeneratingFunction: boolean
   - astHash: string
   - embedding: number[]

   ---

   ## 关键技术点
   1. 使用 **KaTeX** 渲染数学公式
   2. 使用 **SymPy + latex2sympy2** 解析 LaTeX 公式
   3. 使用 **公式标准化模块** 统一变量名、求和结构和常见写法
   4. 使用 **PostgreSQL** 存储公式、标签、来源等结构化数据
   5. 使用 **pgvector** 存储公式向量并做相似检索
   6. 使用 **规则检索 + 结构检索 + 向量检索** 的混合搜索方案
   7. 使用 **FastAPI** 提供公式解析、搜索、详情查询接口
   8. 使用 **Redis** 缓存热门搜索结果和 AI 响应
   9. 使用 **大模型 API** 做公式类型识别、错误提示、匹配原因解释
   10. 使用 **React Hooks** 管理前端搜索状态、结果状态和详情状态

   ---

   ## 前端页面设计

   ### 1. 首页
   - 公式输入框
   - LaTeX 输入提示
   - 实时公式预览
   - “检查并检索”按钮
   - 示例公式入口

   ### 2. 搜索结果页
   - 用户输入公式展示
   - AI 检查结果摘要
   - 相似公式列表
   - 相似度分数
   - 标签和分类
   - 结果筛选

   ### 3. 公式详情页
   - 公式标准展示
   - 公式名称/别名
   - 分类和标签
   - 说明与适用条件
   - 参考文献
   - 相关公式推荐

   ### 4. 管理后台页
   - 公式录入
   - 公式编辑
   - 标签管理
   - 重复项提示
   - 审核发布

   ---

   ## 后端接口设计

   ### 公式解析
   - `POST /api/parse`
     - 输入公式
     - 返回解析结果、标准化结果、基础检查信息

   ### 公式检索
   - `POST /api/search`
     - 输入公式
     - 返回最相似公式列表及相似度

   ### 公式详情
   - `GET /api/formulas/{id}`
     - 返回公式详情、标签、来源、相关公式

   ### 后台管理
   - `POST /api/admin/formulas`
     - 新增公式
   - `PUT /api/admin/formulas/{id}`
     - 编辑公式
   - `GET /api/admin/formulas`
     - 后台公式列表

   ---

   ## 检索流程设计

   1. 用户输入公式
   2. 前端调用解析接口
   3. 后端将 LaTeX 转换为可处理表达式
   4. 执行标准化处理
   5. 提取公式特征
   6. 执行混合检索：
      - 精确匹配
      - 结构相似匹配
      - 向量相似匹配
   7. 对候选结果重排序
   8. 调用 AI 生成匹配原因说明
   9. 返回最终结果给前端

   ---

   ## 部署方案

   ### 前端
   - 使用 **Vercel** 部署
   - 自动构建 React + Vite 项目

   ### 后端
   - 使用 **Docker** 部署 FastAPI 服务
   - 部署到云服务器或容器平台

   ### 数据库
   - 使用托管 **PostgreSQL**
   - 开启 **pgvector** 扩展

   ### 缓存
   - 使用托管 **Redis**

   ---

   ## MVP 实现建议

   ### 第一阶段最小可用版本
   1. 公式输入
   2. LaTeX 预览
   3. 公式解析
   4. 基础标准化
   5. 相似公式检索
   6. 结果列表展示
   7. 后台录入公式

   ### 可暂缓功能
   - OCR 图片识别
   - 用户登录
   - 收藏历史
   - 开放 API
   - 自动证明
   - 复杂知识图谱

   