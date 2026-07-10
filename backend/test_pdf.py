import asyncio
from app.database import AsyncSessionLocal
from app.models.report import Report
from app.services.report_service import generate_pdf
from sqlalchemy import select
import os
import uuid

async def test():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Report).where(Report.id == uuid.UUID("4f6d76eaf52143efb5387d73727b6316")))
        r = res.scalar_one()
        print("Report loaded:", r.title)
        test_path = "test_export.pdf"
        if os.path.exists(test_path):
            os.remove(test_path)
        await generate_pdf(r, test_path)
        print("PDF generated successfully:", os.path.exists(test_path))

if __name__ == "__main__":
    asyncio.run(test())
