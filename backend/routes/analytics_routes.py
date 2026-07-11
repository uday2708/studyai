import logging
from flask import Blueprint
from backend.repositories.db_repository import MaterialRepository, SummaryRepository, FlashcardRepository, QuizRepository, AnalyticsRepository
from backend.middleware.auth_middleware import token_required
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__)

@analytics_bp.route("", methods=["GET"])
@token_required
def get_analytics(current_user_id):
    """
    Retrieve and dynamically update study analytics for the user.
    """
    logger.info(f"Analytics query for user {current_user_id}.")
    
    # Get base analytics document
    analytics = AnalyticsRepository.get_by_user(current_user_id)
    
    try:
        # Dynamically recalculate upload/summary/flashcard counts to ensure consistency
        materials = MaterialRepository.get_by_user(current_user_id)
        analytics["materials_uploaded"] = len(materials)
        
        # Calculate summaries count
        summaries_count = 0
        for m in materials:
            if SummaryRepository.get_by_material(m["id"]):
                summaries_count += 1
        analytics["summaries_generated"] = summaries_count
        
        # Calculate flashcards count and known status
        total_cards = 0
        known_cards = 0
        for m in materials:
            f_set = FlashcardRepository.get_by_material(m["id"])
            if f_set:
                for c in f_set.get("cards", []):
                    total_cards += 1
                    if c.get("known", False):
                        known_cards += 1
        analytics["flashcards_generated"] = total_cards
        
        # Update completion percentage
        completion = (known_cards / total_cards * 100) if total_cards > 0 else 0.0
        analytics["completion_percentage"] = round(completion, 2)
        
        # Aggregate weak topics from all quizzes
        quizzes = QuizRepository.get_by_user(current_user_id)
        weak_topics_set = set()
        for q in quizzes:
            for submission in q.get("submissions", []):
                for topic in submission.get("weak_topics", []):
                    weak_topics_set.add(topic)
                    
        analytics["weak_topics"] = list(weak_topics_set)
        
        # Save back the refreshed analytics metrics
        AnalyticsRepository.create_or_update(current_user_id, analytics)
        
    except Exception as ex:
        logger.error(f"Error self-healing user analytics: {ex}")
        
    return api_response(
        success=True,
        message="Analytics retrieved successfully.",
        data=analytics
    )
