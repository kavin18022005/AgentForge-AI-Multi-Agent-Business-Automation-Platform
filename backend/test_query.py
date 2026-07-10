import asyncio
import uuid
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.project import Project

async def test():
    project_id_str = "ba156cbe-9acf-4a22-a914-c5d7d7375fe0"
    print("Testing string uuid:")
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Project).where(Project.id == project_id_str))
            p = result.scalar_one_or_none()
            print("String worked:", p)
    except Exception as e:
        import traceback
        traceback.print_exc()

    print("\nTesting uuid.UUID object:")
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id_str)))
            p = result.scalar_one_or_none()
            print("Object worked:", p)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
