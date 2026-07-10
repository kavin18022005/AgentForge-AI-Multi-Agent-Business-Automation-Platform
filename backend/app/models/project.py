"""Project model"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON, Float, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal: Mapped[str] = mapped_column(Text, nullable=False)  # The user's business objective
    category: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g. product_launch, marketing
    status: Mapped[str] = mapped_column(
        String(30), default="pending"
    )  # pending, running, completed, failed, cancelled
    progress: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    current_agent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    workflow_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # LangGraph state
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_favourite: Mapped[bool] = mapped_column(default=False)
    is_template: Mapped[bool] = mapped_column(default=False)
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # low, medium, high
    credits_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="projects")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    uploads: Mapped[list["Upload"]] = relationship("Upload", back_populates="project", cascade="all, delete-orphan")
    activities: Mapped[list["Activity"]] = relationship("Activity", back_populates="project")

    def __repr__(self):
        return f"<Project {self.title}>"
