from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProofStep(BaseModel):
    order: int
    title: str
    detail: str
    method: Optional[str] = None


class FormulaBase(BaseModel):
    title: str
    latex: str
    formula_type: Optional[str] = None
    category: str
    tags: List[str] = []
    description: Optional[str] = None
    conditions: Optional[str] = None
    aliases: List[str] = []
    references: List[str] = []
    difficulty: Optional[str] = None
    proof_sketch: Optional[str] = None
    proof_steps: List[ProofStep] = []
    application_scenarios: List[str] = []
    source: Optional[str] = None
    source_page: Optional[int] = None
    review_status: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    relation_ids: List[str] = []
    related_formula_ids: List[str] = []
    import_batch_id: Optional[str] = None


class FormulaCreate(FormulaBase):
    pass


class FormulaResponse(FormulaBase):
    id: str
    normalized_expression: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    review_status: str = "approved"

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    formula: str
    input_type: str = "latex"
    category: Optional[str] = None
    tags: List[str] = []
    difficulty: Optional[str] = None
    source: Optional[str] = None
    structure: Optional[str] = None
    review_status: Optional[str] = "approved"


class SearchResult(FormulaResponse):
    similarity: float
    match_reason: Optional[str] = None
    structural_score: Optional[float] = None
    semantic_score: Optional[float] = None
    normalized_score: Optional[float] = None
    equivalence_score: Optional[float] = None
    vector_score: Optional[float] = None
    equivalence_reason: Optional[str] = None
    reasoning_steps: List[str] = []


class SearchResponse(BaseModel):
    results: List[SearchResult]
    normalized_formula: str
    type_info: Optional[str] = None


class ParseRequest(BaseModel):
    formula: str
    input_type: str = "latex"


class ParseResponse(BaseModel):
    success: bool
    normalized: Optional[str] = None
    type: Optional[str] = None
    variables: List[str] = []
    hints: List[str] = []
    structures: List[str] = []
    operators: List[str] = []
    ast_hash: Optional[str] = None
    has_summation: bool = False
    has_recurrence: bool = False
    has_generating_function: bool = False
    complexity: Optional[int] = None


class FormulaFeatureResponse(BaseModel):
    formula_id: str
    symbols: List[str] = []
    operators: List[str] = []
    has_summation: bool = False
    has_recurrence: bool = False
    has_generating_function: bool = False
    ast_hash: Optional[str] = None
    variable_count: int = 0
    free_variables: List[str] = []
    embedding: List[float] = []
