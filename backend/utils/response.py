from datetime import datetime, timezone
from flask import jsonify

def api_response(success, message, data=None, errors=None, status_code=200):
    """
    Generate a standardized JSON API response envelope.
    """
    response_payload = {
        "success": success,
        "message": message,
        "data": data,
        "errors": errors,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    return jsonify(response_payload), status_code
