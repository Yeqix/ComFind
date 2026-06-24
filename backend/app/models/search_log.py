from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SearchLog(Base):
    __tablename__ = "search_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    input_formula: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_formula: Mapped[str | None] = mapped_column(Text)
    result_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)
    user_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
