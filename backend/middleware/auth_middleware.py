import logging
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request
import jwt
from backend.config import Config
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

def generate_tokens(user_id: str) -> tuple:
    """
    Generate an access token and a refresh token for the given user ID.
    Returns: (access_token, refresh_token)
    """
    now = datetime.now(timezone.utc)
    
    # Access token payload
    access_payload = {
        "user_id": user_id,
        "exp": now + timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES),
        "type": "access"
    }
    access_token = jwt.encode(access_payload, Config.SECRET_KEY, algorithm="HS256")
    
    # Refresh token payload
    refresh_payload = {
        "user_id": user_id,
        "exp": now + timedelta(seconds=Config.JWT_REFRESH_TOKEN_EXPIRES),
        "type": "refresh"
    }
    refresh_token = jwt.encode(refresh_payload, Config.SECRET_KEY, algorithm="HS256")
    
    return access_token, refresh_token

def verify_token(token: str, expected_type: str = "access") -> dict:
    """
    Decode and verify a JWT token.
    Raises jwt exceptions if invalid or expired.
    """
    payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Invalid token type: expected {expected_type}")
    return payload

def token_required(f):
    """
    Decorator to protect routes. Decodes authorization headers
    and extracts user_id, passing it as 'current_user_id'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return api_response(
                success=False,
                message="Authorization header is missing.",
                status_code=401
            )
            
        try:
            # Format should be: Bearer <token>
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != "bearer":
                return api_response(
                    success=False,
                    message="Invalid token format. Use 'Bearer <token>'.",
                    status_code=401
                )
                
            token = parts[1]
            payload = verify_token(token, expected_type="access")
            current_user_id = payload["user_id"]
            
        except jwt.ExpiredSignatureError:
            return api_response(
                success=False,
                message="Access token has expired.",
                status_code=401
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Failed JWT decode: {e}")
            return api_response(
                success=False,
                message="Invalid authorization token.",
                status_code=401
            )
            
        return f(current_user_id=current_user_id, *args, **kwargs)
        
    return decorated
