import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import sympy as sp


@dataclass
class EquivalenceResult:
    score: float
    reason: str
    query_canonical: str
    formula_canonical: str


class EquivalenceService:
    """对常见闭式公式做尽力而为的符号等价检查。"""

    @lru_cache(maxsize=4096)
    def canonicalize(self, latex: str) -> str:
        expr = self._to_sympy_text(latex)
        if not self._is_lightweight_expr(expr):
            return re.sub(r"\s+", "", expr.lower())
        try:
            if "=" in expr:
                left, right = expr.split("=", 1)
                simplified = sp.simplify(sp.sympify(left) - sp.sympify(right))
                return str(simplified)
            return str(sp.simplify(sp.sympify(expr)))
        except Exception:
            return re.sub(r"\s+", "", expr.lower())

    def compare(self, query: str, formula: str) -> EquivalenceResult:
        query_canonical = self.canonicalize(query)
        formula_canonical = self.canonicalize(formula)

        if query_canonical == formula_canonical:
            return EquivalenceResult(
                score=1.0,
                reason="符号规范化结果完全一致",
                query_canonical=query_canonical,
                formula_canonical=formula_canonical,
            )

        symbolic_score = self._symbolic_equal_score(query, formula)
        if symbolic_score == 1.0:
            return EquivalenceResult(
                score=1.0,
                reason="SymPy 化简判断左右差值为 0",
                query_canonical=query_canonical,
                formula_canonical=formula_canonical,
            )

        shared_skeleton = self._skeleton_score(query_canonical, formula_canonical)
        return EquivalenceResult(
            score=max(symbolic_score, shared_skeleton),
            reason="未证明完全等价，使用规范化骨架相似度作为补充分",
            query_canonical=query_canonical,
            formula_canonical=formula_canonical,
        )

    def _symbolic_equal_score(self, query: str, formula: str) -> float:
        query_expr = self._equation_to_expr(query)
        formula_expr = self._equation_to_expr(formula)
        if query_expr is None or formula_expr is None:
            return 0.0
        try:
            diff = sp.simplify(query_expr - formula_expr)
            return 1.0 if diff == 0 else 0.0
        except Exception:
            return 0.0

    @lru_cache(maxsize=4096)
    def _equation_to_expr(self, latex: str) -> Optional[sp.Expr]:
        text = self._to_sympy_text(latex)
        if not self._is_lightweight_expr(text):
            return None
        try:
            if "=" in text:
                left, right = text.split("=", 1)
                return sp.simplify(sp.sympify(left) - sp.sympify(right))
            return sp.simplify(sp.sympify(text))
        except Exception:
            return None

    @lru_cache(maxsize=4096)
    def _to_sympy_text(self, latex: str) -> str:
        text = latex.strip()
        text = text.replace("\\left", "").replace("\\right", "")
        text = text.replace("\\cdot", "*").replace("\\times", "*")
        text = text.replace("\\leq", "<=").replace("\\geq", ">=")
        text = text.replace("\\infty", "oo")
        text = re.sub(r"\\binom\{([^{}]+)\}\{([^{}]+)\}", r"binomial(\1,\2)", text)
        text = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"((\1)/(\2))", text)
        text = re.sub(r"\\sqrt\{([^{}]+)\}", r"sqrt(\1)", text)
        text = re.sub(r"([A-Za-z])_\{?([A-Za-z0-9+\-]+)\}?", r"\1_\2", text)
        text = text.replace("^", "**")
        text = text.replace("{", "(").replace("}", ")")
        text = re.sub(r"\\[a-zA-Z]+", "", text)
        text = re.sub(r"\s+", "", text)
        return text

    def _is_lightweight_expr(self, text: str) -> bool:
        if len(text) > 160:
            return False
        unsupported = ("sum_", "prod_", "oo", "brack", "Longleftrightarrow", "#", "<=", ">=", "\\")
        return not any(token in text for token in unsupported)

    def _skeleton_score(self, left: str, right: str) -> float:
        left_skeleton = re.sub(r"[a-zA-Z]\w*", "v", left)
        right_skeleton = re.sub(r"[a-zA-Z]\w*", "v", right)
        if not left_skeleton and not right_skeleton:
            return 0.0
        shared = sum(1 for a, b in zip(left_skeleton, right_skeleton) if a == b)
        return shared / max(len(left_skeleton), len(right_skeleton), 1)
