from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Formula(Base):
    __tablename__ = "formulas"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    latex: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_expression: Mapped[str | None] = mapped_column(Text)
    formula_type: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    description: Mapped[str | None] = mapped_column(Text)
    conditions: Mapped[str | None] = mapped_column(Text)
    aliases: Mapped[list[str]] = mapped_column(JSONB, default=list)
    references: Mapped[list[str]] = mapped_column(JSONB, default=list)
    related_formula_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)
    difficulty: Mapped[str | None] = mapped_column(String(50))
    proof_sketch: Mapped[str | None] = mapped_column(Text)
    proof_steps: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    application_scenarios: Mapped[list[str]] = mapped_column(JSONB, default=list)
    source: Mapped[str | None] = mapped_column(String(255))
    source_page: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="approved", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FormulaFeature(Base):
    __tablename__ = "formula_features"

    formula_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    symbols: Mapped[list[str]] = mapped_column(JSONB, default=list)
    operators: Mapped[list[str]] = mapped_column(JSONB, default=list)
    has_summation: Mapped[bool] = mapped_column(default=False)
    has_recurrence: Mapped[bool] = mapped_column(default=False)
    has_generating_function: Mapped[bool] = mapped_column(default=False)
    ast_hash: Mapped[str | None] = mapped_column(String(128), index=True)
    variable_count: Mapped[int] = mapped_column(Integer, default=0)
    free_variables: Mapped[list[str]] = mapped_column(JSONB, default=list)
    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
