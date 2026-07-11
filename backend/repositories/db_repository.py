import logging
from datetime import datetime, timezone
from backend.repositories.db_adapter import DBAdapter

logger = logging.getLogger(__name__)

# Single instance adapter
db = DBAdapter()

class UserRepository:
    @staticmethod
    def get_by_id(user_id):
        return db.get_doc("users", user_id)

    @staticmethod
    def get_by_email(email):
        res = db.query_docs("users", [("email", "==", email.lower())])
        return res[0] if res else None

    @staticmethod
    def get_by_username(username):
        res = db.query_docs("users", [("username", "==", username.lower())])
        return res[0] if res else None

    @staticmethod
    def create(user_data):
        # Normalize email/username to lowercase
        if "email" in user_data:
            user_data["email"] = user_data["email"].lower()
        if "username" in user_data:
            user_data["username"] = user_data["username"].lower()
            
        user_data["created_at"] = user_data.get("created_at", datetime.now(timezone.utc).isoformat())
        return db.add_doc("users", user_data)


class MaterialRepository:
    @staticmethod
    def create(material_data):
        material_data["created_at"] = datetime.now(timezone.utc).isoformat()
        material_data["status"] = material_data.get("status", "pending")
        material_data["progress"] = material_data.get("progress", 0)
        return db.add_doc("materials", material_data)

    @staticmethod
    def get_by_id(material_id):
        return db.get_doc("materials", material_id)

    @staticmethod
    def get_by_user(user_id):
        return db.query_docs("materials", [("user_id", "==", user_id)])

    @staticmethod
    def update(material_id, data):
        return db.set_doc("materials", material_id, data)

    @staticmethod
    def delete(material_id):
        return db.delete_doc("materials", material_id)


class SummaryRepository:
    @staticmethod
    def create_or_update(summary_data):
        summary_data["created_at"] = datetime.now(timezone.utc).isoformat()
        material_id = summary_data.get("material_id")
        
        # Check if one already exists
        existing = db.query_docs("summaries", [("material_id", "==", material_id)])
        if existing:
            doc_id = existing[0]["id"]
            db.set_doc("summaries", doc_id, summary_data)
            return doc_id
        
        return db.add_doc("summaries", summary_data)

    @staticmethod
    def get_by_material(material_id):
        res = db.query_docs("summaries", [("material_id", "==", material_id)])
        return res[0] if res else None


class FlashcardRepository:
    @staticmethod
    def create_or_update_set(flashcard_data):
        flashcard_data["created_at"] = datetime.now(timezone.utc).isoformat()
        material_id = flashcard_data.get("material_id")
        
        existing = db.query_docs("flashcards", [("material_id", "==", material_id)])
        if existing:
            doc_id = existing[0]["id"]
            db.set_doc("flashcards", doc_id, flashcard_data)
            return doc_id
            
        return db.add_doc("flashcards", flashcard_data)

    @staticmethod
    def get_by_material(material_id):
        res = db.query_docs("flashcards", [("material_id", "==", material_id)])
        return res[0] if res else None

    @staticmethod
    def get_by_id(flashcard_id):
        return db.get_doc("flashcards", flashcard_id)

    @staticmethod
    def update_set(flashcard_id, data):
        return db.set_doc("flashcards", flashcard_id, data)


class QuizRepository:
    @staticmethod
    def create_or_update(quiz_data):
        quiz_data["created_at"] = datetime.now(timezone.utc).isoformat()
        material_id = quiz_data.get("material_id")
        
        # In a real app, a material can have multiple quizzes or one primary quiz. 
        # Let's support multiple quizzes by adding, but if a quiz with the same material_id exists, 
        # we can just return it or add a new one. Let's make it add new quizzes so users can generate multiple.
        # But if the user generates a quiz for a material, let's allow them to retrieve all.
        return db.add_doc("quizzes", quiz_data)

    @staticmethod
    def get_by_id(quiz_id):
        return db.get_doc("quizzes", quiz_id)

    @staticmethod
    def get_by_material(material_id):
        return db.query_docs("quizzes", [("material_id", "==", material_id)])

    @staticmethod
    def get_by_user(user_id):
        return db.query_docs("quizzes", [("user_id", "==", user_id)])

    @staticmethod
    def update(quiz_id, data):
        return db.set_doc("quizzes", quiz_id, data)


class StudyPlanRepository:
    @staticmethod
    def create_or_update(plan_data):
        plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
        user_id = plan_data.get("user_id")
        
        # Check if plan already exists for this user (only keep the latest active plan)
        existing = db.query_docs("study_plans", [("user_id", "==", user_id)])
        if existing:
            # Delete old plans or replace
            for old_plan in existing:
                db.delete_doc("study_plans", old_plan["id"])
                
        return db.add_doc("study_plans", plan_data)

    @staticmethod
    def get_by_user(user_id):
        res = db.query_docs("study_plans", [("user_id", "==", user_id)])
        return res[0] if res else None


class AnalyticsRepository:
    @staticmethod
    def get_by_user(user_id):
        res = db.query_docs("analytics", [("user_id", "==", user_id)])
        if res:
            return res[0]
            
        # If it doesn't exist, create a default empty analytics document
        default_analytics = {
            "user_id": user_id,
            "quiz_scores": [],
            "study_hours": 0.0,
            "materials_uploaded": 0,
            "flashcards_generated": 0,
            "summaries_generated": 0,
            "completion_percentage": 0.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        doc_id = db.add_doc("analytics", default_analytics)
        default_analytics["id"] = doc_id
        return default_analytics

    @staticmethod
    def create_or_update(user_id, data):
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        existing = db.query_docs("analytics", [("user_id", "==", user_id)])
        if existing:
            doc_id = existing[0]["id"]
            db.set_doc("analytics", doc_id, data)
            return doc_id
        
        data["user_id"] = user_id
        return db.add_doc("analytics", data)
