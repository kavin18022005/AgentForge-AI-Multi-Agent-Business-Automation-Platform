"""Models package – import all models so Alembic can detect them"""
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.report import Report
from app.models.activity import Activity, Notification, Upload

__all__ = ["User", "Project", "Task", "Report", "Activity", "Notification", "Upload"]
