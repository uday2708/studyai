from functools import wraps
from typing import List, Dict, Optional
from flask import request
from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator

# ----------------- Decorator for Flask -----------------

def validate_payload(schema_class):
    """
    Decorator to validate JSON request bodies using Pydantic.
    Automatically parses the request JSON, runs validation, and passes
    the validated model instance into the decorated function as 'payload'.
    If validation fails, Pydantic's ValidationError will be raised and
    handled by the global error handlers.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            json_data = request.get_json(silent=True) or {}
            # Instantiate schema_class with the request JSON data.
            # This raises pydantic.ValidationError if invalid.
            validated_model = schema_class(**json_data)
            return f(*args, payload=validated_model, **kwargs)
        return decorated_function
    return decorator


# ----------------- Auth Schemas -----------------

class UserRegisterSchema(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6, max_length=100)


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenSchema(BaseModel):
    refresh_token: str


# ----------------- Material Schemas -----------------

class UploadTextSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=10, max_length=50000)


class GenerateSummarySchema(BaseModel):
    material_id: str


# ----------------- Flashcard Schemas -----------------

class GenerateFlashcardsSchema(BaseModel):
    material_id: str


class MarkCardKnownSchema(BaseModel):
    card_index: int = Field(..., ge=0)
    known: bool


# ----------------- Quiz Schemas -----------------

class GenerateQuizSchema(BaseModel):
    material_id: str
    quiz_type: str = Field(default="mixed")  # "mcq", "tf", "short", "mixed"
    count: int = Field(default=5, ge=3, le=20)


class SubmitQuizSchema(BaseModel):
    answers: Dict[str, str]  # Key: question index or ID, Value: user's answer


# ----------------- Study Plan Schemas -----------------

class GenerateStudyPlanSchema(BaseModel):
    duration_days: int = Field(..., ge=7, le=30)
    goals: str = Field(..., min_length=5, max_length=500)
    weak_topics: Optional[List[str]] = Field(default_factory=list)
