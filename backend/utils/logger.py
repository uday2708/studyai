import os
import logging
import uuid
from flask import has_request_context, g, request

class RequestIdFilter(logging.Filter):
    """
    Python logging filter that injects the current request's ID into the log record.
    """
    def filter(self, record):
        if has_request_context():
            # Retrieve request_id from g if it exists, otherwise generate or read from header
            if not hasattr(g, "request_id"):
                req_id = request.headers.get("X-Request-ID")
                if not req_id:
                    req_id = str(uuid.uuid4())
                g.request_id = req_id
            record.request_id = g.request_id
        else:
            record.request_id = "N/A"
        return True

class CustomFormatter(logging.Formatter):
    """
    Formatter that handles both standard logger and request tracing context logging.
    """
    def __init__(self):
        super().__init__(datefmt="%Y-%m-%d %H:%M:%S")

    def format(self, record):
        request_id = getattr(record, "request_id", "N/A")
        if request_id != "N/A":
            # For request cycles, keep standard bracket formats
            self._style._fmt = "[%(asctime)s] [%(levelname)s] [ReqID: %(request_id)s] %(name)s: %(message)s"
        else:
            # Match the target startup log layout
            self._style._fmt = "[%(asctime)s] %(levelname)s %(name)s — %(message)s"
        return super().format(record)

def setup_logger():
    """
    Configure the root logger with request tracing format and target logs layout.
    """
    # Create the filter
    req_id_filter = RequestIdFilter()
    
    # Formatter configuration
    formatter = CustomFormatter()
    
    # Standard output stream handler
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.addFilter(req_id_filter)
    
    # Root logger settings
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear existing handlers to avoid double logging
    if root_logger.handlers:
        root_logger.handlers.clear()
        
    root_logger.addHandler(stream_handler)
    
    # Set third-party logs level to warning to avoid cluttering logs
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
