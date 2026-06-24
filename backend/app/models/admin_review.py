from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AdminReview(Base):
    __tablename__ = "admin_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    formula_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    reviewer_id: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
