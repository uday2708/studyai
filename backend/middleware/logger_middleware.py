import time
import uuid
import logging
from flask import request, g

logger = logging.getLogger(__name__)

def init_logger_middleware(app):
    """
    Register request lifecycle hooks for logging and tracing.
    """
    @app.before_request
    def before_request():
        # Track starting time
        g.start_time = time.time()
        
        # Read or generate request ID
        req_id = request.headers.get("X-Request-ID")
        if not req_id:
            req_id = str(uuid.uuid4())
        g.request_id = req_id
        
        # Log request receipt
        logger.info(
            f"Incoming request: {request.method} {request.path} | "
            f"IP: {request.remote_addr} | Agent: {request.headers.get('User-Agent')}"
        )

    @app.after_request
    def after_request(response):
        # Calculate duration
        duration = 0.0
        if hasattr(g, "start_time"):
            duration = time.time() - g.start_time
            
        logger.info(
            f"Completed request: {request.method} {request.path} | "
            f"Status: {response.status_code} | Time: {duration:.4f}s"
        )
        
        # Inject request ID into response header
        if hasattr(g, "request_id"):
            response.headers["X-Request-ID"] = g.request_id
            
        return response
