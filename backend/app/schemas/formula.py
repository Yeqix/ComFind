from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class FormulaBase(BaseModel):
    title: str
    latex: str
    category: str
    tags: List[str] = []
    description: Optional[str] = None
    conditions: Optional[str] = None
    references: List[str] = []
    difficulty: Optional[str] = None
    proof_sketch: Optional[str] = None
    application_scenarios: List[str] = []
    source: Optional[str] = None
    source_page: Optional[int] = None
    review_status: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    relation_ids: List[str] = []
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
    complexity: Optional[int] = None
