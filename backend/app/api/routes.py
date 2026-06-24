import base64
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
import os
import json
from pathlib import Path
from io import BytesIO
from difflib import SequenceMatcher

from app.schemas.formula import (
    FormulaCreate,
    FormulaResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
    ParseRequest,
    ParseResponse,
    FormulaFeatureResponse,
    ProofStep,
)
from app.schemas.ai_config import (
    AIConfigCreate,
    AIConfigUpdate,
    AIConfigResponse,
    AIConfigListResponse,
    AIConfigTestRequest,
    AIConfigTestResponse,
)
from app.services.search_service import SearchService
from app.services.ai_service import ai_service
from app.services.evaluation_service import EvaluationService
from app.services.ocr_service import FormulaOCRService
from app.services.secret_service import SecretService

router = APIRouter()
search_service = SearchService()
evaluation_service = EvaluationService()
ocr_service = FormulaOCRService()
secret_service = SecretService()

# 数据文件路径
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
AI_CONFIGS_FILE = DATA_DIR / "ai_configs.json"
AI_CONFIG_SECRETS_FILE = DATA_DIR / "ai_config_secrets.json"
FORMULAS_FILE = DATA_DIR / "formulas.json"
SEARCH_HISTORY_FILE = DATA_DIR / "search_history.json"
FAVORITES_FILE = DATA_DIR / "favorites.json"

# 内存数据库
AI_CONFIGS_DB: List[AIConfigResponse] = []
AI_CONFIG_SECRETS_DB: dict = {}
FORMULAS_DB: List[FormulaResponse] = []
SEARCH_HISTORY_DB: List[dict] = []
FAVORITES_DB: List[dict] = []


def next_formula_id() -> str:
    if not FORMULAS_DB:
        return "1"
    return str(max(int(formula.id) for formula in FORMULAS_DB) + 1)


def searchable_formulas() -> List[FormulaResponse]:
    return [formula for formula in FORMULAS_DB if formula.review_status == "approved"]


def load_json_list(path: Path) -> List[dict]:
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def save_json_list(path: Path, data: List[dict]):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)


def filter_formulas(formulas: List[FormulaResponse], request: SearchRequest) -> List[FormulaResponse]:
    filtered = formulas
    if request.review_status:
        filtered = [formula for formula in filtered if formula.review_status == request.review_status]
    if request.category:
        filtered = [formula for formula in filtered if formula.category == request.category]
    if request.tags:
        tag_set = set(request.tags)
        filtered = [formula for formula in filtered if tag_set.issubset(set(formula.tags))]
    if request.difficulty:
        filtered = [formula for formula in filtered if formula.difficulty == request.difficulty]
    if request.source:
        filtered = [
            formula for formula in filtered
            if request.source in (formula.source or "") or any(request.source in ref for ref in formula.references)
        ]
    if request.structure:
        filtered = [
            formula for formula in filtered
            if request.structure in search_service.extract_features(formula.latex)["structures"]
        ]
    return filtered


def save_search_history(query: str, normalized: str, results: List[SearchResult], filters: dict):
    record = {
        "id": str(uuid4()),
        "input_formula": query,
        "normalized_formula": normalized,
        "result_ids": [result.id for result in results],
        "filters": filters,
        "created_at": datetime.now().isoformat(),
    }
    SEARCH_HISTORY_DB.insert(0, record)
    del SEARCH_HISTORY_DB[100:]
    save_json_list(SEARCH_HISTORY_FILE, SEARCH_HISTORY_DB)


def load_data():
    """从JSON文件加载数据"""
    global AI_CONFIGS_DB, AI_CONFIG_SECRETS_DB, FORMULAS_DB, SEARCH_HISTORY_DB, FAVORITES_DB
    
    # 加载AI配置
    if AI_CONFIGS_FILE.exists():
        try:
            with open(AI_CONFIGS_FILE, 'r', encoding='utf-8') as f:
                configs_data = json.load(f)
                AI_CONFIGS_DB = [AIConfigResponse(**config) for config in configs_data]
            print(f"[INFO] 已加载 {len(AI_CONFIGS_DB)} 个AI配置")
        except Exception as e:
            print(f"[ERROR] 加载AI配置失败: {e}")
            AI_CONFIGS_DB = []

    if AI_CONFIG_SECRETS_FILE.exists():
        try:
            with open(AI_CONFIG_SECRETS_FILE, 'r', encoding='utf-8') as f:
                AI_CONFIG_SECRETS_DB = json.load(f)
            migrated = False
            for config_id, value in list(AI_CONFIG_SECRETS_DB.items()):
                if isinstance(value, str):
                    AI_CONFIG_SECRETS_DB[config_id] = secret_service.encrypt(value)
                    migrated = True
            if migrated:
                save_ai_config_secrets()
            print(f"[INFO] 已加载 {len(AI_CONFIG_SECRETS_DB)} 个AI密钥")
        except Exception as e:
            print(f"[ERROR] 加载AI密钥失败: {e}")
            AI_CONFIG_SECRETS_DB = {}
    
    # 加载公式
    if FORMULAS_FILE.exists():
        try:
            with open(FORMULAS_FILE, 'r', encoding='utf-8') as f:
                formulas_data = json.load(f)
                FORMULAS_DB = [FormulaResponse(**formula) for formula in formulas_data]
            print(f"[INFO] 已加载 {len(FORMULAS_DB)} 个公式")
        except Exception as e:
            print(f"[ERROR] 加载公式失败: {e}")
            FORMULAS_DB = []

    SEARCH_HISTORY_DB = load_json_list(SEARCH_HISTORY_FILE)
    FAVORITES_DB = load_json_list(FAVORITES_FILE)


def save_ai_configs():
    """保存AI配置到JSON文件"""
    try:
        configs_data = [config.model_dump() for config in AI_CONFIGS_DB]
        with open(AI_CONFIGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(configs_data, f, ensure_ascii=False, indent=2, default=str)
        print(f"[INFO] 已保存 {len(AI_CONFIGS_DB)} 个AI配置")
    except Exception as e:
        print(f"[ERROR] 保存AI配置失败: {e}")


def save_ai_config_secrets():
    """保存AI配置密钥到单独文件，接口响应仍然只返回脱敏值。"""
    try:
        with open(AI_CONFIG_SECRETS_FILE, 'w', encoding='utf-8') as f:
            json.dump(AI_CONFIG_SECRETS_DB, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[ERROR] 保存AI密钥失败: {e}")


def save_formulas():
    """保存公式到JSON文件"""
    try:
        formulas_data = [formula.model_dump() for formula in FORMULAS_DB]
        with open(FORMULAS_FILE, 'w', encoding='utf-8') as f:
            json.dump(formulas_data, f, ensure_ascii=False, indent=2, default=str)
        print(f"[INFO] 已保存 {len(FORMULAS_DB)} 个公式")
    except Exception as e:
        print(f"[ERROR] 保存公式失败: {e}")


# 启动时加载数据
load_data()

# 如果没有数据，初始化默认公式
if not FORMULAS_DB:
    print("[INFO] 初始化默认公式数据...")
    now = datetime.now()
    FORMULAS_DB = [
    # 二项式恒等式
    FormulaResponse(
        id="1",
        title="二项式求和公式",
        latex="\\sum_{k=0}^{n} \\binom{n}{k} = 2^n",
        normalized_expression="sum_{k=0}^{n} binom{n}{k} = 2^n",
        category="二项式恒等式",
        tags=["求和", "二项式系数", "基本恒等式"],
        description="二项式系数的基本求和公式，表示 n 元集合的所有子集个数",
        conditions="n \\geq 0",
        references=["组合数学, Stanley, 第1章", "Concrete Mathematics, Graham et al."],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="2",
        title="交错二项式求和",
        latex="\\sum_{k=0}^{n} (-1)^k \\binom{n}{k} = 0",
        normalized_expression="sum_{k=0}^{n} (-1)^k binom{n}{k} = 0",
        category="二项式恒等式",
        tags=["求和", "二项式系数", "交错"],
        description="n > 0 时，奇数项与偶数项二项式系数之和相等",
        conditions="n > 0",
        references=["组合数学, Stanley, 第1章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="3",
        title="二项式系数对称性",
        latex="\\binom{n}{k} = \\binom{n}{n-k}",
        normalized_expression="binom{n}{k} = binom{n}{n-k}",
        category="二项式恒等式",
        tags=["对称性", "二项式系数"],
        description="二项式系数的对称性质",
        conditions="0 \\leq k \\leq n",
        references=["组合数学, Stanley, 第1章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="4",
        title="范德蒙德卷积",
        latex="\\sum_{k=0}^{r} \\binom{m}{k}\\binom{n}{r-k} = \\binom{m+n}{r}",
        normalized_expression="sum_{k=0}^{r} binom{m}{k} binom{n}{r-k} = binom{m+n}{r}",
        category="二项式恒等式",
        tags=["卷积", "二项式系数", "求和"],
        description="两个二项式系数序列的卷积公式",
        conditions="m, n, r \\geq 0",
        references=["组合数学, Stanley, 第1章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="5",
        title="中心二项式系数",
        latex="\\binom{2n}{n}",
        normalized_expression="binom{2n}{n}",
        category="二项式恒等式",
        tags=["中心", "二项式系数"],
        description="中心二项式系数，Catalan 数的基础",
        conditions="n \\geq 0",
        references=["OEIS A000984"],
        created_at=now,
        updated_at=now,
    ),

    # Catalan 数
    FormulaResponse(
        id="6",
        title="Catalan 数闭式公式",
        latex="C_n = \\frac{1}{n+1}\\binom{2n}{n}",
        normalized_expression="C_n = frac{1}{n+1} binom{2n}{n}",
        category="Catalan 数",
        tags=["闭式", "组合数", "经典序列"],
        description="Catalan 数的闭式表达式，计数多种组合结构",
        conditions="n \\geq 0",
        references=["组合数学, Stanley, 第2章", "OEIS A000108"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="7",
        title="Catalan 数递推关系",
        latex="C_{n+1} = \\sum_{i=0}^{n} C_i C_{n-i}",
        normalized_expression="C_{n+1} = sum_{i=0}^{n} C_i C_{n-i}",
        category="Catalan 数",
        tags=["递推", "卷积", "生成函数"],
        description="Catalan 数的卷积型递推关系",
        conditions="n \\geq 0",
        references=["组合数学, Stanley, 第2章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="8",
        title="Catalan 数生成函数",
        latex="\\sum_{n=0}^{\\infty} C_n x^n = \\frac{1 - \\sqrt{1-4x}}{2x}",
        normalized_expression="sum_{n=0}^{infty} C_n x^n = frac{1 - sqrt{1-4x}}{2x}",
        category="Catalan 数",
        tags=["生成函数", "解析形式"],
        description="Catalan 数的普通生成函数",
        conditions="|x| < 1/4",
        references=["组合数学, Stanley, 第2章"],
        created_at=now,
        updated_at=now,
    ),

    # Stirling 数
    FormulaResponse(
        id="9",
        title="Stirling 数第二类显式公式",
        latex="S(n,k) = \\frac{1}{k!}\\sum_{j=0}^{k}(-1)^{k-j}\\binom{k}{j}j^n",
        normalized_expression="S(n,k) = frac{1}{k!} sum_{j=0}^{k} (-1)^{k-j} binom{k}{j} j^n",
        category="Stirling 数",
        tags=["显式公式", "容斥原理", "集合划分"],
        description="第二类 Stirling 数计算 n 元集合划分为 k 个非空子集的方式数",
        conditions="n \\geq k \\geq 0",
        references=["组合数学, Stanley, 第1章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="10",
        title="Stirling 数与 Bell 数",
        latex="\\sum_{k=0}^{n} S(n,k) = B_n",
        normalized_expression="sum_{k=0}^{n} S(n,k) = B_n",
        category="Stirling 数",
        tags=["Bell 数", "求和", "集合划分"],
        description="Bell 数是所有第二类 Stirling 数之和，表示集合划分的总数",
        conditions="n \\geq 0",
        references=["OEIS A000110"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="11",
        title="Stirling 数递推关系",
        latex="S(n+1,k) = kS(n,k) + S(n,k-1)",
        normalized_expression="S(n+1,k) = k S(n,k) + S(n,k-1)",
        category="Stirling 数",
        tags=["递推", "递推关系"],
        description="第二类 Stirling 数的基本递推公式",
        conditions="n \\geq 0, k \\geq 1",
        references=["组合数学, Stanley, 第1章"],
        created_at=now,
        updated_at=now,
    ),

    # 生成函数
    FormulaResponse(
        id="12",
        title="中心二项式生成函数",
        latex="\\sum_{n=0}^{\\infty} \\binom{2n}{n} x^n = \\frac{1}{\\sqrt{1-4x}}",
        normalized_expression="sum_{n=0}^{infty} binom{2n}{n} x^n = frac{1}{sqrt{1-4x}}",
        category="生成函数",
        tags=["二项式", "解析形式"],
        description="中心二项式系数的普通生成函数",
        conditions="|x| < 1/4",
        references=["生成函数, Wilf, 第2章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="13",
        title="指数生成函数",
        latex="\\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = e^x",
        normalized_expression="sum_{n=0}^{infty} frac{x^n}{n!} = e^x",
        category="生成函数",
        tags=["指数", "解析形式", "基本"],
        description="指数函数的幂级数展开",
        conditions="所有 x",
        references=["数学分析, Rudin"],
        created_at=now,
        updated_at=now,
    ),

    # 其他重要恒等式
    FormulaResponse(
        id="14",
        title="Fibonacci 数二项式表示",
        latex="F_n = \\sum_{k=0}^{\\lfloor n/2 \\rfloor} \\binom{n-k-1}{k}",
        normalized_expression="F_n = sum_{k=0}^{floor n/2} binom{n-k-1}{k}",
        category="Fibonacci 数",
        tags=["二项式表示", "求和"],
        description="Fibonacci 数可用对角线二项式系数之和表示",
        conditions="n \\geq 1",
        references=["OEIS A000045"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="15",
        title="调和数与二项式",
        latex="\\sum_{k=1}^{n} \\binom{n}{k} H_k = 2^n (H_n - \\sum_{k=1}^{n} \\frac{1}{k 2^k})",
        normalized_expression="sum_{k=1}^{n} binom{n}{k} H_k = 2^n (H_n - sum_{k=1}^{n} frac{1}{k 2^k})",
        category="二项式恒等式",
        tags=["调和数", "求和", "高级"],
        description="涉及调和数和二项式系数的恒等式",
        conditions="n \\geq 1",
        references=["Concrete Mathematics, Graham et al., 第6章"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="16",
        title="多项式定理",
        latex="(x_1+x_2+\\cdots+x_m)^n = \\sum_{k_1+\\cdots+k_m=n} \\binom{n}{k_1,k_2,\\ldots,k_m} x_1^{k_1}\\cdots x_m^{k_m}",
        normalized_expression=search_service.normalize("(x_1+x_2+\\cdots+x_m)^n = \\sum_{k_1+\\cdots+k_m=n} \\binom{n}{k_1,k_2,\\ldots,k_m} x_1^{k_1}\\cdots x_m^{k_m}"),
        category="多项式恒等式",
        tags=["多项式定理", "多重求和", "组合计数"],
        description="二项式定理在多个变量上的推广，用于多类对象分配计数。",
        conditions="n >= 0, k_i >= 0",
        references=["Concrete Mathematics, Graham et al.", "Enumerative Combinatorics, Stanley"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="17",
        title="Bell 数指数生成函数",
        latex="\\sum_{n=0}^{\\infty} B_n \\frac{x^n}{n!} = e^{e^x-1}",
        normalized_expression=search_service.normalize("\\sum_{n=0}^{\\infty} B_n \\frac{x^n}{n!} = e^{e^x-1}"),
        category="Bell 数",
        tags=["Bell数", "指数生成函数", "集合划分"],
        description="Bell 数的指数生成函数，刻画集合划分总数。",
        conditions="n >= 0",
        references=["OEIS A000110", "Enumerative Combinatorics, Stanley"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="18",
        title="Stirling 第一类数递推",
        latex="s(n+1,k) = s(n,k-1) - n s(n,k)",
        normalized_expression=search_service.normalize("s(n+1,k) = s(n,k-1) - n s(n,k)"),
        category="Stirling 数",
        tags=["第一类Stirling数", "递推", "排列轮换"],
        description="第一类 Stirling 数的基本递推关系，描述排列轮换数。",
        conditions="n >= k >= 0",
        references=["Enumerative Combinatorics, Stanley", "Concrete Mathematics, Graham et al."],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="19",
        title="整数拆分生成函数",
        latex="\\sum_{n=0}^{\\infty} p(n)x^n = \\prod_{k=1}^{\\infty}\\frac{1}{1-x^k}",
        normalized_expression=search_service.normalize("\\sum_{n=0}^{\\infty} p(n)x^n = \\prod_{k=1}^{\\infty}\\frac{1}{1-x^k}"),
        category="整数拆分",
        tags=["整数拆分", "生成函数", "无限乘积"],
        description="整数拆分函数 p(n) 的普通生成函数。",
        conditions="|x| < 1",
        references=["The Theory of Partitions, Andrews", "OEIS A000041"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="20",
        title="q-二项式定理",
        latex="\\prod_{i=0}^{n-1}(1+q^i x)=\\sum_{k=0}^{n} q^{\\binom{k}{2}} {n \\brack k}_q x^k",
        normalized_expression=search_service.normalize("\\prod_{i=0}^{n-1}(1+q^i x)=\\sum_{k=0}^{n} q^{\\binom{k}{2}} {n \\brack k}_q x^k"),
        category="q-组合",
        tags=["q-二项式", "高斯二项式系数", "生成函数"],
        description="q-二项式定理，连接有限乘积与高斯二项式系数。",
        conditions="n >= 0",
        references=["Basic Hypergeometric Series, Gasper and Rahman", "Enumerative Combinatorics, Stanley"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="21",
        title="Burnside 引理",
        latex="|X/G| = \\frac{1}{|G|}\\sum_{g\\in G}|X^g|",
        normalized_expression=search_service.normalize("|X/G| = \\frac{1}{|G|}\\sum_{g\\in G}|X^g|"),
        category="群作用计数",
        tags=["Burnside引理", "轨道计数", "对称性"],
        description="用群元素不动点数量平均值计算轨道数。",
        conditions="G 为有限群",
        references=["A Course in Enumeration, Aigner", "Enumerative Combinatorics, Stanley"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="22",
        title="Vandermonde 恒等式",
        latex="\\sum_{k=0}^{r}\\binom{m}{k}\\binom{n}{r-k}=\\binom{m+n}{r}",
        normalized_expression=search_service.normalize("\\sum_{k=0}^{r}\\binom{m}{k}\\binom{n}{r-k}=\\binom{m+n}{r}"),
        category="二项式恒等式",
        tags=["Vandermonde", "卷积", "二项式系数"],
        description="二项式系数卷积恒等式，可解释为从两个集合中选取 r 个元素。",
        conditions="m,n,r >= 0",
        references=["Concrete Mathematics, Graham et al.", "Enumerative Combinatorics, Stanley"],
        created_at=now,
        updated_at=now,
    ),
    FormulaResponse(
        id="23",
        title="Euler 数递推型生成函数",
        latex="\\sum_{n=0}^{\\infty} A_n(t)\\frac{x^n}{n!}=\\frac{1-t}{e^{x(t-1)}-t}",
        normalized_expression=search_service.normalize("\\sum_{n=0}^{\\infty} A_n(t)\\frac{x^n}{n!}=\\frac{1-t}{e^{x(t-1)}-t}"),
        category="Euler 数",
        tags=["Eulerian多项式", "指数生成函数", "排列统计"],
        description="Eulerian 多项式的指数生成函数，刻画排列下降数分布。",
        conditions="n >= 0",
        references=["Enumerative Combinatorics, Stanley", "Concrete Mathematics, Graham et al."],
        created_at=now,
        updated_at=now,
    ),
]


def enrich_formula_metadata():
    """补齐公式标准化表达式、标签和参考文献，保证旧数据也能参与新检索。"""
    global FORMULAS_DB
    enriched = []
    now = datetime.now()
    for formula in FORMULAS_DB:
        analysis = ai_service.analyze_formula(formula.latex)
        tags = list(dict.fromkeys([*formula.tags, *analysis.get("tags", [])]))
        references = formula.references or analysis.get("references", [])
        source = formula.source or (references[0] if references else "待补充")
        difficulty = formula.difficulty or infer_formula_difficulty(formula)
        proof_sketch = formula.proof_sketch or infer_proof_sketch(formula)
        proof_steps = formula.proof_steps or infer_proof_steps(formula, proof_sketch)
        application_scenarios = formula.application_scenarios or infer_application_scenarios(formula)
        review_status = formula.review_status or "approved"
        enriched.append(
            formula.model_copy(
                update={
                    "normalized_expression": search_service.normalize(formula.latex),
                    "tags": tags,
                    "references": references,
                    "difficulty": difficulty,
                    "proof_sketch": proof_sketch,
                    "proof_steps": proof_steps,
                    "application_scenarios": application_scenarios,
                    "source": source,
                    "review_status": review_status,
                    "updated_at": formula.updated_at or now,
                }
            )
        )
    FORMULAS_DB = enriched


def infer_formula_difficulty(formula: FormulaResponse) -> str:
    latex = formula.latex
    category = formula.category
    if any(keyword in category for keyword in ["Burnside", "q-", "Eulerian"]) or "\\infty" in latex:
        return "较难"
    if "\\sum" in latex or "\\frac" in latex or "Stirling" in category or "Bell" in category:
        return "中等"
    return "基础"


def infer_proof_sketch(formula: FormulaResponse) -> str:
    category = formula.category
    if "二项式" in category:
        return "可由二项式定理展开或从集合子集计数的两种方式得到。"
    if "Catalan" in category:
        return "可由递推分解、生成函数方程或格路径计数推导。"
    if "Stirling" in category or "Bell" in category:
        return "可按集合划分的最后一个元素所在块分类，并结合递推或容斥得到。"
    if "生成函数" in category:
        return "可将组合对象按规模编码为幂级数，再通过代数运算提取系数。"
    return "可通过组合计数解释、生成函数展开或代数恒等变形证明。"


def infer_proof_steps(formula: FormulaResponse, proof_sketch: str) -> List[ProofStep]:
    features = search_service.extract_features(formula.latex)
    method = "结构识别"
    if features["has_summation"]:
        method = "求和/容斥"
    elif features["has_generating_function"]:
        method = "生成函数"
    elif "递推关系" in features["structures"]:
        method = "递推分类"
    elif "binom" in features["token_set"]:
        method = "组合计数"

    return [
        ProofStep(order=1, title="识别计数对象", detail=f"将公式归入“{formula.category}”并确认适用条件。", method="分类"),
        ProofStep(order=2, title="选择推导方法", detail=proof_sketch, method=method),
        ProofStep(order=3, title="整理为目标形式", detail="对中间表达式做代数整理或系数比较，得到当前公式的标准写法。", method="化简"),
    ]


def infer_application_scenarios(formula: FormulaResponse) -> List[str]:
    text = " ".join([formula.category, formula.title, *formula.tags])
    scenarios = []
    if "二项式" in text:
        scenarios.extend(["子集计数", "组合恒等式化简"])
    if "Catalan" in text:
        scenarios.extend(["括号匹配计数", "树结构计数", "路径计数"])
    if "Stirling" in text or "Bell" in text:
        scenarios.extend(["集合划分", "离散结构分类"])
    if "生成函数" in text:
        scenarios.extend(["序列计数", "递推求解"])
    if "Burnside" in text or "群" in text:
        scenarios.extend(["对称对象计数", "轨道计数"])
    return list(dict.fromkeys(scenarios or ["组合数学检索", "教学推导辅助"]))


enrich_formula_metadata()


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """搜索相似公式"""
    formula_pool = filter_formulas(FORMULAS_DB, request)
    results = search_service.search(request.formula, formula_pool)
    normalized = search_service.normalize(request.formula)
    save_search_history(
        request.formula,
        normalized,
        results,
        {
            "category": request.category,
            "tags": request.tags,
            "difficulty": request.difficulty,
            "source": request.source,
            "structure": request.structure,
            "review_status": request.review_status,
        },
    )
    return SearchResponse(
        results=results,
        normalized_formula=normalized,
        type_info="二项式恒等式" if "binom" in request.formula else "未知类型",
    )


@router.post("/search/ai-enhanced")
async def ai_enhanced_search(request: dict):
    """
    AI 增强的公式搜索
    结合传统相似度和 AI 语义理解，提供更精准的搜索结果
    
    Request:
    {
        "formula": "查询公式",
        "use_ai": true,  // 是否使用 AI 增强（需要配置 AI）
        "top_k": 10      // 返回结果数量
    }
    """
    query = request.get("formula", "")
    use_ai = request.get("use_ai", True)
    top_k = request.get("top_k", 10)
    config_id = request.get("config_id")
    filters = SearchRequest(
        formula=query or "x",
        category=request.get("category"),
        tags=request.get("tags") or [],
        difficulty=request.get("difficulty"),
        source=request.get("source"),
        structure=request.get("structure"),
        review_status=request.get("review_status", "approved"),
    )
    
    if not query:
        raise HTTPException(status_code=400, detail="请提供查询公式")
    
    # 检查是否有 AI 配置可用
    active_configs = [c for c in AI_CONFIGS_DB if c.enabled]
    has_env_key = bool(
        os.environ.get('OPENAI_API_KEY') or 
        os.environ.get('LLM_API_KEY') or
        os.environ.get('ANTHROPIC_API_KEY') or
        os.environ.get('AZURE_OPENAI_KEY')
    )
    
    # 转换公式列表为字典列表
    formula_pool = filter_formulas(FORMULAS_DB, filters)
    formulas = [f.model_dump() for f in formula_pool]
    
    # 本地规则推理链无需外部 Key；配置了 Key 时可在 ai_service 内继续扩展真实 LLM 调用。
    if use_ai:
        try:
            llm_options = build_llm_options(config_id, "ai-enhanced-search") if config_id else None
            # 使用 AI 增强搜索
            results = ai_service.ai_enhanced_search(query, formulas, top_k, llm_options=llm_options)
            
            # 转换为 SearchResult 格式
            search_results = []
            for r in results:
                search_results.append(SearchResult(
                    id=r.get('id', ''),
                    title=r.get('title', ''),
                    latex=r.get('latex', ''),
                    normalized_expression=r.get('normalized_expression', ''),
                    category=r.get('category', ''),
                    tags=r.get('tags', []),
                    description=r.get('description', ''),
                    conditions=r.get('conditions', ''),
                    references=r.get('references', []),
                    difficulty=r.get('difficulty'),
                    proof_sketch=r.get('proof_sketch'),
                    proof_steps=r.get('proof_steps', []),
                    application_scenarios=r.get('application_scenarios', []),
                    source=r.get('source'),
                    source_page=r.get('source_page'),
                    review_status=r.get('review_status', 'approved'),
                    created_at=r.get('created_at'),
                    updated_at=r.get('updated_at'),
                    similarity=r.get('combined_score', 0),
                    match_reason=f"{r.get('match_reason', '')} (AI评分: {r.get('ai_score', 0):.2f}, 传统: {r.get('traditional_score', 0):.2f})",
                    structural_score=r.get('structural_score'),
                    semantic_score=r.get('semantic_score'),
                    normalized_score=r.get('normalized_score'),
                    equivalence_score=r.get('equivalence_score'),
                    vector_score=r.get('vector_score'),
                    equivalence_reason=r.get('equivalence_reason'),
                    reasoning_steps=r.get('reasoning_steps', []),
                ))
            
            response = {
                "results": search_results,
                "normalized_formula": search_service.normalize(query),
                "type_info": ai_service.analyze_formula(query).get("category", "未知类型"),
                "ai_enhanced": True,
                "ai_available": True,
                "reasoning_mode": "local-rule-chain" if not (active_configs or has_env_key) else "llm-ready"
            }
            save_search_history(query, response["normalized_formula"], search_results, request)
            return response
        except Exception as e:
            import traceback
            print(f"[ERROR] AI enhanced search failed: {e}")
            print(traceback.format_exc())
            # 降级到传统搜索
            results = search_service.search(query, formula_pool, top_k)
            normalized = search_service.normalize(query)
            save_search_history(query, normalized, results, request)
            return {
                "results": results,
                "normalized_formula": normalized,
                "type_info": "二项式恒等式" if "binom" in query else "未知类型",
                "ai_enhanced": False,
                "ai_available": True,
                "error": str(e)
            }
    else:
        # 降级到传统搜索
        results = search_service.search(query, formula_pool, top_k)
        normalized = search_service.normalize(query)
        save_search_history(query, normalized, results, request)
        return {
            "results": results,
            "normalized_formula": normalized,
            "type_info": "二项式恒等式" if "binom" in query else "未知类型",
            "ai_enhanced": False,
            "ai_available": True,
            "reasoning_mode": "traditional"
        }


@router.post("/parse", response_model=ParseResponse)
async def parse(request: ParseRequest):
    """解析并检查公式"""
    normalized = search_service.normalize(request.formula)
    variables = search_service.extract_variables(request.formula)
    features = search_service.extract_features(request.formula)
    analysis = ai_service.analyze_formula(request.formula)
    
    hints = []
    if "binom" in request.formula or "\\binom" in request.formula:
        hints.append("识别为二项式系数相关公式")
    if "sum" in request.formula or "\\sum" in request.formula:
        hints.append("包含求和结构")
    
    return ParseResponse(
        success=True,
        normalized=normalized,
        type=analysis.get("category", "其他"),
        variables=variables,
        hints=hints,
        structures=sorted(features["structures"]),
        operators=features["operators"],
        ast_hash=features["ast_hash"],
        has_summation=features["has_summation"],
        has_recurrence=features["has_recurrence"],
        has_generating_function=features["has_generating_function"],
        complexity=features["complexity"],
    )


@router.get("/formulas/{formula_id}/features", response_model=FormulaFeatureResponse)
async def get_formula_features(formula_id: str):
    """获取公式结构特征字段，用于调试标准化、结构召回和向量检索。"""
    for formula in FORMULAS_DB:
        if formula.id == formula_id:
            return search_service.build_formula_feature(formula)
    raise HTTPException(status_code=404, detail="公式不存在")


@router.get("/formulas/{formula_id}", response_model=FormulaResponse)
async def get_formula(formula_id: str):
    """获取公式详情"""
    for formula in FORMULAS_DB:
        if formula.id == formula_id:
            return formula
    raise HTTPException(status_code=404, detail="公式不存在")


@router.get("/formulas/{formula_id}/related", response_model=List[FormulaResponse])
async def get_related_formulas(formula_id: str, limit: int = 6):
    """获取相关公式，优先使用显式 relation_ids，再按分类和标签推断。"""
    target = next((formula for formula in FORMULAS_DB if formula.id == formula_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="公式不存在")

    related: List[FormulaResponse] = []
    seen = {target.id}
    by_id = {formula.id: formula for formula in FORMULAS_DB}

    for related_id in [*target.relation_ids, *target.related_formula_ids]:
        formula = by_id.get(related_id)
        if formula and formula.id not in seen and formula.review_status == "approved":
            related.append(formula)
            seen.add(formula.id)
        if len(related) >= limit:
            return related

    target_tags = set(target.tags)
    candidates = []
    for formula in FORMULAS_DB:
        if formula.id in seen or formula.review_status != "approved":
            continue
        overlap = len(target_tags & set(formula.tags))
        category_match = 1 if formula.category == target.category else 0
        score = category_match * 2 + overlap
        if score > 0:
            candidates.append((score, formula))

    candidates.sort(key=lambda item: item[0], reverse=True)
    related.extend(formula for _, formula in candidates[: max(0, limit - len(related))])
    return related


@router.post("/admin/formulas", response_model=FormulaResponse)
async def create_formula(formula: FormulaCreate):
    """创建新公式"""
    now = datetime.now()
    new_formula = FormulaResponse(
        id=next_formula_id(),
        title=formula.title,
        latex=formula.latex,
        formula_type=formula.formula_type,
        normalized_expression=search_service.normalize(formula.latex),
        category=formula.category,
        tags=formula.tags,
        description=formula.description,
        conditions=formula.conditions,
        aliases=formula.aliases,
        references=formula.references,
        difficulty=formula.difficulty,
        proof_sketch=formula.proof_sketch,
        proof_steps=formula.proof_steps or infer_proof_steps(
            FormulaResponse(id="0", title=formula.title, latex=formula.latex, category=formula.category, tags=formula.tags),
            formula.proof_sketch or infer_proof_sketch(
                FormulaResponse(id="0", title=formula.title, latex=formula.latex, category=formula.category, tags=formula.tags)
            ),
        ),
        application_scenarios=formula.application_scenarios,
        source=formula.source,
        source_page=formula.source_page,
        review_status=formula.review_status or "pending",
        reviewed_at=formula.reviewed_at,
        review_notes=formula.review_notes,
        relation_ids=formula.relation_ids,
        related_formula_ids=formula.related_formula_ids,
        import_batch_id=formula.import_batch_id,
        created_at=now,
        updated_at=now,
    )
    FORMULAS_DB.append(new_formula)
    save_formulas()  # 保存到文件
    return new_formula


@router.get("/admin/formulas")
async def list_formulas():
    """获取所有公式列表"""
    return FORMULAS_DB


@router.post("/admin/formulas/duplicate-check")
async def duplicate_check(request: dict):
    """检查标准化、结构哈希、标题近似的重复候选。"""
    latex = str(request.get("latex", "")).strip()
    title = str(request.get("title", "")).strip()
    if not latex:
        raise HTTPException(status_code=400, detail="请提供 LaTeX 公式")

    normalized = search_service.normalize(latex)
    features = search_service.extract_features(latex)
    query_tokens = set(features["token_set"])
    candidates = []

    for formula in FORMULAS_DB:
        formula_features = search_service.extract_features(formula.latex)
        reasons = []
        score = 0.0
        if formula.normalized_expression == normalized:
            reasons.append("标准化表达式完全一致")
            score += 1.0
        if formula_features["ast_hash"] == features["ast_hash"]:
            reasons.append("结构哈希一致")
            score += 0.8
        if title and formula.title:
            title_score = SequenceMatcher(None, title, formula.title).ratio()
            if title_score > 0.6:
                reasons.append("标题高度相似")
                score += title_score * 0.4
        token_overlap = search_service._jaccard(query_tokens, set(formula_features["token_set"]))
        if token_overlap > 0.75:
            reasons.append("符号结构高度重合")
            score += token_overlap * 0.5
        if reasons:
            candidates.append(
                {
                    "formula": formula,
                    "score": round(score, 4),
                    "reasons": reasons,
                }
            )

    candidates.sort(key=lambda item: item["score"], reverse=True)
    return {
        "normalized_expression": normalized,
        "ast_hash": features["ast_hash"],
        "duplicate_count": len(candidates),
        "candidates": candidates[:10],
    }


@router.get("/history/search")
async def list_search_history(limit: int = 30):
    return {"history": SEARCH_HISTORY_DB[:limit]}


@router.delete("/history/search")
async def clear_search_history():
    SEARCH_HISTORY_DB.clear()
    save_json_list(SEARCH_HISTORY_FILE, SEARCH_HISTORY_DB)
    return {"success": True}


@router.get("/favorites")
async def list_favorites():
    favorite_ids = {item["formula_id"] for item in FAVORITES_DB}
    formulas = [formula for formula in FORMULAS_DB if formula.id in favorite_ids]
    return {"favorites": FAVORITES_DB, "formulas": formulas}


@router.post("/favorites/{formula_id}")
async def add_favorite(formula_id: str):
    if not any(formula.id == formula_id for formula in FORMULAS_DB):
        raise HTTPException(status_code=404, detail="公式不存在")
    if not any(item["formula_id"] == formula_id for item in FAVORITES_DB):
        FAVORITES_DB.insert(0, {"formula_id": formula_id, "created_at": datetime.now().isoformat()})
        save_json_list(FAVORITES_FILE, FAVORITES_DB)
    return {"success": True}


@router.delete("/favorites/{formula_id}")
async def remove_favorite(formula_id: str):
    FAVORITES_DB[:] = [item for item in FAVORITES_DB if item["formula_id"] != formula_id]
    save_json_list(FAVORITES_FILE, FAVORITES_DB)
    return {"success": True}


@router.post("/admin/formulas/{formula_id}/review", response_model=FormulaResponse)
async def review_formula(formula_id: str, request: dict):
    """审核公式。approved 会进入正式搜索，pending/rejected 不参与搜索。"""
    status = request.get("review_status")
    if status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="review_status 必须是 pending、approved 或 rejected")

    for index, formula in enumerate(FORMULAS_DB):
        if formula.id == formula_id:
            updated = formula.model_copy(
                update={
                    "review_status": status,
                    "review_notes": request.get("review_notes"),
                    "reviewed_at": datetime.now() if status in {"approved", "rejected"} else None,
                    "updated_at": datetime.now(),
                }
            )
            FORMULAS_DB[index] = updated
            save_formulas()
            return updated
    raise HTTPException(status_code=404, detail="公式不存在")


def decode_uploaded_content(request: dict) -> bytes:
    if "text" in request:
        return str(request["text"]).encode("utf-8")
    content_base64 = request.get("content_base64", "")
    try:
        return base64.b64decode(content_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="content_base64 格式无效")


def extract_pages_from_upload(filename: str, content_type: Optional[str], data: bytes) -> List[dict]:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf") or content_type == "application/pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(data))
            pages = []
            for index, page in enumerate(reader.pages, start=1):
                pages.append({"page": index, "text": page.extract_text() or ""})
            return pages
        except ImportError:
            raise HTTPException(status_code=500, detail="当前环境缺少 pypdf，无法解析 PDF")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"PDF 解析失败: {exc}")

    try:
        return [{"page": 1, "text": data.decode("utf-8")}]
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="暂只支持 PDF 或 UTF-8 文本文档")


@router.post("/admin/pdf/extract")
async def extract_pdf_formulas(request: dict):
    """从 PDF/文本中抽取可人工确认的公式候选，并保留来源页码。"""
    filename = request.get("filename", "uploaded.pdf")
    content_type = request.get("content_type")
    data = decode_uploaded_content(request)
    if not data:
        raise HTTPException(status_code=400, detail="上传内容为空")

    pages = extract_pages_from_upload(filename, content_type, data)
    existing = {formula.normalized_expression for formula in FORMULAS_DB}
    candidates = []
    for page in pages:
        formulas = ai_service.batch_extract_formulas(page["text"], "auto")
        for item in formulas:
            normalized = search_service.normalize(item["latex"])
            candidates.append(
                {
                    **item,
                    "normalized_expression": normalized,
                    "source": filename,
                    "source_page": page["page"],
                    "duplicate": normalized in existing,
                }
            )

    return {
        "success": True,
        "filename": filename,
        "page_count": len(pages),
        "candidate_count": len(candidates),
        "duplicate_count": sum(1 for item in candidates if item["duplicate"]),
        "pages": pages,
        "candidates": candidates,
    }


@router.post("/admin/pdf/import-confirmed")
async def import_confirmed_pdf_formulas(request: dict):
    """导入人工确认后的 PDF 公式候选，默认进入待审核状态。"""
    candidates = request.get("formulas", [])
    if not isinstance(candidates, list) or not candidates:
        raise HTTPException(status_code=400, detail="请提供 formulas 列表")

    batch_id = request.get("import_batch_id") or str(uuid4())
    review_status = request.get("review_status", "pending")
    if review_status not in {"pending", "approved"}:
        raise HTTPException(status_code=400, detail="导入状态只能是 pending 或 approved")

    existing = {formula.normalized_expression for formula in FORMULAS_DB}
    imported = []
    skipped = []
    now = datetime.now()

    for item in candidates:
        latex = str(item.get("latex", "")).strip()
        if not latex:
            skipped.append({"reason": "empty_latex", "item": item})
            continue
        normalized = search_service.normalize(latex)
        if normalized in existing:
            skipped.append({"reason": "duplicate", "latex": latex})
            continue

        analysis = ai_service.analyze_formula(latex)
        new_formula = FormulaResponse(
            id=next_formula_id(),
            title=item.get("title") or analysis.get("title", "PDF 导入公式"),
            latex=latex,
            formula_type=item.get("formula_type"),
            normalized_expression=normalized,
            category=item.get("category") or analysis.get("category", "其他"),
            tags=item.get("tags") or analysis.get("tags", []),
            description=item.get("description") or "",
            conditions=item.get("conditions") or "",
            aliases=item.get("aliases") or [],
            references=item.get("references") or [item.get("source") or request.get("source") or "PDF 导入"],
            difficulty=item.get("difficulty") or infer_formula_difficulty(
                FormulaResponse(id="0", title="", latex=latex, category=item.get("category") or "", tags=[])
            ),
            proof_sketch=item.get("proof_sketch") or "",
            proof_steps=item.get("proof_steps") or infer_proof_steps(
                FormulaResponse(id="0", title=item.get("title") or "", latex=latex, category=item.get("category") or "", tags=item.get("tags") or []),
                item.get("proof_sketch") or "可通过组合计数解释、生成函数展开或代数恒等变形证明。",
            ),
            application_scenarios=item.get("application_scenarios") or [],
            source=item.get("source") or request.get("source"),
            source_page=item.get("source_page"),
            review_status=review_status,
            relation_ids=item.get("relation_ids") or [],
            related_formula_ids=item.get("related_formula_ids") or [],
            import_batch_id=batch_id,
            created_at=now,
            updated_at=now,
        )
        FORMULAS_DB.append(new_formula)
        existing.add(normalized)
        imported.append(new_formula)

    save_formulas()
    return {
        "success": True,
        "import_batch_id": batch_id,
        "imported_count": len(imported),
        "skipped_count": len(skipped),
        "imported": imported,
        "skipped": skipped,
    }


@router.get("/admin/formula-relations")
async def formula_relations(limit: int = 200, max_edges: int = 500):
    """返回公式关系图数据，包含显式 relation_ids 和按分类/标签推断的关系。"""
    formulas = FORMULAS_DB[: max(1, limit)]
    nodes = [
        {
            "id": formula.id,
            "title": formula.title,
            "category": formula.category,
            "tags": formula.tags,
            "review_status": formula.review_status,
        }
        for formula in formulas
    ]

    by_id = {formula.id: formula for formula in formulas}
    edges = []
    seen = set()

    for formula in formulas:
        for target_id in [*formula.relation_ids, *formula.related_formula_ids]:
            if target_id in by_id:
                key = tuple(sorted([formula.id, target_id])) + ("explicit",)
                if key not in seen:
                    seen.add(key)
                    edges.append({"source": formula.id, "target": target_id, "type": "explicit", "weight": 1.0})
                    if len(edges) >= max_edges:
                        return {
                            "node_count": len(nodes),
                            "edge_count": len(edges),
                            "nodes": nodes,
                            "edges": edges,
                        }

    for index, formula in enumerate(formulas):
        tags = set(formula.tags)
        for other in formulas[index + 1 :]:
            if formula.category != other.category:
                continue
            other_tags = set(other.tags)
            if not tags or not other_tags:
                continue
            overlap = len(tags & other_tags) / len(tags | other_tags)
            if overlap >= 0.5:
                key = tuple(sorted([formula.id, other.id])) + ("category-tag",)
                if key not in seen:
                    seen.add(key)
                    edges.append(
                        {
                            "source": formula.id,
                            "target": other.id,
                            "type": "category-tag",
                            "weight": round(overlap, 3),
                        }
                    )
                    if len(edges) >= max_edges:
                        return {
                            "node_count": len(nodes),
                            "edge_count": len(edges),
                            "nodes": nodes,
                            "edges": edges,
                        }

    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": nodes,
        "edges": edges,
    }


@router.get("/admin/vector/status")
async def vector_status():
    """查看本地向量检索和 pgvector 工程化准备状态。"""
    return search_service.vector_service.pgvector_status()


@router.post("/admin/vector/migrate")
async def migrate_vector_schema():
    """自动执行 PostgreSQL + pgvector schema 迁移。"""
    return search_service.vector_service.migrate_pgvector()


@router.get("/admin/vector/export")
async def export_vector_records():
    """导出当前公式库向量，供 pgvector 初始化或离线检查使用。"""
    records = search_service.vector_service.build_formula_records(FORMULAS_DB, search_service)
    return {
        "count": len(records),
        "dimensions": search_service.vector_service.dimensions,
        "embedding_model": "local-token-hash-v1",
        "records": records,
    }


@router.post("/admin/vector/sync")
async def sync_vector_records():
    """将当前公式库及 embedding 写入 PostgreSQL + pgvector。"""
    return search_service.vector_service.sync_pgvector(FORMULAS_DB, search_service)


@router.get("/admin/evaluation/run")
async def run_evaluation(top_k: int = 10):
    """运行内置检索评测集，返回 Recall@K、MRR、NDCG@K。"""
    return evaluation_service.run(searchable_formulas(), top_k=top_k)


@router.put("/admin/formulas/{formula_id}", response_model=FormulaResponse)
async def update_formula(formula_id: str, formula_update: FormulaCreate):
    """更新现有公式"""
    for i, formula in enumerate(FORMULAS_DB):
        if formula.id == formula_id:
            # 更新公式数据，保留原来的created_at
            updated_formula = FormulaResponse(
                id=formula_id,
                title=formula_update.title,
                latex=formula_update.latex,
                formula_type=formula_update.formula_type,
                normalized_expression=search_service.normalize(formula_update.latex),
                category=formula_update.category,
                tags=formula_update.tags,
                description=formula_update.description,
                conditions=formula_update.conditions,
                aliases=formula_update.aliases,
                references=formula_update.references,
                difficulty=formula_update.difficulty,
                proof_sketch=formula_update.proof_sketch,
                proof_steps=formula_update.proof_steps or formula.proof_steps,
                application_scenarios=formula_update.application_scenarios,
                source=formula_update.source,
                source_page=formula_update.source_page,
                review_status=formula_update.review_status or formula.review_status,
                reviewed_at=formula_update.reviewed_at or formula.reviewed_at,
                review_notes=formula_update.review_notes if formula_update.review_notes is not None else formula.review_notes,
                relation_ids=formula_update.relation_ids,
                related_formula_ids=formula_update.related_formula_ids,
                import_batch_id=formula_update.import_batch_id or formula.import_batch_id,
                created_at=formula.created_at,
                updated_at=datetime.now(),
            )
            FORMULAS_DB[i] = updated_formula
            save_formulas()  # 保存到文件
            return updated_formula
    raise HTTPException(status_code=404, detail="公式不存在")


@router.post("/ai/autofill")
async def autofill_formula(request: dict):
    """
    AI 自动填充公式信息
    根据 LaTeX 公式自动识别并填充标题、分类、标签、描述等信息
    """
    latex = request.get("latex", "")
    config_id = request.get("config_id")
    if not latex:
        raise HTTPException(status_code=400, detail="请提供 LaTeX 公式")

    # 使用 AI 服务分析公式
    llm_options = build_llm_options(config_id, "formula-autofill") if config_id else None
    result = ai_service.analyze_formula(latex, llm_options=llm_options, force_llm=bool(llm_options))

    # 验证公式
    validation = ai_service.validate_formula(latex)

    # 建议参考文献
    references = ai_service.suggest_references(result.get("category", ""), latex)

    return {
        "success": True,
        "data": {
            "title": result.get("title", ""),
            "category": result.get("category", "其他"),
            "tags": result.get("tags", []),
            "description": result.get("description", ""),
            "conditions": result.get("conditions", ""),
            "references": references,
            "confidence": result.get("confidence", 0.5),
            "method": result.get("method", "rule"),
        },
        "validation": validation,
    }


@router.post("/ai/validate")
async def validate_formula(request: dict):
    """
    验证公式语法并给出建议
    """
    latex = request.get("latex", "")
    if not latex:
        raise HTTPException(status_code=400, detail="请提供 LaTeX 公式")

    validation = ai_service.validate_formula(latex)
    return {
        "success": True,
        "validation": validation,
    }


@router.get("/ai/status")
async def check_ai_status():
    """
    检查 AI 服务是否可用（用于批量添加功能的前置检查）
    """
    # 检查是否有启用的 AI 配置
    print(f"[DEBUG] AI_CONFIGS_DB has {len(AI_CONFIGS_DB)} configs")
    for c in AI_CONFIGS_DB:
        print(f"[DEBUG] Config: id={c.id}, name={c.name}, enabled={c.enabled}")
    
    active_configs = [c for c in AI_CONFIGS_DB if c.enabled]
    print(f"[DEBUG] Active configs: {len(active_configs)}")
    
    # 检查环境变量中是否有 API Key
    has_env_key = bool(
        os.environ.get('OPENAI_API_KEY') or 
        os.environ.get('LLM_API_KEY') or
        os.environ.get('ANTHROPIC_API_KEY') or
        os.environ.get('AZURE_OPENAI_KEY')
    )
    
    available = len(active_configs) > 0 or has_env_key
    
    return {
        "available": available,
        "configs_count": len(active_configs),
        "has_env_key": has_env_key,
        "message": "AI 服务可用" if available else "请先配置 AI 服务",
    }


@router.post("/ai/batch-extract")
async def batch_extract_formulas(request: dict):
    """
    从文档内容中批量提取公式
    需要 AI 配置可用
    
    Request body:
    - content: 文档内容字符串
    - input_format: 输入格式 ("markdown", "latex", "auto")
    """
    # 检查 AI 是否可用
    active_configs = [c for c in AI_CONFIGS_DB if c.enabled]
    has_env_key = bool(
        os.environ.get('OPENAI_API_KEY') or 
        os.environ.get('LLM_API_KEY') or
        os.environ.get('ANTHROPIC_API_KEY') or
        os.environ.get('AZURE_OPENAI_KEY')
    )
    
    if not active_configs and not has_env_key:
        raise HTTPException(
            status_code=400, 
            detail="AI 服务未配置，请先添加 AI 配置"
        )
    
    content = request.get("content", "")
    input_format = request.get("input_format", "auto")
    
    if not content or len(content.strip()) < 10:
        raise HTTPException(status_code=400, detail="请提供有效的文档内容")
    
    # 使用 AI 服务批量提取公式
    formulas = ai_service.batch_extract_formulas(content, input_format)
    
    return {
        "success": True,
        "count": len(formulas),
        "formulas": formulas,
    }


@router.get("/ai/ocr/status")
async def ocr_status():
    """查看公式 OCR 能力配置状态。"""
    return ocr_service.status()


@router.get("/ai/ocr/self-test")
async def ocr_self_test():
    """运行 OCR 文本 fallback 自测，用于检查公式抽取链路。"""
    result = ocr_service.extract("self-test.tex", "text/plain", b"$$\\sum_{k=0}^{n}\\binom{n}{k}=2^n$$")
    return {
        "success": result.get("latex") == r"\sum_{k=0}^{n}\binom{n}{k}=2^n",
        "result": result,
    }


@router.post("/ai/ocr-formula")
async def ocr_formula(request: dict):
    """从图片或文本内容中提取公式，并返回可继续检索的 LaTeX。"""
    filename = request.get("filename", "")
    content_type = request.get("content_type")
    if "text" in request:
        data = str(request["text"]).encode("utf-8")
        content_type = content_type or "text/plain"
    else:
        content_base64 = request.get("content_base64", "")
        try:
            data = base64.b64decode(content_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="content_base64 格式无效")
    if not data:
        raise HTTPException(status_code=400, detail="上传文件为空")
    result = ocr_service.extract(filename, content_type, data)
    extracted = []
    if result.get("latex"):
        extracted = ai_service.batch_extract_formulas(str(result["latex"]), "auto")
    return {
        **result,
        "filename": filename,
        "content_type": content_type,
        "extracted_formulas": extracted,
    }


# ==========================================
# AI 配置管理 API
# ==========================================

# 注意：AI_CONFIGS_DB 已在文件开头定义


def mask_api_key(api_key: str) -> str:
    """脱敏处理 API Key"""
    if len(api_key) <= 8:
        return "****"
    return f"{api_key[:4]}****{api_key[-4:]}"


def get_ai_config_by_id(config_id: str):
    for config in AI_CONFIGS_DB:
        if config.id == config_id:
            return config
    return None


def build_llm_options(config_id: Optional[str], purpose: str):
    if not config_id:
        return None
    config = get_ai_config_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="AI配置不存在")
    api_key = secret_service.decrypt(AI_CONFIG_SECRETS_DB.get(config_id))
    if not api_key:
        raise HTTPException(status_code=400, detail="该AI配置缺少可用密钥，请重新保存API Key")
    return {
        "api_key": api_key,
        "base_url": config.api_url,
        "model": config.model,
        "provider": config.provider,
        "config_id": config.id,
        "purpose": purpose,
    }


@router.get("/admin/ai-configs", response_model=AIConfigListResponse)
async def list_ai_configs():
    """获取所有 AI 配置列表"""
    return {"configs": AI_CONFIGS_DB, "total": len(AI_CONFIGS_DB)}


@router.get("/admin/ai-call-logs")
async def list_ai_call_logs(limit: int = 50):
    """获取最近的 LLM 调用日志。"""
    return {
        "logs": ai_service.get_call_logs(limit=limit),
        "limit": limit,
    }


@router.get("/admin/ai-configs/{config_id}", response_model=AIConfigResponse)
async def get_ai_config(config_id: str):
    """获取单个 AI 配置详情"""
    for config in AI_CONFIGS_DB:
        if config.id == config_id:
            return config
    raise HTTPException(status_code=404, detail="AI配置不存在")


@router.post("/admin/ai-configs", response_model=AIConfigResponse)
async def create_ai_config(config: AIConfigCreate):
    """创建新的 AI 配置"""
    print(f"[DEBUG] Creating AI config: name={config.name}, provider={config.provider}, enabled={config.enabled}")
    now = datetime.now()
    new_config = AIConfigResponse(
        id=str(uuid4()),
        name=config.name,
        provider=config.provider,
        api_key_masked=mask_api_key(config.api_key),
        api_url=config.api_url,
        model=config.model,
        remark=config.remark,
        enabled=config.enabled,
        created_at=now,
        updated_at=now,
    )
    AI_CONFIGS_DB.append(new_config)
    AI_CONFIG_SECRETS_DB[new_config.id] = secret_service.encrypt(config.api_key)
    save_ai_configs()  # 保存到文件
    save_ai_config_secrets()
    print(f"[DEBUG] AI config created. Total configs: {len(AI_CONFIGS_DB)}")
    return new_config


@router.put("/admin/ai-configs/{config_id}", response_model=AIConfigResponse)
async def update_ai_config(config_id: str, config_update: AIConfigUpdate):
    """更新 AI 配置"""
    for i, config in enumerate(AI_CONFIGS_DB):
        if config.id == config_id:
            # 获取当前配置的数据
            config_dict = config.model_dump()
            
            # 获取更新的字段
            update_data = config_update.model_dump(exclude_unset=True)
            
            # 如果更新了 api_key，需要重新计算脱敏值
            if "api_key" in update_data:
                update_data["api_key_masked"] = mask_api_key(update_data["api_key"])
                AI_CONFIG_SECRETS_DB[config_id] = secret_service.encrypt(update_data.pop("api_key"))
                save_ai_config_secrets()
            
            # 更新字段
            config_dict.update(update_data)
            config_dict["updated_at"] = datetime.now()
            
            # 创建新的配置对象
            updated_config = AIConfigResponse(**config_dict)
            AI_CONFIGS_DB[i] = updated_config
            save_ai_configs()  # 保存到文件
            return updated_config
    
    raise HTTPException(status_code=404, detail="AI 配置不存在")


@router.delete("/admin/ai-configs/{config_id}")
async def delete_ai_config(config_id: str):
    """删除 AI 配置"""
    for i, config in enumerate(AI_CONFIGS_DB):
        if config.id == config_id:
            AI_CONFIGS_DB.pop(i)
            AI_CONFIG_SECRETS_DB.pop(config_id, None)
            save_ai_configs()  # 保存到文件
            save_ai_config_secrets()
            return {"success": True, "message": "删除成功"}
    
    raise HTTPException(status_code=404, detail="AI配置不存在")


@router.post("/admin/ai-configs/{config_id}/test")
async def test_ai_config(config_id: str, test_request: AIConfigTestRequest):
    """测试 AI 配置是否可用"""
    import time
    
    # 查找配置
    config = None
    for c in AI_CONFIGS_DB:
        if c.id == config_id:
            config = c
            break
    
    if not config:
        raise HTTPException(status_code=404, detail="AI配置不存在")
    
    start_time = time.time()
    
    try:
        llm_options = build_llm_options(config_id, "config-test")
        test_result = ai_service._call_ai_api(test_request.test_prompt, **llm_options)
        if test_result:
            return {
                "success": True,
                "message": "连接测试成功",
                "response_time_ms": (time.time() - start_time) * 1000,
            }
        return {
            "success": False,
            "message": "连接测试失败",
            "response_time_ms": (time.time() - start_time) * 1000,
            "error_detail": "模型未返回可解析的 JSON，或接口调用失败，请查看 LLM 调用日志",
        }
    except Exception as e:
        return {
            "success": False,
            "message": "连接测试失败",
            "response_time_ms": (time.time() - start_time) * 1000,
            "error_detail": str(e),
        }


@router.get("/admin/ai-configs/active")
async def get_active_ai_config():
    """获取当前启用的 AI 配置"""
    for config in AI_CONFIGS_DB:
        if config.enabled:
            return config
    raise HTTPException(status_code=404, detail="没有启用的AI配置")
