import logging
from flask import Blueprint
from backend.repositories.db_repository import MaterialRepository, FlashcardRepository, AnalyticsRepository
from backend.schemas.validation_schemas import validate_payload, GenerateFlashcardsSchema, MarkCardKnownSchema
from backend.middleware.auth_middleware import token_required
from backend.services.ai_service import AIService
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

flashcard_bp = Blueprint("flashcards", __name__)

@flashcard_bp.route("/generate", methods=["POST"])
@token_required
@validate_payload(GenerateFlashcardsSchema)
def generate_flashcards(current_user_id, payload: GenerateFlashcardsSchema):
    """
    Generate AI flashcards for a study material.
    """
    logger.info(f"Flashcards generation requested for material ID: {payload.material_id}")
    
    # 1. Fetch and validate material
    material = MaterialRepository.get_by_id(payload.material_id)
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
        
    if material["status"] != "completed":
        return api_response(
            success=False,
            message="Material is not fully parsed yet.",
            status_code=400
        )

    # 2. Invoke Groq AI
    cards = AIService.generate_flashcards(material["text_content"])
    
    # Enrich cards with dynamic 'known' state
    for card in cards:
        card["known"] = False

    # 3. Store in DB
    flashcard_set = {
        "user_id": current_user_id,
        "material_id": payload.material_id,
        "title": f"Flashcards from {material['title']}",
        "cards": cards
    }
    
    set_id = FlashcardRepository.create_or_update_set(flashcard_set)
    flashcard_set["id"] = set_id

    # 4. Update user analytics
    try:
        analytics = AnalyticsRepository.get_by_user(current_user_id)
        analytics["flashcards_generated"] += len(cards)
        AnalyticsRepository.create_or_update(current_user_id, analytics)
    except Exception as ex:
        logger.error(f"Failed to increment flashcards analytics count: {ex}")

    logger.info(f"Flashcards generated successfully for material {payload.material_id}. Set ID: {set_id}")
    return api_response(
        success=True,
        message="Flashcards generated successfully.",
        data=flashcard_set
    )

@flashcard_bp.route("/<material_id>", methods=["GET"])
@token_required
def get_flashcards(current_user_id, material_id):
    """
    Get generated flashcards for a specific material.
    """
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
        
    flashcards = FlashcardRepository.get_by_material(material_id)
    if not flashcards:
        return api_response(
            success=False,
            message="No flashcards generated for this material yet.",
            status_code=404
        )
        
    return api_response(
        success=True,
        message="Flashcards retrieved successfully.",
        data=flashcards
    )

@flashcard_bp.route("/<flashcard_id>/known", methods=["PUT"])
@token_required
@validate_payload(MarkCardKnownSchema)
def mark_card_known(current_user_id, flashcard_id, payload: MarkCardKnownSchema):
    """
    Mark a flashcard in a set as known or unknown.
    """
    flashcard_set = FlashcardRepository.get_by_id(flashcard_id)
    if not flashcard_set:
        return api_response(
            success=False,
            message="Flashcard set not found.",
            status_code=404
        )
        
    if flashcard_set["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied to this flashcard set.",
            status_code=403
        )
        
    cards = flashcard_set.get("cards", [])
    if payload.card_index >= len(cards):
        return api_response(
            success=False,
            message="Invalid card index.",
            status_code=400
        )
        
    # Update known status
    cards[payload.card_index]["known"] = payload.known
    
    # Save back to database
    FlashcardRepository.update_set(flashcard_id, flashcard_set)
    
    # Recalculate global completion percentage in analytics
    try:
        # Sum total cards vs total known across ALL card sets for user
        # We can implement a simplified progress metric here
        analytics = AnalyticsRepository.get_by_user(current_user_id)
        # For simplicity, we can recalculate later or update now. Let's do a simple calculation:
        # Check all flashcard sets for user, count total known vs total cards.
        # But to prevent excessive DB reads, we can just update completion percentage based on this action or simple formula.
        # Let's count completion percentage as (total_known / total_cards) * 100
        # Actually, let's keep it simple:
        # we will fetch all materials, and if they have flashcards we count them.
        materials = MaterialRepository.get_by_user(current_user_id)
        total_cards = 0
        known_cards = 0
        for m in materials:
            f_set = FlashcardRepository.get_by_material(m["id"])
            if f_set:
                for c in f_set.get("cards", []):
                    total_cards += 1
                    if c.get("known", False):
                        known_cards += 1
                        
        completion = (known_cards / total_cards * 100) if total_cards > 0 else 0.0
        analytics["completion_percentage"] = round(completion, 2)
        AnalyticsRepository.create_or_update(current_user_id, analytics)
    except Exception as ex:
        logger.error(f"Failed to update completion percentage: {ex}")

    return api_response(
        success=True,
        message="Flashcard status updated successfully.",
        data=flashcard_set
    )
