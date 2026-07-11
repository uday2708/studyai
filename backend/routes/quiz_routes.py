import logging
from datetime import datetime, timezone
from flask import Blueprint
from backend.repositories.db_repository import MaterialRepository, QuizRepository, AnalyticsRepository
from backend.schemas.validation_schemas import validate_payload, GenerateQuizSchema, SubmitQuizSchema
from backend.middleware.auth_middleware import token_required
from backend.services.ai_service import AIService
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

quiz_bp = Blueprint("quizzes", __name__)

def sanitize_quiz_for_client(quiz):
    """
    Strip correct answers and explanations from quiz questions to prevent cheating.
    """
    quiz_copy = quiz.copy()
    questions_copy = []
    for q in quiz.get("questions", []):
        q_copy = q.copy()
        if "correct_answer" in q_copy:
            del q_copy["correct_answer"]
        if "explanation" in q_copy:
            del q_copy["explanation"]
        questions_copy.append(q_copy)
    quiz_copy["questions"] = questions_copy
    return quiz_copy

@quiz_bp.route("/generate", methods=["POST"])
@token_required
@validate_payload(GenerateQuizSchema)
def generate_quiz(current_user_id, payload: GenerateQuizSchema):
    """
    Generate an AI quiz from a study material.
    """
    logger.info(f"Quiz generation requested for material ID: {payload.material_id}, count: {payload.count}")
    
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
    questions = AIService.generate_quiz(
        content_text=material["text_content"],
        quiz_type=payload.quiz_type,
        count=payload.count
    )

    # 3. Store in DB
    quiz_data = {
        "user_id": current_user_id,
        "material_id": payload.material_id,
        "title": f"Quiz from {material['title']}",
        "quiz_type": payload.quiz_type,
        "questions": questions,
        "submissions": []
    }
    
    quiz_id = QuizRepository.create_or_update(quiz_data)
    quiz_data["id"] = quiz_id

    # 4. Return sanitized quiz
    sanitized = sanitize_quiz_for_client(quiz_data)
    
    logger.info(f"Quiz generated successfully. Quiz ID: {quiz_id}")
    return api_response(
        success=True,
        message="Quiz generated successfully.",
        data=sanitized
    )

@quiz_bp.route("/<quiz_id>", methods=["GET"])
@token_required
def get_quiz_by_id(current_user_id, quiz_id):
    """
    Retrieve a specific quiz by ID (sanitized).
    """
    quiz = QuizRepository.get_by_id(quiz_id)
    if not quiz:
        return api_response(
            success=False,
            message="Quiz not found.",
            status_code=404
        )
        
    if quiz["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied to this quiz.",
            status_code=403
        )
        
    return api_response(
        success=True,
        message="Quiz retrieved successfully.",
        data=sanitize_quiz_for_client(quiz)
    )

@quiz_bp.route("/material/<material_id>", methods=["GET"])
@token_required
def get_quizzes_by_material(current_user_id, material_id):
    """
    Get all quizzes generated for a material (sanitized).
    """
    # Verify access
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
            message="Access denied.",
            status_code=403
        )
        
    quizzes = QuizRepository.get_by_material(material_id)
    sanitized_quizzes = [sanitize_quiz_for_client(q) for q in quizzes]
    
    return api_response(
        success=True,
        message="Quizzes retrieved successfully.",
        data=sanitized_quizzes
    )

@quiz_bp.route("/<quiz_id>/submit", methods=["POST"])
@token_required
@validate_payload(SubmitQuizSchema)
def submit_quiz(current_user_id, quiz_id, payload: SubmitQuizSchema):
    """
    Evaluate user quiz answers, append submission records, and update analytics metrics.
    """
    logger.info(f"Quiz submission evaluation started for Quiz: {quiz_id}")
    
    # 1. Fetch full quiz (including answers)
    quiz = QuizRepository.get_by_id(quiz_id)
    if not quiz:
        return api_response(
            success=False,
            message="Quiz not found.",
            status_code=404
        )
        
    if quiz["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied.",
            status_code=403
        )

    # 2. Grade quiz via AIService
    evaluation = AIService.evaluate_quiz_submission(
        quiz_questions=quiz["questions"],
        user_answers=payload.answers
    )
    
    # 3. Save submission entry inside quiz
    submission_entry = {
        "score": evaluation["score"],
        "max_score": evaluation["max_score"],
        "answers": payload.answers,
        "weak_topics": evaluation["weak_topics"],
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    quiz.setdefault("submissions", []).append(submission_entry)
    QuizRepository.update(quiz_id, quiz)
    
    # 4. Update user analytics
    try:
        analytics = AnalyticsRepository.get_by_user(current_user_id)
        
        # Log quiz score
        score_record = {
            "quiz_id": quiz_id,
            "title": quiz.get("title", "Practice Quiz"),
            "score": evaluation["score"],
            "max_score": evaluation["max_score"],
            "date": datetime.now(timezone.utc).isoformat()
        }
        analytics.setdefault("quiz_scores", []).append(score_record)
        
        # Add study time estimate (each quiz submission adds roughly 15 minutes of active study = 0.25h)
        analytics["study_hours"] = round(analytics.get("study_hours", 0.0) + 0.25, 2)
        
        AnalyticsRepository.create_or_update(current_user_id, analytics)
    except Exception as ex:
        logger.error(f"Failed to update analytics for quiz submission: {ex}")

    logger.info(f"Quiz evaluated. Score: {evaluation['score']}/{evaluation['max_score']}")
    return api_response(
        success=True,
        message="Quiz graded successfully.",
        data=evaluation
    )
