"""
AI 辅助的公式理解服务。

该服务在没有外部模型时也能工作：它结合领域规则、
SearchService 提供的结构特征以及解释模板。后续可以在
_call_ai_api 后面接入外部 LLM 调用，而不改变 API 契约。
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional

from app.services.search_service import SearchService


class AIService:
    """基于规则增强的公式分析与可解释搜索支持。"""

    LOG_FILE = Path(__file__).parent.parent / "data" / "llm_call_logs.json"

    CATEGORY_RULES = [
        {
            "name": "二项式恒等式",
            "patterns": [r"\\binom|binom|begin\{array\}"],
            "tags": ["二项式系数", "组合恒等式"],
            "description": "关于二项式系数及其求和、对称或卷积性质的组合恒等式。",
            "references": ["Concrete Mathematics, Graham et al.", "Enumerative Combinatorics, Stanley"],
        },
        {
            "name": "Catalan 数",
            "patterns": [r"C_\{?n\}?|Catalan|\\frac\{1\}\{n\+1\}"],
            "tags": ["Catalan数", "经典序列", "递推"],
            "description": "Catalan 数及其闭式、递推或生成函数表示。",
            "references": ["Catalan Numbers, Richard P. Stanley", "OEIS A000108"],
        },
        {
            "name": "Stirling 数",
            "patterns": [r"S\(n,k\)|Stirling|\\left\{.*\\right\}"],
            "tags": ["Stirling数", "集合划分", "容斥"],
            "description": "Stirling 数相关公式，常用于集合划分、排列轮换或容斥计数。",
            "references": ["Enumerative Combinatorics, Stanley", "The Art of Computer Programming, Knuth"],
        },
        {
            "name": "Bell 数",
            "patterns": [r"B_\{?n\}?|Bell"],
            "tags": ["Bell数", "集合划分"],
            "description": "Bell 数及集合划分总数相关公式。",
            "references": ["OEIS A000110", "Enumerative Combinatorics, Stanley"],
        },
        {
            "name": "Fibonacci 数",
            "patterns": [r"F_\{?n\}?|Fibonacci"],
            "tags": ["Fibonacci", "递推", "组合计数"],
            "description": "Fibonacci 数列的递推、闭式或组合求和表示。",
            "references": ["OEIS A000045", "Fibonacci and Lucas Numbers with Applications"],
        },
        {
            "name": "生成函数",
            "patterns": [r"\\sum.*x\^|infty|\\frac.*sqrt|G\("],
            "tags": ["生成函数", "形式幂级数"],
            "description": "使用形式幂级数表达组合对象计数序列的生成函数公式。",
            "references": ["Generatingfunctionology, Herbert S. Wilf", "Analytic Combinatorics, Flajolet & Sedgewick"],
        },
        {
            "name": "容斥原理",
            "patterns": [r"\(-1\)\^\{?[a-zA-Z0-9+-]+\}?|\\sum.*\(-1\)"],
            "tags": ["容斥", "交错求和"],
            "description": "带交错符号的计数公式，常用于容斥、筛法或反演。",
            "references": ["Concrete Mathematics, Graham et al.", "A=B, Petkovsek et al."],
        },
    ]

    @classmethod
    def analyze_formula(cls, latex: str, llm_options: Optional[Dict] = None, force_llm: bool = False) -> Dict:
        search_service = SearchService()
        features = search_service.extract_features(latex)
        category_info = cls._detect_category(latex)
        variables = sorted(features["variables"])
        conditions = cls._generate_conditions(variables, latex, category_info["name"])
        tags = cls._dedupe(category_info["tags"] + list(features["structures"]))

        result = {
            "title": cls._generate_title(latex, category_info["name"], features),
            "category": category_info["name"],
            "tags": tags,
            "description": category_info["description"],
            "conditions": conditions,
            "references": category_info["references"],
            "confidence": category_info["confidence"],
            "method": "rule-chain",
            "normalized": features["normalized"],
            "structures": sorted(features["structures"]),
            "variables": variables,
            "reasoning_steps": cls._build_analysis_steps(latex, features, category_info),
        }

        if force_llm or result["confidence"] < 0.55:
            ai_result = cls._call_ai_api(latex, **(llm_options or {}))
            if ai_result:
                result.update(ai_result)
                result["method"] = "ai"
                result["confidence"] = ai_result.get("confidence", 0.8)

        return result

    @classmethod
    def _detect_category(cls, latex: str) -> Dict:
        best = {
            "name": "其他组合数学公式",
            "tags": ["组合数学"],
            "description": "组合数学中的公式或恒等式，可进一步补充分支分类。",
            "references": ["Enumerative Combinatorics, Stanley"],
            "confidence": 0.45,
        }
        best_score = 0
        for rule in cls.CATEGORY_RULES:
            score = sum(1 for pattern in rule["patterns"] if re.search(pattern, latex, re.IGNORECASE | re.DOTALL))
            if score > best_score:
                best_score = score
                best = {
                    **rule,
                    "confidence": min(0.95, 0.55 + score * 0.15),
                }
        return best

    @classmethod
    def _build_analysis_steps(cls, latex: str, features: Dict, category_info: Dict) -> List[str]:
        return [
            f"标准化公式: {features['normalized']}",
            f"识别结构: {'、'.join(sorted(features['structures'])) or '未识别到典型结构'}",
            f"提取变量: {', '.join(sorted(features['variables'])) or '无显式变量'}",
            f"根据结构与关键词判断为: {category_info['name']}",
            "生成标题、标签、适用条件和参考文献建议。",
        ]

    @classmethod
    def _generate_conditions(cls, variables: List[str], latex: str, category: str) -> str:
        conditions: List[str] = []
        if ("\\binom" in latex or "binom" in latex) and "n" in variables and "k" in variables:
            conditions.append("n >= k >= 0")
        elif "n" in variables:
            conditions.append("n >= 0")

        if category in {"Catalan 数", "Fibonacci 数", "Bell 数"} and "n >= 0" not in conditions:
            conditions.append("n >= 0")
        if "\\sum" in latex and not conditions:
            conditions.append("求和上下界需为有效整数范围")
        if not conditions and variables:
            conditions.extend(f"{v} 为非负整数" for v in variables[:3])

        return "，".join(conditions) if conditions else "适用于公式定义域内的参数"

    @classmethod
    def _generate_title(cls, latex: str, category: str, features: Dict) -> str:
        structures = features.get("structures", set())
        if "二项式求和" in structures:
            return "二项式求和恒等式"
        if "生成函数" in structures:
            return f"{category}生成函数"
        if "递推关系" in structures:
            return f"{category}递推公式"
        if category != "其他组合数学公式":
            return f"{category}相关公式"
        compact = re.sub(r"\s+", "", latex.replace("\\", ""))
        return compact[:28] + ("..." if len(compact) > 28 else "")

    @classmethod
    def validate_formula(cls, latex: str) -> Dict:
        issues: List[str] = []
        suggestions: List[str] = []

        if latex.count("{") != latex.count("}"):
            issues.append("花括号数量不匹配")
        if latex.count("(") != latex.count(")"):
            suggestions.append("圆括号数量不一致，请确认是否为故意省略")
        if not re.search(r"\\[a-zA-Z]+", latex):
            suggestions.append("建议使用标准 LaTeX 命令，例如 \\sum、\\binom、\\frac")

        typo_map = {
            "bionom": "binom",
            "binonm": "binom",
            "summ": "sum",
            "frc": "frac",
        }
        for typo, correct in typo_map.items():
            if typo in latex.lower():
                suggestions.append(f"可能的拼写错误: {typo} 应为 {correct}")

        return {
            "is_valid": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions,
        }

    @classmethod
    def suggest_references(cls, category: str, latex: str) -> List[str]:
        for rule in cls.CATEGORY_RULES:
            if category == rule["name"]:
                return rule["references"]
        return ["Enumerative Combinatorics, Stanley", "Concrete Mathematics, Graham et al."]

    @classmethod
    def ai_enhanced_search(
        cls,
        query: str,
        formulas: List[Dict],
        top_k: int = 10,
        llm_options: Optional[Dict] = None,
    ) -> List[Dict]:
        if not formulas:
            return []

        search_service = SearchService()
        query_analysis = cls._analyze_formula_semantics(query, llm_options=llm_options)
        results: List[Dict] = []

        for formula in formulas:
            formula_latex = formula.get("latex", "")
            detailed = search_service.calculate_detailed_similarity(query, formula_latex)
            ai_score = cls._calculate_semantic_similarity(query_analysis, formula)
            combined_score = detailed["combined"] * 0.55 + ai_score * 0.45
            match_reason = cls._generate_ai_match_reason(query_analysis, formula, detailed)
            reasoning_steps = cls._generate_reasoning_steps(query_analysis, formula, detailed, combined_score)

            results.append(
                {
                    **formula,
                    "traditional_score": round(detailed["combined"], 3),
                    "ai_score": round(ai_score, 3),
                    "combined_score": round(combined_score, 3),
                    "structural_score": detailed["structure"],
                    "semantic_score": detailed["semantic"],
                    "normalized_score": detailed["normalized"],
                    "equivalence_score": detailed["equivalence"],
                    "vector_score": detailed["vector"],
                    "equivalence_reason": detailed["equivalence_reason"],
                    "match_reason": match_reason,
                    "reasoning_steps": reasoning_steps,
                }
            )

        results.sort(key=lambda x: x["combined_score"], reverse=True)
        return results[:top_k]

    @classmethod
    def _analyze_formula_semantics(cls, latex: str, llm_options: Optional[Dict] = None) -> Dict:
        search_service = SearchService()
        analysis = cls.analyze_formula(latex, llm_options=llm_options, force_llm=bool(llm_options))
        features = search_service.extract_features(latex)
        return {
            "latex": latex,
            "category": analysis.get("category", "其他组合数学公式"),
            "tags": analysis.get("tags", []),
            "structures": set(features["structures"]),
            "variables": set(features["variables"]),
            "tokens": features["tokens"],
            "normalized": features["normalized"],
            "complexity": features["complexity"],
            "description": analysis.get("description", ""),
        }

    @classmethod
    def _calculate_semantic_similarity(cls, query_analysis: Dict, formula: Dict) -> float:
        formula_analysis = cls._analyze_formula_semantics(formula.get("latex", ""))
        search_service = SearchService()

        structure_score = search_service._jaccard(query_analysis["structures"], formula_analysis["structures"])
        variable_score = search_service._jaccard(query_analysis["variables"], formula_analysis["variables"])
        token_score = search_service._cosine(query_analysis["tokens"], formula_analysis["tokens"])
        category_score = 1.0 if query_analysis["category"] == formula_analysis["category"] else 0.0
        tag_score = search_service._jaccard(set(query_analysis["tags"]), set(formula_analysis["tags"]))

        score = (
            structure_score * 0.30
            + token_score * 0.25
            + category_score * 0.20
            + tag_score * 0.15
            + variable_score * 0.10
        )
        return round(score, 4)

    @classmethod
    def _generate_ai_match_reason(cls, query_analysis: Dict, formula: Dict, scores: Dict) -> str:
        formula_analysis = cls._analyze_formula_semantics(formula.get("latex", ""))
        reasons: List[str] = []

        common_structures = query_analysis["structures"] & formula_analysis["structures"]
        common_variables = query_analysis["variables"] & formula_analysis["variables"]

        if common_structures:
            reasons.append(f"共同数学结构: {'、'.join(sorted(common_structures))}")
        if common_variables:
            reasons.append(f"共享变量: {', '.join(sorted(common_variables))}")
        if query_analysis["category"] == formula_analysis["category"]:
            reasons.append(f"同属{formula_analysis['category']}类别")

        reasons.append(
            f"结构分 {scores['structure']:.2f}，语义分 {scores['semantic']:.2f}，标准化分 {scores['normalized']:.2f}"
        )
        return "；".join(reasons)

    @classmethod
    def _generate_reasoning_steps(cls, query_analysis: Dict, formula: Dict, scores: Dict, combined_score: float) -> List[str]:
        formula_analysis = cls._analyze_formula_semantics(formula.get("latex", ""))
        return [
            f"将查询公式归一化为 {query_analysis['normalized']}",
            f"将候选公式归一化为 {formula_analysis['normalized']}",
            f"比较结构集合，得到结构相似度 {scores['structure']:.2f}",
            f"比较符号词元和类别标签，得到语义相似度 {scores['semantic']:.2f}",
            f"补充向量相似度 {scores.get('vector', 0):.2f} 与等价判断 {scores.get('equivalence', 0):.2f}",
            f"融合标准化、结构、语义、变量、向量和等价信息，最终评分 {combined_score:.2f}",
        ]

    @classmethod
    def batch_extract_formulas(cls, content: str, input_format: str = "auto") -> List[Dict]:
        formulas: List[Dict] = []
        patterns = [
            (r"\$\$([^$]+)\$\$", "display"),
            (r"\$([^$\n]+)\$", "inline"),
            (r"\\\[([\s\S]+?)\\\]", "display"),
            (r"\\\(([\s\S]+?)\\\)", "inline"),
            (r"(\\sum[\s\S]{0,180}?=.+?)(?:\n|$)", "display"),
        ]

        extracted = []
        for pattern, formula_type in patterns:
            for match in re.finditer(pattern, content, re.DOTALL):
                latex = match.group(1).strip()
                if len(latex) <= 3 or cls._is_formula_number(latex):
                    continue
                extracted.append(
                    {
                        "latex": cls._clean_formula_number(latex),
                        "type": formula_type,
                        "context": cls._extract_context(content, match.start(), match.end()),
                    }
                )

        seen = set()
        search_service = SearchService()
        for item in extracted:
            key = search_service.normalize(item["latex"])
            if key in seen:
                continue
            seen.add(key)
            analysis = cls.analyze_formula(item["latex"])
            formulas.append(
                {
                    "latex": item["latex"],
                    "type": item["type"],
                    "title": analysis["title"],
                    "category": analysis["category"],
                    "tags": analysis["tags"],
                    "description": analysis["description"],
                    "conditions": analysis["conditions"],
                    "references": analysis["references"],
                    "confidence": analysis["confidence"],
                    "context": item["context"],
                    "reasoning_steps": analysis["reasoning_steps"],
                }
            )

        formulas.sort(key=lambda x: x["confidence"], reverse=True)
        return formulas

    @classmethod
    def _extract_context(cls, content: str, start: int, end: int, context_chars: int = 100) -> str:
        context = content[max(0, start - context_chars): min(len(content), end + context_chars)]
        context = re.sub(r"\s+", " ", context).strip()
        return context[:200] + ("..." if len(context) > 200 else "")

    @classmethod
    def _is_formula_number(cls, latex: str) -> bool:
        cleaned = latex.strip()
        return bool(re.match(r"^[\(\[]?\d+([\.-]\d+)*[\)\]]?$", cleaned))

    @classmethod
    def _clean_formula_number(cls, latex: str) -> str:
        cleaned = re.sub(r"\\tag\*?\{[^}]+\}", "", latex)
        cleaned = re.sub(r"\\label\{[^}]+\}", "", cleaned)
        cleaned = re.sub(r"\\(?:eq)?ref\{[^}]+\}", "", cleaned)
        cleaned = re.sub(r"[\s,\.]+(?:Eq|Equation)\.?\s*[\(\[]?\d+[\.\-\d]*[\)\]]?\s*$", "", cleaned, flags=re.I)
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def _call_ai_api(
        cls,
        latex: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        provider: str = "openai",
        config_id: Optional[str] = None,
        purpose: str = "formula-analysis",
    ) -> Optional[Dict]:
        api_key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
        if not api_key:
            return None

        base_url = (base_url or os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
        model = model or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"
        prompt = (
            "你是组合数学公式知识库助手。请分析下面的 LaTeX 公式，"
            "只返回 JSON，字段包含 title, category, tags, description, "
            "conditions, references, confidence。公式："
            f"{latex}"
        )
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "只输出合法 JSON，不要添加 Markdown。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        request = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        started = time.time()
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                body = json.loads(response.read().decode("utf-8"))
            content = body["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.S).strip()
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                cls._write_call_log(
                    {
                        "provider": provider,
                        "model": model,
                        "endpoint": f"{base_url}/chat/completions",
                        "config_id": config_id,
                        "purpose": purpose,
                        "success": True,
                        "response_time_ms": round((time.time() - started) * 1000, 2),
                        "error_detail": None,
                    }
                )
                return parsed
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError, TimeoutError) as exc:
            cls._write_call_log(
                {
                    "provider": provider,
                    "model": model,
                    "endpoint": f"{base_url}/chat/completions",
                    "config_id": config_id,
                    "purpose": purpose,
                    "success": False,
                    "response_time_ms": round((time.time() - started) * 1000, 2),
                    "error_detail": str(exc),
                }
            )
            return None

        return None

    @classmethod
    def get_call_logs(cls, limit: int = 50) -> List[Dict]:
        if not cls.LOG_FILE.exists():
            return []
        try:
            logs = json.loads(cls.LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
        return list(reversed(logs[-limit:]))

    @classmethod
    def _write_call_log(cls, entry: Dict) -> None:
        cls.LOG_FILE.parent.mkdir(exist_ok=True)
        entry = {
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            **entry,
        }
        try:
            logs = json.loads(cls.LOG_FILE.read_text(encoding="utf-8")) if cls.LOG_FILE.exists() else []
        except Exception:
            logs = []
        logs.append(entry)
        cls.LOG_FILE.write_text(json.dumps(logs[-500:], ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def _dedupe(cls, values: List[str]) -> List[str]:
        seen = set()
        result = []
        for value in values:
            if value and value not in seen:
                seen.add(value)
                result.append(value)
        return result


ai_service = AIService()
