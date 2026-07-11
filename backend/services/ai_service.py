import json
import re
import logging
from groq import Groq
from backend.config import Config
from backend.utils.errors import AppError

logger = logging.getLogger(__name__)

class AIService:
    """
    Service layer interacting with the Groq API using the Llama 3.3 70B Versatile model.
    """
    
    MODEL_NAME = "llama-3.3-70b-versatile"
    _client = None

    @classmethod
    def initialize(cls):
        """Initialize the Groq client once during startup."""
        groq_logger = logging.getLogger("services.groq_service")
        try:
            if Config.GROQ_API_KEY and not Config.GROQ_API_KEY.startswith("gsk_your_groq_api_key"):
                cls._client = Groq(api_key=Config.GROQ_API_KEY)
            groq_logger.info(f"✅ Groq client initialised — model: {cls.MODEL_NAME}")
        except Exception as e:
            groq_logger.error(f"Failed to initialize Groq client: {e}")

    @classmethod
    def _get_client(cls):
        """Lazy initialization of Groq Client."""
        if cls._client is not None:
            return cls._client
        if not Config.GROQ_API_KEY:
            raise AppError("Groq API Key is not configured. Please add it to your environment variables.", 500)
        try:
            cls._client = Groq(api_key=Config.GROQ_API_KEY)
            return cls._client
        except Exception as e:
            logging.getLogger("services.groq_service").error(f"Error creating Groq client: {e}")
            raise AppError("Could not initialize AI Service.", 500)

    @classmethod
    def _parse_json_response(cls, raw_text):
        """
        Safely extract JSON from Groq's response, handling standard markdown blocks.
        """
        raw_text = raw_text.strip()
        # Find markdown code fences if present
        match = re.search(r"```json\s*(.*?)\s*```", raw_text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            match_simple = re.search(r"```\s*(.*?)\s*```", raw_text, re.DOTALL)
            if match_simple:
                json_str = match_simple.group(1)
            else:
                json_str = raw_text
                
        try:
            return json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON content: {raw_text}. Error: {e}")
            # Try finding array or object matches using simple brackets if parsing fails
            try:
                bracket_match = re.search(r"(\[.*\]|\{.*\})", json_str, re.DOTALL)
                if bracket_match:
                    return json.loads(bracket_match.group(1).strip())
            except Exception as inner_ex:
                logger.error(f"Inner bracket regex extraction failed: {inner_ex}")
            raise AppError("AI generated response did not return valid JSON format.", 502)

    @classmethod
    def generate_summary(cls, content_text: str) -> str:
        """
        Generate markdown summaries of study materials.
        """
        if not Config.GROQ_API_KEY or Config.GROQ_API_KEY.startswith("gsk_your_groq_api_key"):
            return (
                f"# Topic Overview\n"
                f"This is a structured summary of the material. The text discusses topics related to your studies.\n\n"
                f"## Key Concepts\n"
                f"- **Main Focus**: Understanding core elements of the text.\n"
                f"- **Key Process**: Sequential execution and analytical review.\n\n"
                f"## Important Definitions\n"
                f"- **Study material content**: The raw input file containing user lectures or topics.\n"
                f"- **Analytics**: Data-driven tracking of user progress.\n\n"
                f"## Core Principles\n"
                f"1. Continuous feedback leads to retention.\n"
                f"2. Testing through flashcards and quizzes resolves weak topics.\n\n"
                f"## Revision Notes\n"
                f"- Reviewed snippet: {content_text[:100]}...\n"
                f"- Always revise weak topics highlighted in analytics."
            )
        client = cls._get_client()
        prompt = (
            "Analyze the following study material text. Generate a comprehensive, beautiful, structured "
            "summary in Markdown format. The summary MUST include the following sections:\n"
            "1. # Topic Overview (General context and introduction)\n"
            "2. ## Key Concepts (Main points of focus)\n"
            "3. ## Important Definitions (Glossary of critical terms)\n"
            "4. ## Core Principles (Underlying rules, formulas, or mechanics)\n"
            "5. ## Revision Notes (Bullet list of quick summary takeaways)\n\n"
            "Study Material Content:\n"
            f"{content_text[:12000]}" # Truncate to stay safely within context limits
        )

        try:
            response = client.chat.completions.create(
                model=cls.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a world-class academic summarizer and study assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq generate_summary error: {e}")
            raise AppError(f"AI Service failed to generate summary: {e}", 502)

    @classmethod
    def generate_flashcards(cls, content_text: str) -> list:
        """
        Generate flashcards from text. Returns list of flashcard dicts.
        """
        if not Config.GROQ_API_KEY or Config.GROQ_API_KEY.startswith("gsk_your_groq_api_key"):
            snippet = content_text[:60]
            return [
                {
                    "question": f"What is the main focus of the study material?",
                    "answer": f"The material explains concepts including: {snippet}...",
                    "difficulty": "Easy",
                    "topic": "Overview"
                },
                {
                    "question": "Why is active recall important?",
                    "answer": "Active recall stimulates memory and helps build stronger neural connections.",
                    "difficulty": "Medium",
                    "topic": "Learning Science"
                },
                {
                    "question": "What is the spacing effect?",
                    "answer": "Learning is greater when studying is spread out over time, as opposed to studying in a single session.",
                    "difficulty": "Hard",
                    "topic": "Learning Science"
                }
            ]
        client = cls._get_client()
        prompt = (
            "Analyze the following study material and generate a list of flashcards. "
            "Each flashcard must contain a question, a clear answers, a difficulty rating (Easy, Medium, Hard), and a topic tag.\n\n"
            "You MUST return the output as a valid JSON array of objects. Do NOT return any explanation, introduction, or text outside the JSON.\n"
            "Output JSON format:\n"
            "[\n"
            "  {\n"
            "    \"question\": \"Question string\",\n"
            "    \"answer\": \"Detailed answer string\",\n"
            "    \"difficulty\": \"Easy\" | \"Medium\" | \"Hard\",\n"
            "    \"topic\": \"Sub-topic name\"\n"
            "  }\n"
            "]\n\n"
            "Study Material Content:\n"
            f"{content_text[:12000]}"
        )

        try:
            response = client.chat.completions.create(
                model=cls.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a study card generator. You output ONLY valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4
            )
            raw_text = response.choices[0].message.content
            return cls._parse_json_response(raw_text)
        except Exception as e:
            logger.error(f"Groq generate_flashcards error: {e}")
            raise AppError(f"AI Service failed to generate flashcards: {e}", 502)

    @classmethod
    def generate_quiz(cls, content_text: str, quiz_type: str, count: int) -> list:
        """
        Generate questions from text. quiz_type can be: mcq, tf, short, mixed.
        Returns list of question dicts.
        """
        if not Config.GROQ_API_KEY or Config.GROQ_API_KEY.startswith("gsk_your_groq_api_key"):
            questions = []
            for i in range(1, count + 1):
                if quiz_type == "tf" or (quiz_type == "mixed" and i % 3 == 1):
                    questions.append({
                        "id": f"mock_tf_{i}",
                        "type": "tf",
                        "question": f"Is the following statement true or false: Active revision improves test performance?",
                        "options": ["True", "False"],
                        "correct_answer": "True",
                        "explanation": "Active revision is scientifically proven to improve scores.",
                        "topic": "Study Methods"
                    })
                elif quiz_type == "short" or (quiz_type == "mixed" and i % 3 == 2):
                    questions.append({
                        "id": f"mock_short_{i}",
                        "type": "short",
                        "question": f"State the primary benefit of testing yourself regularly.",
                        "options": [],
                        "correct_answer": "active recall",
                        "explanation": "Self-testing triggers active recall, enhancing cognitive retention.",
                        "topic": "Study Methods"
                    })
                else:
                    questions.append({
                        "id": f"mock_mcq_{i}",
                        "type": "mcq",
                        "question": f"Which of the following is most effective for long-term retention?",
                        "options": [
                            "Passive reading",
                            "Highlighting text",
                            "Spaced repetition",
                            "Cramming overnight"
                        ],
                        "correct_answer": "Spaced repetition",
                        "explanation": "Spaced repetition spaces out learning sessions for durable retention.",
                        "topic": "Study Methods"
                    })
            return questions[:count]
        client = cls._get_client()
        
        type_inst = ""
        if quiz_type == "mcq":
            type_inst = "Generate ONLY Multiple Choice Questions (MCQ) with 4 options."
        elif quiz_type == "tf":
            type_inst = "Generate ONLY True/False questions."
        elif quiz_type == "short":
            type_inst = "Generate ONLY Short Answer questions (where users answer in a sentence/phrase)."
        else:
            type_inst = "Generate a mix of Multiple Choice (MCQ), True/False (tf), and Short Answer (short) questions."

        prompt = (
            f"Analyze the following study material and generate a quiz of {count} questions. {type_inst}\n\n"
            "You MUST return the output as a valid JSON array of objects. Do NOT return any preamble, conversational text, or explanation outside the JSON.\n"
            "Output JSON format:\n"
            "[\n"
            "  {\n"
            "    \"id\": \"unique_string_id_1\",\n"
            "    \"type\": \"mcq\" | \"tf\" | \"short\",\n"
            "    \"question\": \"The question text\",\n"
            "    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], // Only present/non-empty for 'mcq', else empty list [] or null\n"
            "    \"correct_answer\": \"The exact correct option string (for mcq) or 'True'/'False' (for tf) or key keywords/phrases required (for short)\",\n"
            "    \"explanation\": \"Detailed explanation of why this answer is correct and others are incorrect.\",\n"
            "    \"topic\": \"Sub-topic name\"\n"
            "  }\n"
            "]\n\n"
            "Study Material Content:\n"
            f"{content_text[:12000]}"
        )

        try:
            response = client.chat.completions.create(
                model=cls.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a quiz questions builder. You output ONLY valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4
            )
            raw_text = response.choices[0].message.content
            return cls._parse_json_response(raw_text)
        except Exception as e:
            logger.error(f"Groq generate_quiz error: {e}")
            raise AppError(f"AI Service failed to generate quiz questions: {e}", 502)

    @classmethod
    def evaluate_quiz_submission(cls, quiz_questions: list, user_answers: dict) -> dict:
        """
        Grades short answers via AI (while MCQs and T/F are graded deterministically in the code).
        Identifies weak topics and generates custom explanations.
        
        Returns: {
            "score": float,
            "max_score": int,
            "results": [
                {
                    "question_id": str,
                    "correct": bool,
                    "explanation": str,
                    "suggested_answer": str
                }
            ],
            "weak_topics": [str],
            "recommendations": [str]
        }
        """
        # Let's perform deterministic grading for MCQ/TF, and call AI to evaluate Short Answers 
        # and summarize weak topics / recommendations.
        # However, calling AI to do the entire assessment yields richer educational context, 
        # as it can analyze *why* the student got things wrong and pinpoint precise weak topics.
        
        if not Config.GROQ_API_KEY or Config.GROQ_API_KEY.startswith("gsk_your_groq_api_key"):
            return cls._fallback_evaluate(quiz_questions, user_answers)

        client = cls._get_client()
        
        # Prepare evaluation payload
        eval_payload = {
            "questions": [
                {
                    "id": q["id"],
                    "type": q["type"],
                    "question": q["question"],
                    "options": q.get("options"),
                    "correct_answer": q["correct_answer"],
                    "explanation": q["explanation"],
                    "topic": q.get("topic", "General")
                }
                for q in quiz_questions
            ],
            "user_answers": user_answers
        }

        prompt = (
            "You are a grading system. Evaluate the following quiz questions against the user's answers. "
            "Grade MCQs and True/False questions strictly (MCQs must match correct option, T/F must match True/False). "
            "For short answers, check semantic match (if it demonstrates the correct understanding, mark it correct; "
            "otherwise incorrect, or partially correct). Calculate a final score.\n"
            "Highlight weak topics and recommendations for improvement.\n\n"
            "Return the response in JSON format. Do not return any other text.\n"
            "Output JSON format:\n"
            "{\n"
            "  \"score\": 3.5, // Total score (can have decimals for partial credit on short answers)\n"
            "  \"max_score\": 5, // Total count of questions\n"
            "  \"results\": [\n"
            "     {\n"
            "       \"question_id\": \"unique_id\",\n"
            "       \"correct\": true | false,\n"
            "       \"score_awarded\": 1.0,\n"
            "       \"user_answer\": \"user's raw input\",\n"
            "       \"correct_answer\": \"actual correct answer\",\n"
            "       \"feedback\": \"Feedback specific to user's answer and explanation.\"\n"
            "     }\n"
            "  ],\n"
            "  \"weak_topics\": [\"List of topics user scored poorly on\"],\n"
            "  \"recommendations\": [\"Actionable study advice matching their weaknesses\"]\n"
            "}\n\n"
            f"Payload: {json.dumps(eval_payload)}"
        )

        try:
            response = client.chat.completions.create(
                model=cls.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a quiz grader. You output ONLY valid JSON objects."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            raw_text = response.choices[0].message.content
            return cls._parse_json_response(raw_text)
        except Exception as e:
            logger.error(f"Groq evaluate_quiz_submission error: {e}")
            # Fallback local grader if Groq fails
            return cls._fallback_evaluate(quiz_questions, user_answers)

    @classmethod
    def generate_study_plan(cls, duration_days: int, goals: str, material_texts: list, weak_topics: list) -> str:
        """
        Generate a comprehensive, personalized study plan in Markdown.
        """
        if not Config.GROQ_API_KEY or Config.GROQ_API_KEY.startswith("gsk_your_groq_api_key"):
            return (
                f"# Study Plan Overview ({duration_days}-Day Schedule)\n"
                f"Personalized study plan tailored to your goals: **{goals}**.\n\n"
                f"## Learning Goals & Milestones\n"
                f"- Days 1-{duration_days // 2}: Foundations and deep dive into materials.\n"
                f"- Days {duration_days // 2 + 1}-{duration_days}: Practice quizzes, weak topic resolution, and reinforcement.\n\n"
                f"## Structured Daily/Weekly Schedule\n"
                f"- **Days 1-2**: Review concepts and definitions in study materials.\n"
                f"- **Days 3-4**: Generate flashcards and practice active recall.\n"
                f"- **Day 5**: Complete quiz and identify weak topics: {', '.join(weak_topics) if weak_topics else 'none'}.\n\n"
                f"## Targeted Strategies for Weak Topics\n"
                f"- For weak areas, review corresponding summary sections and do focused flashcard revision.\n\n"
                f"## Recommended Practice Exercises\n"
                f"- Retake generated quizzes until scoring above 80%.\n\n"
                f"## Review & Feedback milestones\n"
                f"- Re-evaluate analytics progress on the Dashboard."
            )
        client = cls._get_client()
        
        materials_summary = ""
        for i, text in enumerate(material_texts):
            materials_summary += f"Material {i+1} snippet:\n{text[:2000]}\n\n"

        prompt = (
            f"Create a highly structured, personalized study plan for a duration of {duration_days} days.\n"
            f"Learning Goals: {goals}\n"
            f"Known Weak Topics to Address: {', '.join(weak_topics) if weak_topics else 'None specified'}\n\n"
            "Based on the following source materials:\n"
            f"{materials_summary}\n"
            "The study plan MUST be returned in Markdown and include:\n"
            f"1. # Study Plan Overview ({duration_days}-Day Schedule)\n"
            "2. ## Learning Goals & Milestones\n"
            "3. ## Structured Daily/Weekly Schedule (Use bullet points, bold text for days, clear tasks)\n"
            "4. ## Targeted Strategies for Weak Topics (Providing steps to master weak topics)\n"
            "5. ## Recommended Practice Exercises (Ideas for testing knowledge)\n"
            "6. ## Review & Feedback milestones"
        )

        try:
            response = client.chat.completions.create(
                model=cls.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a professional academic coach and study planner."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq generate_study_plan error: {e}")
            raise AppError(f"AI Service failed to generate study plan: {e}", 502)

    @classmethod
    def _fallback_evaluate(cls, questions, user_answers):
        """
        Fallback grading in case Groq API is offline. Direct string matching.
        """
        logger.warning("Using fallback quiz evaluator due to Groq failure.")
        score = 0.0
        results = []
        weak_topics = set()
        
        for q in questions:
            q_id = q["id"]
            user_ans = user_answers.get(str(q_id), "").strip().lower()
            correct_ans = q["correct_answer"].strip().lower()
            topic = q.get("topic", "General")
            
            is_correct = False
            if q["type"] == "mcq" or q["type"] == "tf":
                is_correct = (user_ans == correct_ans)
            else:
                # For short answers, check if correct answer keywords exist inside user answer
                is_correct = (correct_ans in user_ans) or (user_ans in correct_ans and len(user_ans) > 2)
                
            score_awarded = 1.0 if is_correct else 0.0
            score += score_awarded
            
            if not is_correct:
                weak_topics.add(topic)
                
            results.append({
                "question_id": q_id,
                "correct": is_correct,
                "score_awarded": score_awarded,
                "user_answer": user_answers.get(str(q_id), ""),
                "correct_answer": q["correct_answer"],
                "feedback": q.get("explanation", "Review correct answer.")
            })
            
        return {
            "score": score,
            "max_score": len(questions),
            "results": results,
            "weak_topics": list(weak_topics),
            "recommendations": [f"Focus on revision in {t} as scores were low." for t in weak_topics]
        }
