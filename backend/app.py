import os
import sys
import pathlib

# ── Path bootstrap ─────────────────────────────────────────────────────────
# Makes `python app.py` (run from inside backend/) work the same as
# `python -m backend.app` (run from the project root).
_project_root = pathlib.Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
# ──────────────────────────────────────────────────────────────────────────

import logging
from flask import Flask
from flask_cors import CORS

from backend.config import Config
from backend.utils.logger import setup_logger
from backend.middleware.logger_middleware import init_logger_middleware
from backend.middleware.error_handlers import init_error_handlers
from backend.services.worker_service import WorkerService

# 1. Setup structured logging
setup_logger()
# Set config logger to DEBUG so config.debug messages print
logging.getLogger("config").setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)

_startup_done = False

def run_startup_sequence():
    config_logger = logging.getLogger("config")
    app_logger = logging.getLogger("studyai.app")

    # 1. Directory validation
    base_dir = Config.BASE_DIR
    dirs_to_check = [
        Config.LOCAL_DB_DIR,
        base_dir / "logs",
        base_dir / "uploads" / "profile_photos",
    ]
    # Ensure uploads exists first
    (base_dir / "uploads").mkdir(parents=True, exist_ok=True)
    
    # Log each directory checked
    for directory in dirs_to_check:
        directory.mkdir(parents=True, exist_ok=True)
        config_logger.info(f"Checked directory: {directory.absolute()}")

    # 2. CORS log
    app_logger.info("CORS enabled for all origins")

def create_app():
    """
    Application factory pattern.
    """
    global _startup_done
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Run the startup logging sequence once during factory setup
    if not _startup_done:
        run_startup_sequence()
        Config.validate()
        # Initialize database (triggers Firebase/storage setup and logs)
        from backend.repositories.db_repository import UserRepository
        # Initialize Groq client and log
        from backend.services.ai_service import AIService
        AIService.initialize()
    else:
        # Just ensure imports are loaded for database
        from backend.repositories.db_repository import UserRepository
    
    # Initialize background worker pool
    WorkerService.initialize()

    # Enable CORS (allow credentials and custom headers like X-Request-ID)
    CORS(
        app, 
        resources={r"/api/*": {"origins": "*"}}, 
        supports_credentials=True,
        expose_headers=["X-Request-ID"]
    )

    # Initialize Request Log & ID Tracing Middleware
    init_logger_middleware(app)

    # Register blueprints
    from backend.routes.auth_routes import auth_bp
    from backend.routes.material_routes import material_bp
    from backend.routes.summary_routes import summary_bp
    from backend.routes.flashcard_routes import flashcard_bp
    from backend.routes.quiz_routes import quiz_bp
    from backend.routes.study_plan_routes import study_plan_bp
    from backend.routes.analytics_routes import analytics_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(material_bp, url_prefix="/api/materials")
    app.register_blueprint(summary_bp, url_prefix="/api/summaries")
    app.register_blueprint(flashcard_bp, url_prefix="/api/flashcards")
    app.register_blueprint(quiz_bp, url_prefix="/api/quizzes")
    app.register_blueprint(study_plan_bp, url_prefix="/api/study-plan")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

    # Initialize global exception handlers
    init_error_handlers(app)

    if not _startup_done:
        app_logger = logging.getLogger("studyai.app")
        app_logger.info("Blueprints registered successfully")
        app_logger.info("StudyAI Backend ready")
        
    _startup_done = True
    return app

# Expose app for gunicorn/production server execution
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = Config.FLASK_ENV == "development"
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=False)
