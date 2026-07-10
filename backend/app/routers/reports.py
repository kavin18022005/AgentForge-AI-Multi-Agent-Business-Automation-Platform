from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
import uuid
import os
from typing import Optional

from app.database import get_db
from app.models.report import Report
from app.models.project import Project
from app.models.user import User
from app.schemas import ReportOut
from app.utils.dependencies import get_current_user
from app.utils.security import decode_token

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def format_report_out(report: Report) -> ReportOut:
    """Format Report db object to schema with public download URLs."""
    out = ReportOut.model_validate(report)
    out.pdf_path = f"/api/reports/{report.id}/download/pdf"
    out.docx_path = f"/api/reports/{report.id}/download/docx"
    out.pptx_path = f"/api/reports/{report.id}/download/pptx"
    return out


@router.get("/", response_model=list[ReportOut])
async def list_reports(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all reports belonging to the current user."""
    # Join through project to filter by owner
    result = await db.execute(
        select(Report)
        .join(Project, Report.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
        .order_by(desc(Report.created_at))
        .offset(skip)
        .limit(limit)
    )
    reports = result.scalars().all()
    return [format_report_out(r) for r in reports]


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific report."""
    result = await db.execute(
        select(Report)
        .join(Project, Report.project_id == Project.id)
        .where(
            or_(Report.id == report_id, Report.project_id == report_id),
            Project.owner_id == current_user.id
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return format_report_out(report)


@router.get("/{report_id}/download/{format}")
async def download_report(
    report_id: uuid.UUID,
    format: str,
    request: Request,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Download report in PDF, DOCX, PPTX, or Markdown format."""
    if format not in ["pdf", "docx", "pptx", "md"]:
        raise HTTPException(status_code=400, detail="Invalid format. Choose: pdf, docx, pptx, md")

    # Try query parameter token first (critical for browser window.open)
    user_uuid = None
    if token:
        payload = decode_token(token)
        if payload and payload.get("sub"):
            try:
                user_uuid = uuid.UUID(payload.get("sub"))
            except ValueError:
                pass
                
    # Otherwise, fallback to Authorization header
    if not user_uuid:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_token = auth_header.split(" ")[1]
            payload = decode_token(bearer_token)
            if payload and payload.get("sub"):
                try:
                    user_uuid = uuid.UUID(payload.get("sub"))
                except ValueError:
                    pass
                    
    if not user_uuid:
        raise HTTPException(status_code=401, detail="Authentication credentials required")

    result = await db.execute(
        select(Report)
        .join(Project, Report.project_id == Project.id)
        .where(
            or_(Report.id == report_id, Report.project_id == report_id),
            Project.owner_id == user_uuid
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Determine file path
    path_map = {
        "pdf": report.pdf_path,
        "docx": report.docx_path,
        "pptx": report.pptx_path,
        "md": report.markdown_path,
    }

    file_path = path_map.get(format)

    if not file_path or not os.path.exists(file_path):
        # Generate on demand if not cached
        from app.services.report_service import generate_export
        file_path = await generate_export(report, format, db)

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "md": "text/markdown",
    }

    return FileResponse(
        path=os.path.abspath(file_path),
        media_type=media_types[format],
        filename=f"{report.title.replace(' ', '_')}.{format}",
    )


@router.patch("/{report_id}/favourite")
async def toggle_favourite(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle report favourite status."""
    result = await db.execute(
        select(Report)
        .join(Project, Report.project_id == Project.id)
        .where(
            or_(Report.id == report_id, Report.project_id == report_id),
            Project.owner_id == current_user.id
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.is_favourite = not report.is_favourite
    await db.commit()
    return {"is_favourite": report.is_favourite}
