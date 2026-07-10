"""Pydantic schemas for all API endpoints"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Any, Optional
from datetime import datetime
import uuid


# ──────────────────────────────────────────────
# Auth Schemas
# ──────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


# ──────────────────────────────────────────────
# User Schemas
# ──────────────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    ai_credits: int
    plan: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None


# ──────────────────────────────────────────────
# Project Schemas
# ──────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    goal: str = Field(..., min_length=10, max_length=2000)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    priority: str = "medium"


class ProjectOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: Optional[str] = None
    goal: str
    category: Optional[str] = None
    status: str
    progress: float
    current_agent: Optional[str] = None
    tags: Optional[list] = None
    is_favourite: bool
    priority: str
    credits_used: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    is_favourite: Optional[bool] = None
    priority: Optional[str] = None


# ──────────────────────────────────────────────
# Task Schemas
# ──────────────────────────────────────────────

class TaskOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    agent_name: str
    agent_type: str
    title: str
    description: Optional[str] = None
    status: str
    order: int
    output_data: Optional[dict] = None
    error_message: Optional[str] = None
    tokens_used: int
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Report Schemas
# ──────────────────────────────────────────────

class ReportOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    executive_summary: Optional[str] = None
    content: Optional[dict] = None
    report_type: str
    status: str
    pdf_path: Optional[str] = None
    docx_path: Optional[str] = None
    pptx_path: Optional[str] = None
    financial_data: Optional[dict] = None
    risk_data: Optional[dict] = None
    market_data: Optional[dict] = None
    word_count: int
    quality_score: float
    is_favourite: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Activity & Notification Schemas
# ──────────────────────────────────────────────

class ActivityOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    action: str
    description: str
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    type: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Analytics Schemas
# ──────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_projects: int
    running_projects: int
    completed_projects: int
    failed_projects: int
    total_reports: int
    ai_credits_remaining: int
    avg_completion_minutes: float
    success_rate: float


class AgentPerformance(BaseModel):
    agent_name: str
    tasks_completed: int
    avg_duration_seconds: float
    success_rate: float
    total_tokens: int


# ──────────────────────────────────────────────
# Upload Schemas
# ──────────────────────────────────────────────

class UploadOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    filename: str
    original_name: str
    file_type: str
    file_size: int
    analysis_status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# WebSocket Message Schemas
# ──────────────────────────────────────────────

class WSMessage(BaseModel):
    type: str  # agent_start, agent_progress, agent_complete, workflow_complete, error
    project_id: str
    agent: Optional[str] = None
    message: Optional[str] = None
    progress: Optional[float] = None
    data: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


Token.model_rebuild()
