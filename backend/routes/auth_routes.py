import logging
from flask import Blueprint
import jwt
from backend.repositories.db_repository import UserRepository
from backend.schemas.validation_schemas import validate_payload, UserRegisterSchema, UserLoginSchema, RefreshTokenSchema
from backend.middleware.auth_middleware import generate_tokens, verify_token, token_required
from backend.utils.auth_helper import hash_password, verify_password
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
@validate_payload(UserRegisterSchema)
def register(payload: UserRegisterSchema):
    """
    Handle user registration.
    """
    logger.info(f"Attempting registration for email: {payload.email}")
    
    # 1. Check if user already exists
    if UserRepository.get_by_email(payload.email):
        return api_response(
            success=False,
            message="User with this email already exists.",
            status_code=400
        )
        
    if UserRepository.get_by_username(payload.username):
        return api_response(
            success=False,
            message="User with this username already exists.",
            status_code=400
        )
        
    # 2. Hash password and save user
    hashed = hash_password(payload.password)
    user_id = UserRepository.create({
        "email": payload.email,
        "username": payload.username,
        "password_hash": hashed
    })
    
    # 3. Generate tokens
    access_token, refresh_token = generate_tokens(user_id)
    
    logger.info(f"User {user_id} registered successfully.")
    
    return api_response(
        success=True,
        message="User registered successfully.",
        data={
            "user": {
                "id": user_id,
                "email": payload.email.lower(),
                "username": payload.username.lower()
            },
            "access_token": access_token,
            "refresh_token": refresh_token
        },
        status_code=201
    )

@auth_bp.route("/login", methods=["POST"])
@validate_payload(UserLoginSchema)
def login(payload: UserLoginSchema):
    """
    Handle user login.
    """
    logger.info(f"Login attempt for email: {payload.email}")
    
    # 1. Fetch user by email
    user = UserRepository.get_by_email(payload.email)
    if not user:
        return api_response(
            success=False,
            message="Invalid email or password.",
            status_code=401
        )
        
    # 2. Verify password
    if not verify_password(payload.password, user["password_hash"]):
        return api_response(
            success=False,
            message="Invalid email or password.",
            status_code=401
        )
        
    # 3. Generate tokens
    access_token, refresh_token = generate_tokens(user["id"])
    
    logger.info(f"User {user['id']} logged in successfully.")
    
    return api_response(
        success=True,
        message="Login successful.",
        data={
            "user": {
                "id": user["id"],
                "email": user["email"],
                "username": user["username"]
            },
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    )

@auth_bp.route("/refresh", methods=["POST"])
@validate_payload(RefreshTokenSchema)
def refresh(payload: RefreshTokenSchema):
    """
    Refresh access and refresh tokens.
    """
    try:
        # Decode and verify refresh token
        decoded = verify_token(payload.refresh_token, expected_type="refresh")
        user_id = decoded["user_id"]
        
        # Check if user exists
        user = UserRepository.get_by_id(user_id)
        if not user:
            return api_response(
                success=False,
                message="User does not exist.",
                status_code=401
            )
            
        # Generate new pair of tokens
        access_token, refresh_token = generate_tokens(user_id)
        
        logger.info(f"Tokens refreshed for user {user_id}.")
        return api_response(
            success=True,
            message="Tokens refreshed successfully.",
            data={
                "access_token": access_token,
                "refresh_token": refresh_token
            }
        )
    except jwt.ExpiredSignatureError:
        return api_response(
            success=False,
            message="Refresh token has expired. Please login again.",
            status_code=401
        )
    except jwt.InvalidTokenError:
        return api_response(
            success=False,
            message="Invalid refresh token.",
            status_code=401
        )

@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout(current_user_id):
    """
    Handle user logout (stateless JWT invalidation is handled by client dropping token,
    but this endpoint validates they are currently logged in).
    """
    logger.info(f"User {current_user_id} logged out.")
    return api_response(
        success=True,
        message="Logout successful."
    )
