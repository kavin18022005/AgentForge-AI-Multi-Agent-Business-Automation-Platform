"""Projects router – CRUD + workflow triggering"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
import uuid

from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.activity import Activity, Notification
from app.models.user import User
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate, TaskOut
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project and kick off the AI agent workflow."""
    if current_user.ai_credits < 10:
        raise HTTPException(status_code=402, detail="Insufficient AI credits")

    project = Project(
        owner_id=current_user.id,
        title=data.title,
        goal=data.goal,
        description=data.description,
        category=data.category,
        tags=data.tags,
        priority=data.priority,
        status="pending",
    )
    db.add(project)
    await db.flush()

    # Log activity
    activity = Activity(
        user_id=current_user.id,
        project_id=project.id,
        action="project_created",
        description=f"Project '{project.title}' created",
    )
    db.add(activity)
    await db.commit()
    await db.refresh(project)

    # Launch agent workflow in background
    background_tasks.add_task(run_agent_workflow, str(project.id), str(current_user.id))

    return ProjectOut.model_validate(project)


@router.get("/", response_model=list[ProjectOut])
async def list_projects(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the current user."""
    query = select(Project).where(Project.owner_id == current_user.id)

    if status:
        query = query.where(Project.status == status)
    if category:
        query = query.where(Project.category == category)
    if search:
        query = query.where(Project.title.ilike(f"%{search}%"))

    query = query.order_by(desc(Project.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().all()
    return [ProjectOut.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single project by ID."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update project metadata."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.title is not None:
        project.title = data.title
    if data.description is not None:
        project.description = data.description
    if data.tags is not None:
        project.tags = data.tags
    if data.is_favourite is not None:
        project.is_favourite = data.is_favourite
    if data.priority is not None:
        project.priority = data.priority

    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and all associated data."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/duplicate", response_model=ProjectOut)
async def duplicate_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a project (copies metadata, resets status)."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Project not found")

    new_project = Project(
        owner_id=current_user.id,
        title=f"{original.title} (Copy)",
        goal=original.goal,
        description=original.description,
        category=original.category,
        tags=original.tags,
        priority=original.priority,
        status="pending",
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return ProjectOut.model_validate(new_project)


@router.get("/{project_id}/tasks", response_model=list[TaskOut])
async def get_project_tasks(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all agent tasks for a project."""
    # Verify ownership
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.order)
    )
    tasks = result.scalars().all()
    return [TaskOut.model_validate(t) for t in tasks]


async def run_agent_workflow(project_id: str, user_id: str):
    """Background task that runs the LangGraph multi-agent workflow."""
    from app.agents.graph import run_workflow
    await run_workflow(project_id, user_id)
