import logging
from flask import Blueprint
from backend.repositories.db_repository import MaterialRepository, SummaryRepository, AnalyticsRepository
from backend.schemas.validation_schemas import validate_payload, GenerateSummarySchema
from backend.middleware.auth_middleware import token_required
from backend.services.ai_service import AIService
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

summary_bp = Blueprint("summaries", __name__)

@summary_bp.route("/generate", methods=["POST"])
@token_required
@validate_payload(GenerateSummarySchema)
def generate_summary(current_user_id, payload: GenerateSummarySchema):
    """
    Generate an AI summary for a study material.
    """
    logger.info(f"Summary generation requested for material ID: {payload.material_id}")
    
    # 1. Fetch and validate material
    material = MaterialRepository.get_by_id(payload.material_id)
    if not material:
        return api_response(
            success=False,
            message="Study material not found.",
            status_code=404
        )
        
    if material["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied to this material.",
            status_code=403
        )
        
    if material["status"] != "completed":
        return api_response(
            success=False,
            message="Material is not parsed yet. Current status: " + material["status"],
            status_code=400
        )
        
    if not material.get("text_content"):
        return api_response(
            success=False,
            message="No text content found in material to summarize.",
            status_code=400
        )

    # 2. Invoke Groq AI
    summary_markdown = AIService.generate_summary(material["text_content"])
    
    # 3. Store in DB
    summary_data = {
        "user_id": current_user_id,
        "material_id": payload.material_id,
        "title": f"Summary of {material['title']}",
        "markdown_content": summary_markdown
    }
    summary_id = SummaryRepository.create_or_update(summary_data)
    summary_data["id"] = summary_id

    # 4. Update user analytics counts
    try:
        analytics = AnalyticsRepository.get_by_user(current_user_id)
        analytics["summaries_generated"] += 1
        AnalyticsRepository.create_or_update(current_user_id, analytics)
    except Exception as ex:
        logger.error(f"Failed to increment summaries analytics count: {ex}")

    logger.info(f"Summary generated successfully for material {payload.material_id}.")
    return api_response(
        success=True,
        message="Summary generated successfully.",
        data=summary_data
    )

@summary_bp.route("/<material_id>", methods=["GET"])
@token_required
def get_summary_by_material(current_user_id, material_id):
    """
    Get the summary of a specific material, if generated.
    """
    # Verify material access first
    material = MaterialRepository.get_by_id(material_id)
    if not material:
        return api_response(
            success=False,
            message="Material not found.",
            status_code=404
        )
        
    if material["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied to this material.",
            status_code=403
        )
        
    summary = SummaryRepository.get_by_material(material_id)
    if not summary:
        return api_response(
            success=False,
            message="No summary generated for this material yet.",
            status_code=404
        )
        
    return api_response(
        success=True,
        message="Summary retrieved successfully.",
        data=summary
    )
