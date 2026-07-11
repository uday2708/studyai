import logging
from flask import Blueprint
from backend.repositories.db_repository import MaterialRepository, StudyPlanRepository
from backend.schemas.validation_schemas import validate_payload, GenerateStudyPlanSchema
from backend.middleware.auth_middleware import token_required
from backend.services.ai_service import AIService
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

study_plan_bp = Blueprint("study_plans", __name__)

@study_plan_bp.route("/generate", methods=["POST"])
@token_required
@validate_payload(GenerateStudyPlanSchema)
def generate_study_plan(current_user_id, payload: GenerateStudyPlanSchema):
    """
    Generate an intelligent markdown study plan based on user goals, weak topics, and uploaded materials.
    """
    logger.info(f"Study plan generation requested for user {current_user_id} ({payload.duration_days} days).")
    
    # 1. Fetch completed materials text for context
    materials = MaterialRepository.get_by_user(current_user_id)
    completed_materials = [m for m in materials if m["status"] == "completed" and m.get("text_content")]
    
    if not completed_materials:
        return api_response(
            success=False,
            message="No parsed study materials found. Please upload materials (PDF, DOCX, TXT) before generating a study plan.",
            status_code=400
        )
        
    material_texts = [m["text_content"] for m in completed_materials]

    # 2. Invoke Groq AI
    study_plan_markdown = AIService.generate_study_plan(
        duration_days=payload.duration_days,
        goals=payload.goals,
        material_texts=material_texts,
        weak_topics=payload.weak_topics
    )
    
    # 3. Store in DB (keeps only the latest plan per user)
    plan_data = {
        "user_id": current_user_id,
        "duration_days": payload.duration_days,
        "goals": payload.goals,
        "weak_topics": payload.weak_topics,
        "markdown_content": study_plan_markdown
    }
    
    plan_id = StudyPlanRepository.create_or_update(plan_data)
    plan_data["id"] = plan_id
    
    logger.info(f"Study plan generated successfully. Plan ID: {plan_id}")
    return api_response(
        success=True,
        message="Study plan generated successfully.",
        data=plan_data
    )

@study_plan_bp.route("", methods=["GET"])
@token_required
def get_study_plan(current_user_id):
    """
    Retrieve the current study plan for the authenticated user.
    """
    plan = StudyPlanRepository.get_by_user(current_user_id)
    if not plan:
        return api_response(
            success=False,
            message="No study plan generated yet.",
            status_code=404
        )
        
    return api_response(
        success=True,
        message="Study plan retrieved successfully.",
        data=plan
    )
