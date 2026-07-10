"""File uploads router"""
import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.activity import Upload
from app.models.project import Project
from app.models.user import User
from app.schemas import UploadOut
from app.utils.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/png": "png",
    "image/jpeg": "jpg",
}


@router.post("/{project_id}", response_model=UploadOut, status_code=201)
async def upload_file(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file to a project for AI analysis."""
    # Verify project ownership
    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type and extension
    content_type = file.content_type or ""
    filename = file.filename or ""
    file_ext = None
    
    # Extension mapping to normalized extension
    ext_mapping = {
        "pdf": "pdf",
        "docx": "docx",
        "txt": "txt",
        "csv": "csv",
        "xlsx": "xlsx",
        "pptx": "pptx",
        "png": "png",
        "jpg": "jpg",
        "jpeg": "jpg",
    }
    
    if content_type in ALLOWED_TYPES:
        file_ext = ALLOWED_TYPES[content_type]
    else:
        # Fallback to extension check
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext in ext_mapping:
            file_ext = ext_mapping[ext]
            
    if not file_ext:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Supported extensions: {', '.join(ext_mapping.keys())}"
        )

    # Check file size
    content = await file.read()
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Save to disk
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    os.makedirs(upload_dir, exist_ok=True)

    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Create DB record
    upload = Upload(
        project_id=project_id,
        filename=unique_filename,
        original_name=file.filename or unique_filename,
        file_type=file_ext,
        file_size=len(content),
        file_path=file_path,
        analysis_status="pending",
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    return UploadOut.model_validate(upload)


@router.get("/{project_id}", response_model=list[UploadOut])
async def list_uploads(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all uploads for a project."""
    result = await db.execute(
        select(Upload)
        .join(Project, Upload.project_id == Project.id)
        .where(Upload.project_id == project_id, Project.owner_id == current_user.id)
    )
    uploads = result.scalars().all()
    return [UploadOut.model_validate(u) for u in uploads]
