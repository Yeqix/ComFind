import json
import math
from pathlib import Path
from typing import Dict, List, Optional

from app.schemas.formula import FormulaResponse
from app.services.search_service import SearchService


class EvaluationService:
    """Run lightweight retrieval metrics against curated formula queries."""

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or Path(__file__).parent.parent / "data" / "evaluation_queries.json"
        self.search_service = SearchService()

    def load_cases(self) -> List[Dict]:
        if not self.data_path.exists():
            return []
        with open(self.data_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def run(self, formulas: List[FormulaResponse], top_k: int = 10) -> Dict:
        cases = self.load_cases()
        if not cases:
            return {
                "case_count": 0,
                "top_k": top_k,
                "recall_at_k": 0.0,
                "mrr": 0.0,
                "ndcg_at_k": 0.0,
                "cases": [],
            }

        evaluated = []
        recall_hits = 0
        top1_hits = 0
        precision_values = []
        reciprocal_ranks = []
        ndcgs = []

        for case in cases:
            expected_ids = set(case.get("expected_ids", []))
            results = self.search_service.search(case["query"], formulas, top_k)
            ranked_ids = [result.id for result in results]
            hit_positions = [idx + 1 for idx, formula_id in enumerate(ranked_ids) if formula_id in expected_ids]

            if hit_positions:
                recall_hits += 1
                if hit_positions[0] == 1:
                    top1_hits += 1
                reciprocal_ranks.append(1 / hit_positions[0])
            else:
                reciprocal_ranks.append(0.0)

            relevance = [1 if formula_id in expected_ids else 0 for formula_id in ranked_ids]
            precision_values.append(sum(relevance) / max(len(ranked_ids), 1))
            ndcgs.append(self._ndcg(relevance, min(top_k, max(1, len(expected_ids)))))

            evaluated.append(
                {
                    "name": case.get("name", ""),
                    "query": case["query"],
                    "expected_ids": sorted(expected_ids),
                    "returned_ids": ranked_ids,
                    "hit": bool(hit_positions),
                    "first_hit_rank": hit_positions[0] if hit_positions else None,
                    "top_result": ranked_ids[0] if ranked_ids else None,
                }
            )

        case_count = len(cases)
        failed_cases = [case for case in evaluated if not case["hit"]]
        return {
            "case_count": case_count,
            "top_k": top_k,
            "top1_accuracy": round(top1_hits / case_count, 4),
            "recall_at_k": round(recall_hits / case_count, 4),
            "precision_at_k": round(sum(precision_values) / case_count, 4),
            "mrr": round(sum(reciprocal_ranks) / case_count, 4),
            "ndcg_at_k": round(sum(ndcgs) / case_count, 4),
            "failed_count": len(failed_cases),
            "failed_cases": failed_cases,
            "cases": evaluated,
        }

    def _ndcg(self, relevance: List[int], ideal_hits: int) -> float:
        dcg = sum(rel / math.log2(idx + 2) for idx, rel in enumerate(relevance))
        ideal = sum(1 / math.log2(idx + 2) for idx in range(min(ideal_hits, len(relevance))))
        return dcg / ideal if ideal else 0.0
