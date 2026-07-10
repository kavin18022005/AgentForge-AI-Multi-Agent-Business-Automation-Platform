"""
LangGraph Shared Agent State
All agents read from and write to this TypedDict state object.
"""
from typing import TypedDict, Optional, Any
from datetime import datetime


class AgentForgeState(TypedDict):
    """Shared state passed between all agents in the LangGraph workflow."""

    # Project context
    project_id: str
    user_id: str
    user_goal: str
    project_title: str
    category: Optional[str]
    uploaded_documents: list[str]  # extracted text from uploads

    # Manager outputs
    execution_plan: Optional[dict]
    subtasks: Optional[list[dict]]

    # Research Agent outputs
    market_research: Optional[dict]
    industry_trends: Optional[list[str]]
    customer_segments: Optional[list[dict]]
    swot_analysis: Optional[dict]
    market_size: Optional[str]

    # Competitor Agent outputs
    competitors: Optional[list[dict]]
    competitive_landscape: Optional[dict]
    competitive_advantages: Optional[list[str]]

    # Strategy Agent outputs
    business_model_canvas: Optional[dict]
    revenue_model: Optional[dict]
    pricing_strategy: Optional[dict]
    growth_strategy: Optional[dict]
    product_roadmap: Optional[list[dict]]

    # Financial Agent outputs
    budget_estimation: Optional[dict]
    revenue_forecast: Optional[dict]
    roi_analysis: Optional[dict]
    break_even_analysis: Optional[dict]
    financial_risks: Optional[list[str]]

    # Marketing Agent outputs
    marketing_strategy: Optional[dict]
    seo_plan: Optional[dict]
    social_media_campaigns: Optional[dict]
    content_calendar: Optional[list[dict]]
    brand_positioning: Optional[str]

    # Risk Agent outputs
    risk_register: Optional[list[dict]]
    risk_score: Optional[float]
    mitigation_plan: Optional[dict]

    # QA Agent outputs
    quality_score: Optional[float]
    qa_feedback: Optional[list[str]]
    approved: Optional[bool]

    # Report Agent outputs
    executive_summary: Optional[str]
    final_report: Optional[dict]
    report_id: Optional[str]

    # Workflow tracking
    current_agent: str
    completed_agents: list[str]
    errors: list[dict]
    start_time: str
    messages: list[dict]  # agent log messages
