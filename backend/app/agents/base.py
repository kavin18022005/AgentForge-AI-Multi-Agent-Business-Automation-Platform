"""
Base agent with Gemini LLM, WebSocket broadcasting, and DB update helpers.
All specialized agents inherit from this class.
"""
import json
import asyncio
import re
from datetime import datetime
from typing import Any
from loguru import logger

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage

from app.config import settings
from app.agents.state import AgentForgeState


def get_llm(temperature: float = 0.7) -> Any:
    """Return a configured LLM instance (supports Mock LLM in dev)."""
    if settings.USE_MOCK_LLM:
        class MockResponse:
            def __init__(self, content):
                self.content = content

        class MockLLM:
            async def ainvoke(self, messages, **kwargs):
                prompt_content = messages[0].content if messages else ""
                import json

                if "Manager Agent" in prompt_content or "execution_plan" in prompt_content:
                    data = {
                        "execution_plan": {
                            "phases": ["Market Research", "Product Strategy", "Financial Modeling", "Marketing Plan", "Risk Analysis"],
                            "timeline": "4-6 Months",
                            "milestones": ["Phase 1: Goal Analysis Complete", "Phase 2: Target Demographics Identified", "Phase 3: Cost and Revenue Projections Completed", "Phase 4: Growth Blueprint Delivered"]
                        },
                        "subtasks": [
                            {"title": "Map out the market opportunity and swot analysis", "assigned_to": "Research Agent"},
                            {"title": "Detail competitor pricing and positioning", "assigned_to": "Competitor Agent"},
                            {"title": "Build the product roadmap and revenue model", "assigned_to": "Strategy Agent"},
                            {"title": "Perform budget estimation and break-even forecast", "assigned_to": "Financial Agent"},
                            {"title": "Draft SEO strategy and budget allocations", "assigned_to": "Marketing Agent"},
                            {"title": "Formulate a risk register and mitigation blueprint", "assigned_to": "Risk Agent"}
                        ]
                    }
                elif "Research Agent" in prompt_content or "market_overview" in prompt_content:
                    data = {
                        "market_overview": "The market shows strong expansion opportunities with a 15% year-over-year growth in premium sustainable niches. High demand from urban professionals.",
                        "industry_trends": ["Eco-conscious packaging", "Direct-to-consumer delivery models", "High-quality personalization"],
                        "customer_segments": [
                            {"segment": "Primary: Urban Professionals", "demographics": "Ages 25-45, middle to high income, values sustainability and convenience"},
                            {"segment": "Secondary: Gen Z Consumers", "demographics": "Ages 18-24, values ethical sourcing and unique branding"}
                        ],
                        "swot_analysis": {
                            "strengths": ["Niche sustainability branding", "Direct online distribution pipeline"],
                            "weaknesses": ["No initial brand equity", "Higher shipping costs per unit"],
                            "opportunities": ["Expand product variety", "Corporate sustainable gift programs"],
                            "threats": ["Established bulk brand competitors", "Fluctuating raw material pricing"]
                        },
                        "market_size": "$3.2 Billion"
                    }
                elif "Competitor Agent" in prompt_content or "competitive_landscape" in prompt_content:
                    data = {
                        "competitors": [
                            {"name": "Establish Brands Inc.", "share": "45%", "advantage": "Global supply chain & low pricing"},
                            {"name": "EcoPack Specialty", "share": "8%", "advantage": "Niche green branding"}
                        ],
                        "competitive_landscape": {
                            "market_structure": "Consolidated at the top, but highly fragmented in premium/sustainable segments.",
                            "intensity": "Moderate to High"
                        },
                        "competitive_advantages": [
                            "100% compostable packaging with verifiable source transparency",
                            "Highly tailored curation and superior customer care"
                        ]
                    }
                elif "Strategy Agent" in prompt_content or "business_model_canvas" in prompt_content:
                    data = {
                        "business_model_canvas": {
                            "key_partners": ["Fair-trade coffee cooperatives", "Compostable packaging suppliers", "Courier networks"],
                            "key_activities": ["Curating product selections", "Direct-to-consumer digital marketing", "Brand management"],
                            "value_propositions": ["Guilt-free premium coffee experience", "Seamless home delivery subscription"],
                            "customer_relationships": ["Highly automated subscriptions", "Loyalty rewards & feedback surveys"],
                            "channels": ["E-commerce storefront", "Social media content marketing"]
                        },
                        "revenue_model": {
                            "type": "Monthly subscription base (different volume tiers)",
                            "recurring_revenue": "Strong predictability"
                        },
                        "pricing_strategy": {
                            "tiers": ["Starter (1 bag/mo): $18", "Standard (2 bags/mo): $32", "Office Pro (5 bags/mo): $75"],
                            "logic": "Value-based pricing capturing the premium sustainability premium."
                        },
                        "growth_strategy": {
                            "mechanisms": ["Customer referral incentives", "Collaborations with sustainable workspace brands"],
                            "phases": ["Phase 1: Pilot Launch (500 users)", "Phase 2: Scale marketing channels", "Phase 3: B2B partnerships"]
                        },
                        "product_roadmap": [
                            {"feature": "Compostable packaging line", "timeline": "Month 1"},
                            {"feature": "Personalized taste profiler tool", "timeline": "Month 3"},
                            {"feature": "Custom blend curation option", "timeline": "Month 6"}
                        ]
                    }
                elif "Financial Agent" in prompt_content or "budget_estimation" in prompt_content:
                    data = {
                        "budget_estimation": {
                            "startup_costs": 35000,
                            "marketing_budget": 12000,
                            "operational_costs": 8000
                        },
                        "revenue_forecast": {
                            "year_1": 150000,
                            "year_2": 350000,
                            "year_3": 800000
                        },
                        "roi_analysis": {
                            "expected_roi_year3": "150%",
                            "internal_rate_of_return": "42%"
                        },
                        "break_even_analysis": {
                            "break_even_timeline": "12",
                            "break_even_units": 650
                        },
                        "financial_risks": ["Slower subscription adoption rate", "Increased custom acquisition cost (CAC)"]
                    }
                elif "Marketing Agent" in prompt_content or "marketing_strategy" in prompt_content:
                    data = {
                        "marketing_strategy": {
                            "primary_channels": ["Paid social media ads", "Content marketing & SEO", "Email automation"],
                            "budget_allocation": "Social Ads: 50%, Content/SEO: 30%, Email/Influencer: 20%"
                        },
                        "seo_plan": {
                            "target_keywords": ["compostable coffee subscription", "organic fair-trade coffee", "sustainable coffee brand"],
                            "on_page_strategies": ["Publishing farmers' sourcing journals", "Optimized subscription landing pages"]
                        },
                        "social_media_campaigns": {
                            "platforms": ["Instagram", "Pinterest", "TikTok"],
                            "focus": "Visual storytelling of sustainability impact and product unboxing experiences."
                        },
                        "content_calendar": [
                            {"topic": "The zero-waste kitchen guide", "frequency": "Bi-weekly"},
                            {"topic": "Meet the farmers who grow your coffee", "frequency": "Monthly"}
                        ],
                        "brand_positioning": "The ethically sourced, zero-waste specialty coffee subscription for the modern home."
                    }
                elif "Risk Analysis Agent" in prompt_content or "risk_register" in prompt_content:
                    data = {
                        "overall_risk_score": 5.8,
                        "risk_level": "medium",
                        "risk_register": [
                            {"risk": "Sourcing delays or crop failures at source farms", "likelihood": "3", "impact": "4", "mitigation": "Establish relations with multiple regional cooperatives"},
                            {"risk": "Ad-blockers and rising ad CPMs impacting acquisition", "likelihood": "4", "impact": "3", "mitigation": "Build robust SEO content and organic community channels"}
                        ],
                        "critical_risks": ["Supply chain sourcing reliability", "Ad channel cost escalation"],
                        "mitigation_plan": {
                            "immediate_actions": ["Diversify green bean sourcing contracts"],
                            "short_term": ["Deploy structured organic content marketing pipeline"],
                            "long_term": ["Maintain a 2-month reserve inventory of green coffee beans"]
                        }
                    }
                elif "QA Agent" in prompt_content or "quality_score" in prompt_content:
                    data = {
                        "quality_score": 9.2,
                        "feedback": ["Financial plan matches the target CAC goals", "Competitor positioning provides clear USP"],
                        "approved": True
                    }
                else:
                    return MockResponse(
                        "# Executive Intelligence Report\n\n"
                        "## Executive Summary\n"
                        "This report provides a comprehensive review of the market potential, growth strategy, and "
                        "operational requirements to successfully launch the proposed business objective. "
                        "Our findings indicate a clear market niche with highly viable financial metrics.\n\n"
                        "## Core Recommendations\n"
                        "- Launch direct-to-consumer with a focused sustainability value proposition.\n"
                        "- Leverage organic brand authority and transparent sourcing to lower CAC.\n"
                        "- Scale from a pilot group of 500 users to test subscription metrics."
                    )

                return MockResponse(json.dumps(data))

        return MockLLM()

    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=temperature,
        convert_system_message_to_human=True,
    )


def extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Remove markdown code block if present
    cleaned = re.sub(r"```(?:json)?\n?", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON object within the text
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    logger.warning(f"Could not parse JSON from LLM response. Returning raw text in dict.")
    return {"raw_output": text}


async def broadcast_ws(project_id: str, message: dict):
    """Broadcast a WebSocket message to all connected clients for this project."""
    from app.main import ws_manager  # imported late to avoid circular imports
    try:
        await ws_manager.broadcast(project_id, message)
    except Exception as e:
        logger.error(f"WebSocket broadcast failed: {e}")


async def update_project_status(
    project_id: str,
    status: str,
    progress: float,
    current_agent: str,
    db_session=None,
):
    """Update project status in the database."""
    from app.database import AsyncSessionLocal
    from app.models.project import Project
    from sqlalchemy import select
    import uuid

    project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == project_uuid))
        project = result.scalar_one_or_none()
        if project:
            project.status = status
            project.progress = progress
            project.current_agent = current_agent
            if status == "completed":
                project.completed_at = datetime.utcnow()
            await db.commit()


async def create_task_record(
    project_id: str,
    agent_name: str,
    agent_type: str,
    title: str,
    order: int,
) -> str:
    """Create a task record and return its ID."""
    from app.database import AsyncSessionLocal
    from app.models.task import Task
    import uuid

    project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id

    async with AsyncSessionLocal() as db:
        task = Task(
            project_id=project_uuid,
            agent_name=agent_name,
            agent_type=agent_type,
            title=title,
            order=order,
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return str(task.id)


async def complete_task_record(task_id: str, output_data: dict, tokens: int = 0, success: bool = True):
    """Mark a task as completed in the database."""
    from app.database import AsyncSessionLocal
    from app.models.task import Task
    from sqlalchemy import select
    import uuid

    task_uuid = uuid.UUID(task_id) if isinstance(task_id, str) else task_id

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task).where(Task.id == task_uuid))
        task = result.scalar_one_or_none()
        if task:
            task.status = "completed" if success else "failed"
            task.output_data = output_data
            task.tokens_used = tokens
            task.completed_at = datetime.utcnow()
            if task.started_at:
                task.duration_seconds = int(
                    (task.completed_at - task.started_at).total_seconds()
                )
            await db.commit()
