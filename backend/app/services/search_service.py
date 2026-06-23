import math
import re
from collections import Counter
from difflib import SequenceMatcher
from typing import Any, Dict, Iterable, List, Set

from app.schemas.formula import FormulaResponse, SearchResult
from app.services.equivalence_service import EquivalenceService
from app.services.vector_service import VectorService


class SearchService:
    """Formula normalization, feature extraction, and hybrid retrieval."""
    equivalence_service = EquivalenceService()
    vector_service = VectorService()

    COMMAND_ALIASES = {
        "choose": "binom",
        "dbinom": "binom",
        "tbinom": "binom",
        "over": "frac",
        "dfrac": "frac",
        "tfrac": "frac",
        "mathrm": "",
        "operatorname": "",
        "displaystyle": "",
        "textstyle": "",
    }

    STRUCTURE_PATTERNS = {
        "求和结构": ("sum",),
        "连乘结构": ("prod",),
        "二项式系数": ("binom",),
        "分式结构": ("frac", "/"),
        "根式结构": ("sqrt",),
        "生成函数": ("sum", "infty", "x^"),
        "递推关系": ("_{n+1}", "n+1", "n-1"),
        "交错符号": ("(-1)", "-1^", "(-1)^"),
        "阶乘": ("!",),
        "组合数组": ("stirling", "bell", "catalan", "fibonacci"),
    }

    LATEX_COMMANDS = {
        "sum",
        "prod",
        "frac",
        "sqrt",
        "binom",
        "left",
        "right",
        "begin",
        "end",
        "array",
        "cases",
        "infty",
        "lfloor",
        "rfloor",
        "leq",
        "geq",
        "neq",
        "cdot",
        "times",
        "operatorname",
        "mathrm",
    }

    def normalize(self, latex: str) -> str:
        """Normalize common LaTeX variants into a stable searchable form."""
        if not latex:
            return ""

        normalized = latex.strip()
        normalized = self._normalize_matrix_binomials(normalized)
        normalized = normalized.replace("\\\\", " ")
        normalized = re.sub(r"\\(left|right)([(){}\[\]|.]?)", r"\2", normalized)

        for command, alias in self.COMMAND_ALIASES.items():
            normalized = re.sub(rf"\\{command}\b", alias, normalized)

        replacements = [
            (r"\\binom", "binom"),
            (r"\\sum", "sum"),
            (r"\\prod", "prod"),
            (r"\\frac", "frac"),
            (r"\\sqrt", "sqrt"),
            (r"\\infty", "infty"),
            (r"\\leq", "<="),
            (r"\\geq", ">="),
            (r"\\neq", "!="),
            (r"\\cdot|\\times", "*"),
            (r"\\lfloor", "floor("),
            (r"\\rfloor", ")"),
        ]
        for pattern, replacement in replacements:
            normalized = re.sub(pattern, replacement, normalized)

        normalized = normalized.lower()
        normalized = re.sub(r"\\[a-zA-Z]+", "", normalized)
        normalized = re.sub(r"\s+", "", normalized)
        normalized = normalized.replace("\\{", "{").replace("\\}", "}")
        normalized = normalized.replace(" ", "")
        return normalized

    def _normalize_matrix_binomials(self, latex: str) -> str:
        """Convert common array-style binomial notation to binom{n}{k}."""
        pattern = re.compile(
            r"\\left\s*\(\s*\\begin\{array\}\{[clrl]*\}\s*"
            r"(?P<top>.*?)\s*\\\\\s*(?P<bottom>.*?)\s*"
            r"\\end\{array\}\s*\\right\s*\)",
            re.DOTALL,
        )
        return pattern.sub(
            lambda m: f"\\binom{{{m.group('top').strip()}}}{{{m.group('bottom').strip()}}}",
            latex,
        )

    def extract_variables(self, latex: str) -> List[str]:
        """Extract likely mathematical variables while ignoring LaTeX commands."""
        without_commands = re.sub(r"\\[a-zA-Z]+", " ", latex)
        variables = set(re.findall(r"\b[a-zA-Z]\b", without_commands))
        command_letters = set("".join(self.LATEX_COMMANDS))
        return sorted(v for v in variables if v.lower() not in command_letters)

    def extract_tokens(self, latex: str) -> List[str]:
        normalized = self.normalize(latex)
        command_tokens = re.findall(r"(sum|prod|binom|frac|sqrt|infty|floor|stirling|bell|catalan|fibonacci)", normalized)
        symbol_tokens = re.findall(r"[a-zA-Z]+|\d+|[=+\-*/^_!<>]+", normalized)
        return command_tokens + symbol_tokens

    def extract_features(self, latex: str) -> Dict[str, Any]:
        normalized = self.normalize(latex)
        tokens = self.extract_tokens(latex)
        token_set = set(tokens)
        structures = {
            name
            for name, needles in self.STRUCTURE_PATTERNS.items()
            if all(needle in normalized for needle in needles)
        }
        if "sum" in token_set and "binom" in token_set:
            structures.add("二项式求和")
        if "=" in normalized and any(flag in normalized for flag in ("n+1", "n-1", "_{n+1}")):
            structures.add("递推关系")

        return {
            "normalized": normalized,
            "tokens": tokens,
            "token_set": token_set,
            "variables": set(self.extract_variables(latex)),
            "structures": structures,
            "complexity": self.calculate_complexity(latex),
        }

    def calculate_complexity(self, latex: str) -> int:
        features = self.normalize(latex)
        score = 1
        for keyword, weight in {
            "sum": 3,
            "prod": 3,
            "binom": 2,
            "frac": 2,
            "sqrt": 2,
            "cases": 2,
            "infty": 1,
        }.items():
            if keyword in features:
                score += weight
        score += min((latex.count("{") + latex.count("}")) // 4, 5)
        return score

    def calculate_similarity(self, query: str, formula: str) -> float:
        """Combined similarity used by callers that need one scalar score."""
        return self.calculate_detailed_similarity(query, formula)["combined"]

    def calculate_detailed_similarity(self, query: str, formula: str) -> Dict[str, float]:
        query_features = self.extract_features(query)
        formula_features = self.extract_features(formula)

        normalized_score = SequenceMatcher(
            None,
            query_features["normalized"],
            formula_features["normalized"],
        ).ratio()
        token_score = self._jaccard(query_features["token_set"], formula_features["token_set"])
        structure_score = self._jaccard(query_features["structures"], formula_features["structures"])
        variable_score = self._jaccard(query_features["variables"], formula_features["variables"])
        semantic_score = self._cosine(query_features["tokens"], formula_features["tokens"])
        vector_score = self.vector_service.score_tokens(query_features["tokens"], formula_features["tokens"])
        equivalence = self.equivalence_service.compare(query, formula)
        complexity_score = max(
            0.0,
            1.0 - abs(query_features["complexity"] - formula_features["complexity"]) / 10,
        )

        combined = (
            normalized_score * 0.16
            + token_score * 0.13
            + structure_score * 0.20
            + variable_score * 0.08
            + semantic_score * 0.13
            + vector_score * 0.12
            + equivalence.score * 0.12
            + complexity_score * 0.06
        )

        return {
            "combined": round(combined, 4),
            "normalized": round(normalized_score, 4),
            "token": round(token_score, 4),
            "structure": round(structure_score, 4),
            "variable": round(variable_score, 4),
            "semantic": round(semantic_score, 4),
            "vector": round(vector_score, 4),
            "equivalence": round(equivalence.score, 4),
            "complexity": round(complexity_score, 4),
            "equivalence_reason": equivalence.reason,
        }

    def _jaccard(self, left: Set[str], right: Set[str]) -> float:
        if not left and not right:
            return 0.0
        union = left | right
        return len(left & right) / len(union) if union else 0.0

    def _cosine(self, left_tokens: Iterable[str], right_tokens: Iterable[str]) -> float:
        left = Counter(left_tokens)
        right = Counter(right_tokens)
        common = set(left) & set(right)
        numerator = sum(left[t] * right[t] for t in common)
        left_norm = math.sqrt(sum(v * v for v in left.values()))
        right_norm = math.sqrt(sum(v * v for v in right.values()))
        if not left_norm or not right_norm:
            return 0.0
        return numerator / (left_norm * right_norm)

    def get_match_reason(self, query: str, formula: FormulaResponse, scores: Dict[str, float] | None = None) -> str:
        reasons: List[str] = []
        query_features = self.extract_features(query)
        formula_features = self.extract_features(formula.latex)
        common_structures = query_features["structures"] & formula_features["structures"]
        common_variables = query_features["variables"] & formula_features["variables"]
        common_tokens = query_features["token_set"] & formula_features["token_set"]

        if common_structures:
            reasons.append(f"共同结构: {'、'.join(sorted(common_structures))}")
        if len(common_variables) >= 1:
            reasons.append(f"共享变量: {', '.join(sorted(common_variables))}")
        if formula.category and any(token in formula.category.lower() for token in common_tokens):
            reasons.append(f"类别相关: {formula.category}")

        if scores:
            reasons.append(
                "综合评分 "
                f"{scores['combined']:.2f} "
                f"(结构 {scores['structure']:.2f}, 语义 {scores['semantic']:.2f}, "
                f"向量 {scores['vector']:.2f}, 等价 {scores['equivalence']:.2f})"
            )

        return "；".join(reasons) if reasons else "标准化表达与符号结构相似"

    def build_reasoning_steps(self, query: str, formula: FormulaResponse, scores: Dict[str, float]) -> List[str]:
        query_features = self.extract_features(query)
        formula_features = self.extract_features(formula.latex)
        return [
            f"查询公式标准化为: {query_features['normalized']}",
            f"候选公式标准化为: {formula_features['normalized']}",
            f"共同结构: {'、'.join(sorted(query_features['structures'] & formula_features['structures'])) or '无明显共同结构'}",
            f"共享变量: {', '.join(sorted(query_features['variables'] & formula_features['variables'])) or '无'}",
            f"向量相似度为 {scores['vector']:.2f}，等价判断为 {scores['equivalence']:.2f}（{scores['equivalence_reason']}）",
            f"融合结构、语义、变量、向量、等价和复杂度后得到相似度 {scores['combined']:.2f}",
        ]

    def search(
        self,
        query: str,
        formulas: List[FormulaResponse],
        top_k: int = 10,
    ) -> List[SearchResult]:
        """Search similar formulas with hybrid structural and semantic ranking."""
        results: List[SearchResult] = []
        formula_pool = formulas
        vector_candidates = self.vector_service.query_pgvector(
            self.extract_tokens(query),
            top_k=max(top_k * 8, 50),
        )
        if vector_candidates:
            candidate_ids = {item["formula_id"] for item in vector_candidates}
            formula_pool = [formula for formula in formulas if formula.id in candidate_ids]

        for formula in formula_pool:
            scores = self.calculate_detailed_similarity(query, formula.latex)
            if scores["combined"] > 0.08:
                results.append(
                    SearchResult(
                        **formula.model_dump(),
                        similarity=scores["combined"],
                        match_reason=self.get_match_reason(query, formula, scores),
                        structural_score=scores["structure"],
                        semantic_score=scores["semantic"],
                        normalized_score=scores["normalized"],
                        equivalence_score=scores["equivalence"],
                        vector_score=scores["vector"],
                        equivalence_reason=scores["equivalence_reason"],
                        reasoning_steps=self.build_reasoning_steps(query, formula, scores),
                    )
                )

        results.sort(key=lambda x: x.similarity, reverse=True)
        return results[:top_k]
