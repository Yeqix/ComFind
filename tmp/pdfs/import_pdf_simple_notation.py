import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.search_service import SearchService  # noqa: E402


FORMULAS_PATH = ROOT / "backend" / "app" / "data" / "formulas.json"
EVAL_PATH = ROOT / "backend" / "app" / "data" / "evaluation_queries.json"
ADDED_PATH = ROOT / "tmp" / "pdfs" / "pdf_simple_notation_added.json"
SOURCE = "4_组合数学(1).pdf"


NEW_FORMULAS = [
    {
        "title": "排列数上标下标记法",
        "latex": "A^{n}_{m}=\\frac{m!}{(m-n)!}",
        "category": "排列组合基础",
        "tags": ["排列数", "排列", "PDF基础记号"],
        "description": "从 m 个不同元素中取 n 个并按顺序排列的数量，采用上标 n、下标 m 的记法。",
        "conditions": "m\\geq n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "依次选择第 1 到第 n 个位置，可选数为 m,m-1,...,m-n+1，连乘后化为阶乘商。",
        "application_scenarios": ["有序抽取", "排列计数", "PDF公式检索"],
    },
    {
        "title": "排列数下标上标记法",
        "latex": "A_m^n=\\frac{m!}{(m-n)!}",
        "category": "排列组合基础",
        "tags": ["排列数", "排列", "PDF基础记号"],
        "description": "排列数的常见中文教材写法，与 A^{n}_{m} 表示同一计数对象。",
        "conditions": "m\\geq n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "由乘法原理得到 m(m-1)\\cdots(m-n+1)，再写成阶乘商。",
        "application_scenarios": ["教材公式检索", "排列计数"],
    },
    {
        "title": "排列数 n 元取 m 记法",
        "latex": "A_n^m=\\frac{n!}{(n-m)!}",
        "category": "排列组合基础",
        "tags": ["排列数", "排列", "变式"],
        "description": "当下标 n 表示总体元素数、上标 m 表示选取个数时的排列数写法。",
        "conditions": "n\\geq m\\geq0",
        "difficulty": "基础",
        "proof_sketch": "按顺序选出 m 个元素，共 n(n-1)\\cdots(n-m+1) 种。",
        "application_scenarios": ["有序抽样", "计数基础"],
    },
    {
        "title": "排列数全排列特例",
        "latex": "A_n^n=n!",
        "category": "排列组合基础",
        "tags": ["排列数", "全排列", "特例"],
        "description": "n 个不同元素全部取出并排列时，排列数等于 n 的阶乘。",
        "conditions": "n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "在 A_n^m 的阶乘公式中令 m=n 即得。",
        "application_scenarios": ["全排列", "排列计数"],
    },
    {
        "title": "排列数取一个特例",
        "latex": "A_n^1=n",
        "category": "排列组合基础",
        "tags": ["排列数", "特例", "基础计数"],
        "description": "从 n 个不同元素中取 1 个排列，只有 n 种选择。",
        "conditions": "n\\geq1",
        "difficulty": "基础",
        "proof_sketch": "在 A_n^m 的阶乘公式中令 m=1 即得。",
        "application_scenarios": ["基础计数", "排列特例"],
    },
    {
        "title": "排列数取零特例",
        "latex": "A_n^0=1",
        "category": "排列组合基础",
        "tags": ["排列数", "空排列", "特例"],
        "description": "从 n 个元素中取 0 个并排列，空排列只有一种。",
        "conditions": "n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "在阶乘公式中令 m=0 得 n!/n!=1。",
        "application_scenarios": ["边界条件", "递推初值"],
    },
    {
        "title": "组合数上标下标记法",
        "latex": "C^{n}_{m}=\\frac{m!}{n!(m-n)!}",
        "category": "排列组合基础",
        "tags": ["组合数", "二项式系数", "PDF基础记号"],
        "description": "从 m 个不同元素中取 n 个且不考虑顺序的数量，采用上标 n、下标 m 的记法。",
        "conditions": "m\\geq n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "先按顺序选出 n 个元素得到 A_m^n，再除以 n! 去掉内部排列顺序。",
        "application_scenarios": ["无序抽取", "组合计数", "PDF公式检索"],
    },
    {
        "title": "组合数下标上标记法",
        "latex": "C_m^n=\\frac{m!}{n!(m-n)!}",
        "category": "排列组合基础",
        "tags": ["组合数", "二项式系数", "PDF基础记号"],
        "description": "组合数的常见中文教材写法，与 C^{n}_{m} 表示同一计数对象。",
        "conditions": "m\\geq n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "将有序排列数 A_m^n 按每组 n! 个顺序等价类合并。",
        "application_scenarios": ["教材公式检索", "组合计数"],
    },
    {
        "title": "组合数 n 元取 m 记法",
        "latex": "C_n^m=\\frac{n!}{m!(n-m)!}",
        "category": "排列组合基础",
        "tags": ["组合数", "二项式系数", "变式"],
        "description": "当下标 n 表示总体元素数、上标 m 表示选取个数时的组合数写法。",
        "conditions": "n\\geq m\\geq0",
        "difficulty": "基础",
        "proof_sketch": "由 A_n^m/m! 得到。",
        "application_scenarios": ["无序抽样", "二项式系数"],
    },
    {
        "title": "组合数与排列数关系",
        "latex": "A_n^m=m!C_n^m",
        "category": "排列组合基础",
        "tags": ["排列数", "组合数", "关系式"],
        "description": "先选择 m 个元素再排列，与直接做有序选取等价。",
        "conditions": "n\\geq m\\geq0",
        "difficulty": "基础",
        "proof_sketch": "每一个 m 元子集有 m! 种内部顺序，因此排列数等于组合数乘以 m!。",
        "application_scenarios": ["排列组合转换", "公式推导"],
    },
    {
        "title": "组合数由排列数表示",
        "latex": "C_n^m=\\frac{A_n^m}{m!}",
        "category": "排列组合基础",
        "tags": ["排列数", "组合数", "关系式"],
        "description": "组合数可由排列数除去 m 个元素的内部排列顺序得到。",
        "conditions": "n\\geq m\\geq0",
        "difficulty": "基础",
        "proof_sketch": "A_n^m 中每个无序组合被重复计算 m! 次。",
        "application_scenarios": ["排列组合转换", "公式化简"],
    },
    {
        "title": "组合数对称记号",
        "latex": "C_n^m=C_n^{n-m}",
        "category": "排列组合基础",
        "tags": ["组合数", "对称性", "变式"],
        "description": "从 n 个元素中选 m 个等价于选出不被选择的 n-m 个元素。",
        "conditions": "n\\geq m\\geq0",
        "difficulty": "基础",
        "proof_sketch": "每个 m 元子集与其补集一一对应。",
        "application_scenarios": ["组合恒等式", "公式化简"],
    },
    {
        "title": "组合数边界特例",
        "latex": "C_n^0=C_n^n=1",
        "category": "排列组合基础",
        "tags": ["组合数", "边界条件", "特例"],
        "description": "从 n 个元素中选 0 个或全部 n 个，都只有一种选择。",
        "conditions": "n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "空集和全集都唯一，也可由阶乘公式直接得到。",
        "application_scenarios": ["递推初值", "边界条件"],
    },
    {
        "title": "组合数取一个特例",
        "latex": "C_n^1=n",
        "category": "排列组合基础",
        "tags": ["组合数", "特例", "基础计数"],
        "description": "从 n 个元素中选 1 个，共有 n 种选择。",
        "conditions": "n\\geq1",
        "difficulty": "基础",
        "proof_sketch": "在组合数阶乘公式中令 m=1 即得。",
        "application_scenarios": ["基础计数", "组合特例"],
    },
    {
        "title": "可重组合记号公式",
        "latex": "H_n^m=C_{n+m-1}^{m}",
        "category": "排列组合基础",
        "tags": ["可重组合", "组合数", "隔板法"],
        "description": "从 n 类元素中可重复地选 m 个的组合数，可转化为普通组合数。",
        "conditions": "n\\geq1,m\\geq0",
        "difficulty": "基础",
        "proof_sketch": "隔板法将 m 个相同球放入 n 个盒子，等价于在 n+m-1 个位置中选 m 个球的位置。",
        "application_scenarios": ["可重组合", "隔板法", "非负整数解"],
    },
    {
        "title": "可重组合对称记号",
        "latex": "H_m^n=C_{m+n-1}^{n}",
        "category": "排列组合基础",
        "tags": ["可重组合", "组合数", "变式"],
        "description": "当 m 表示类别数、n 表示选取个数时的可重组合常见记号。",
        "conditions": "m\\geq1,n\\geq0",
        "difficulty": "基础",
        "proof_sketch": "由隔板法直接得到，与 H_n^m 只是变量角色互换。",
        "application_scenarios": ["教材公式检索", "可重组合"],
    },
]


EVAL_CASES_BY_TITLE = [
    ("pdf-simple-permutation-sup-sub", "排列数上标下标记法", "A^{n}_{m}=\\frac{m!}{(m-n)!}"),
    ("pdf-simple-permutation-sub-sup", "排列数下标上标记法", "A_m^n=\\frac{m!}{(m-n)!}"),
    ("pdf-simple-combination-sup-sub", "组合数上标下标记法", "C^{n}_{m}=\\frac{m!}{n!(m-n)!}"),
    ("pdf-simple-combination-permutation", "组合数由排列数表示", "C_n^m=\\frac{A_n^m}{m!}"),
    ("pdf-simple-combination-boundary", "组合数边界特例", "C_n^0=C_n^n=1"),
    ("pdf-simple-repetition-combination", "可重组合记号公式", "H_n^m=C_{n+m-1}^{m}"),
]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    service = SearchService()
    formulas = load_json(FORMULAS_PATH)
    evaluations = load_json(EVAL_PATH)
    existing_normalized = {item.get("normalized_expression") for item in formulas}
    existing_eval_names = {item.get("name") for item in evaluations}
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    next_id = max(int(item["id"]) for item in formulas) + 1
    added = []

    for candidate in NEW_FORMULAS:
        normalized = service.normalize(candidate["latex"])
        if normalized in existing_normalized:
            continue
        item = {
            **candidate,
            "id": str(next_id),
            "normalized_expression": normalized,
            "references": [SOURCE],
            "source": SOURCE,
            "created_at": now,
            "updated_at": now,
        }
        formulas.append(item)
        existing_normalized.add(normalized)
        added.append(item)
        next_id += 1

    title_to_id = {item["title"]: item["id"] for item in formulas}
    added_eval = []
    for name, title, query in EVAL_CASES_BY_TITLE:
        if name in existing_eval_names or title not in title_to_id:
            continue
        case = {
            "name": name,
            "query": query,
            "expected_ids": [title_to_id[title]],
        }
        evaluations.append(case)
        added_eval.append(case)

    dump_json(FORMULAS_PATH, formulas)
    dump_json(EVAL_PATH, evaluations)
    dump_json(
        ADDED_PATH,
        {
            "source": SOURCE,
            "added_formula_count": len(added),
            "added_eval_count": len(added_eval),
            "formulas": [
                {"id": item["id"], "title": item["title"], "latex": item["latex"]}
                for item in added
            ],
            "evaluations": added_eval,
        },
    )

    print(f"added formulas: {len(added)}")
    for item in added:
        print(f"{item['id']} {item['title']} {item['latex']}")
    print(f"added evaluations: {len(added_eval)}")


if __name__ == "__main__":
    main()
