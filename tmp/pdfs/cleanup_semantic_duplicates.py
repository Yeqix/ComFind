import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FORMULAS_PATH = ROOT / "backend" / "app" / "data" / "formulas.json"
EVAL_PATH = ROOT / "backend" / "app" / "data" / "evaluation_queries.json"
REPORT_PATH = ROOT / "tmp" / "pdfs" / "semantic_duplicate_cleanup.json"

REMOVED = {
    "201": {"kept": "200", "reason": "排列数下标上标记法与 A^{n}_{m} 语义重复"},
    "202": {"kept": "200", "reason": "排列数 n 元取 m 记法与 A^{n}_{m} 仅变量角色互换"},
    "207": {"kept": "206", "reason": "组合数下标上标记法与 C^{n}_{m} 语义重复"},
    "208": {"kept": "206", "reason": "组合数 n 元取 m 记法与 C^{n}_{m} 仅变量角色互换"},
    "215": {"kept": "214", "reason": "可重组合对称记号与 H_n^m 仅变量角色互换"},
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    formulas = load(FORMULAS_PATH)
    evaluations = load(EVAL_PATH)
    removed_items = [item for item in formulas if item["id"] in REMOVED]
    formulas = [item for item in formulas if item["id"] not in REMOVED]

    for item in formulas:
        item.setdefault("review_status", "approved")

    updated_eval = []
    removed_eval = []
    for case in evaluations:
        expected = case.get("expected_ids", [])
        mapped = [REMOVED.get(formula_id, {}).get("kept", formula_id) for formula_id in expected]
        mapped = list(dict.fromkeys(mapped))
        if not mapped:
            removed_eval.append(case)
            continue
        case["expected_ids"] = mapped
        updated_eval.append(case)

    dump(FORMULAS_PATH, formulas)
    dump(EVAL_PATH, updated_eval)
    dump(
        REPORT_PATH,
        {
            "removed_count": len(removed_items),
            "removed": [
                {
                    "id": item["id"],
                    "title": item["title"],
                    "latex": item["latex"],
                    **REMOVED[item["id"]],
                }
                for item in removed_items
            ],
            "formula_count_after": len(formulas),
            "evaluation_count_after": len(updated_eval),
            "removed_evaluations": removed_eval,
        },
    )
    print(f"removed formulas: {len(removed_items)}")
    for item in removed_items:
        meta = REMOVED[item["id"]]
        print(f"{item['id']} -> keep {meta['kept']}: {item['title']}")
    print(f"formula count after: {len(formulas)}")
    print(f"evaluation count after: {len(updated_eval)}")


if __name__ == "__main__":
    main()
