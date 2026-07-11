import logging
from flask import current_app
from werkzeug.exceptions import HTTPException
from pydantic import ValidationError
from backend.utils.errors import AppError
from backend.utils.response import api_response

logger = logging.getLogger(__name__)

def init_error_handlers(app):
    """
    Register application error handlers for Flask app.
    """
    @app.errorhandler(AppError)
    def handle_app_error(error):
        logger.warning(f"Application error: {error.message} | Code: {error.status_code}")
        return api_response(
            success=False,
            message=error.message,
            errors=error.errors,
            status_code=error.status_code
        )

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        logger.warning("Payload validation failed.")
        # Parse Pydantic validation errors into standard list of messages
        errors_list = []
        for err in error.errors():
            loc = " -> ".join(str(l) for l in err["loc"])
            errors_list.append({
                "field": loc,
                "type": err["type"],
                "message": err["msg"]
            })
            
        return api_response(
            success=False,
            message="Request validation failed.",
            errors=errors_list,
            status_code=400
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        logger.warning(f"HTTPException: {error.name} ({error.code}) | Description: {error.description}")
        return api_response(
            success=False,
            message=error.description or error.name,
            status_code=error.code
        )

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        logger.exception("An unhandled exception occurred in the application.")
        
        # Don't leak raw database/system traceback details in production
        is_dev = app.config.get("ENV") == "development" or app.debug
        message = str(error) if is_dev else "Internal server error. Please try again later."
        
        return api_response(
            success=False,
            message=message,
            status_code=500
        )
