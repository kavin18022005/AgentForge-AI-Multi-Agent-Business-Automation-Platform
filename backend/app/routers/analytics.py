"""Analytics router – dashboard stats and agent performance"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from datetime import datetime, timedelta

from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.report import Report
from app.models.activity import Activity
from app.models.user import User
from app.schemas import DashboardStats, AgentPerformance, ActivityOut
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate dashboard statistics for the current user."""
    # Project counts
    proj_result = await db.execute(
        select(
            func.count(Project.id).label("total"),
            func.sum(case((Project.status == "running", 1), else_=0)).label("running"),
            func.sum(case((Project.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((Project.status == "failed", 1), else_=0)).label("failed"),
        ).where(Project.owner_id == current_user.id)
    )
    proj_stats = proj_result.one()

    # Report count
    report_result = await db.execute(
        select(func.count(Report.id))
        .join(Project, Report.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
    )
    total_reports = report_result.scalar() or 0

    # Average completion time (minutes)
    completed_projects = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id, Project.status == "completed")
    )
    completed = completed_projects.scalars().all()
    avg_mins = 0.0
    if completed:
        durations = [
            (p.completed_at - p.created_at).total_seconds() / 60
            for p in completed
            if p.completed_at and p.created_at
        ]
        avg_mins = sum(durations) / len(durations) if durations else 0.0

    total = proj_stats.total or 0
    done = proj_stats.completed or 0
    success_rate = (done / total * 100) if total > 0 else 0.0

    return DashboardStats(
        total_projects=total,
        running_projects=proj_stats.running or 0,
        completed_projects=done,
        failed_projects=proj_stats.failed or 0,
        total_reports=total_reports,
        ai_credits_remaining=current_user.ai_credits,
        avg_completion_minutes=round(avg_mins, 1),
        success_rate=round(success_rate, 1),
    )


@router.get("/agents", response_model=list[AgentPerformance])
async def get_agent_performance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return per-agent performance metrics."""
    result = await db.execute(
        select(
            Task.agent_name,
            func.count(Task.id).label("tasks_completed"),
            func.avg(Task.duration_seconds).label("avg_duration"),
            func.sum(case((Task.status == "completed", 1), else_=0)).label("successes"),
            func.sum(Task.tokens_used).label("total_tokens"),
        )
        .join(Project, Task.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
        .group_by(Task.agent_name)
    )
    rows = result.all()

    performance = []
    for row in rows:
        total_tasks = row.tasks_completed or 1
        success_rate = (row.successes or 0) / total_tasks * 100
        performance.append(
            AgentPerformance(
                agent_name=row.agent_name,
                tasks_completed=row.tasks_completed or 0,
                avg_duration_seconds=round(row.avg_duration or 0, 1),
                success_rate=round(success_rate, 1),
                total_tokens=row.total_tokens or 0,
            )
        )
    return performance


@router.get("/activity", response_model=list[ActivityOut])
async def get_activity_feed(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return recent activity feed."""
    result = await db.execute(
        select(Activity)
        .where(Activity.user_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()
    return [ActivityOut.model_validate(a) for a in activities]


@router.get("/timeline")
async def get_project_timeline(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return project creation timeline data for charts."""
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id, Project.created_at >= since)
        .order_by(Project.created_at)
    )
    projects = result.scalars().all()

    # Group by day
    by_day: dict[str, dict] = {}
    for p in projects:
        day = p.created_at.strftime("%Y-%m-%d")
        if day not in by_day:
            by_day[day] = {"date": day, "created": 0, "completed": 0}
        by_day[day]["created"] += 1
        if p.status == "completed":
            by_day[day]["completed"] += 1

    return list(by_day.values())


@router.get("/tokens")
async def get_token_usage(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return daily token consumption grouped by agent type for the given window.

    Each element in the returned list is::

        {"date": "YYYY-MM-DD", "agent_type": str, "tokens": int}
    """
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(
            Project.owner_id == current_user.id,
            Task.created_at >= since,
        )
        .order_by(Task.created_at)
    )
    tasks = result.scalars().all()

    # Aggregate: (date, agent_type) → token sum
    buckets: dict[tuple[str, str], int] = {}
    for t in tasks:
        day = t.created_at.strftime("%Y-%m-%d")
        key = (day, t.agent_type)
        buckets[key] = buckets.get(key, 0) + (t.tokens_used or 0)

    return [
        {"date": day, "agent_type": agent_type, "tokens": tokens}
        for (day, agent_type), tokens in sorted(buckets.items())
    ]


@router.get("/credits")
async def get_credit_burn(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return daily AI-credit consumption (sum of credits_used on projects).

    Each element::

        {"date": "YYYY-MM-DD", "credits": int, "cumulative": int}
    """
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Project)
        .where(
            Project.owner_id == current_user.id,
            Project.created_at >= since,
        )
        .order_by(Project.created_at)
    )
    projects = result.scalars().all()

    daily: dict[str, int] = {}
    for p in projects:
        day = p.created_at.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + (p.credits_used or 0)

    # Build sorted list with running cumulative total
    output = []
    cumulative = 0
    for day in sorted(daily):
        cumulative += daily[day]
        output.append({"date": day, "credits": daily[day], "cumulative": cumulative})

    return output


@router.get("/tasks/breakdown")
async def get_task_status_breakdown(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate task counts grouped by status and agent type.

    Shape::

        [{"agent_type": str, "status": str, "count": int}, ...]
    """
    result = await db.execute(
        select(
            Task.agent_type,
            Task.status,
            func.count(Task.id).label("count"),
        )
        .join(Project, Task.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
        .group_by(Task.agent_type, Task.status)
        .order_by(Task.agent_type, Task.status)
    )
    rows = result.all()
    return [
        {"agent_type": row.agent_type, "status": row.status, "count": row.count}
        for row in rows
    ]


@router.get("/categories")
async def get_category_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return project counts and average success rate per category.

    Shape::

        [{"category": str, "total": int, "completed": int, "success_rate": float}, ...]
    """
    result = await db.execute(
        select(
            Project.category,
            func.count(Project.id).label("total"),
            func.sum(case((Project.status == "completed", 1), else_=0)).label("completed"),
        )
        .where(Project.owner_id == current_user.id)
        .group_by(Project.category)
        .order_by(func.count(Project.id).desc())
    )
    rows = result.all()

    return [
        {
            "category": row.category or "uncategorised",
            "total": row.total or 0,
            "completed": row.completed or 0,
            "success_rate": round(
                (row.completed or 0) / (row.total or 1) * 100, 1
            ),
        }
        for row in rows
    ]
