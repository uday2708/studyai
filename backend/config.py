import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# ==========================================================
# Base Directory
# ==========================================================
BASE_DIR = Path(__file__).resolve().parent

# ==========================================================
# Load Environment File
# ==========================================================
flask_env = os.environ.get("FLASK_ENV", "development").lower()

if flask_env == "production":
    env_file = BASE_DIR / ".env.production"
else:
    env_file = BASE_DIR / ".env.development"

if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv(dotenv_path=BASE_DIR / ".env")


# ==========================================================
# Configuration Class
# ==========================================================
class Config:

    # ------------------------------------------------------
    # Basic Configuration
    # ------------------------------------------------------
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "dev_secret_jwt_key_study_ai_2026"
    )

    PORT = int(os.environ.get("PORT", 5000))

    # ------------------------------------------------------
    # Groq AI
    # ------------------------------------------------------
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

    # ------------------------------------------------------
    # Firebase
    # ------------------------------------------------------
    FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL = os.environ.get("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY = os.environ.get("FIREBASE_PRIVATE_KEY", "")
    FIREBASE_CREDENTIALS_JSON = os.environ.get(
        "FIREBASE_CREDENTIALS_JSON",
        ""
    )

    # ------------------------------------------------------
    # Local Storage
    # ------------------------------------------------------
    _local_db_raw = os.environ.get("LOCAL_DB_DIR", "storage")

    if _local_db_raw == "local_db":
        LOCAL_DB_DIR = BASE_DIR / "storage"
    else:
        LOCAL_DB_DIR = Path(_local_db_raw)

        if not LOCAL_DB_DIR.is_absolute():
            LOCAL_DB_DIR = BASE_DIR / LOCAL_DB_DIR

    UPLOAD_FOLDER = Path(
        os.environ.get("UPLOAD_FOLDER", "uploads")
    )

    if not UPLOAD_FOLDER.is_absolute():
        UPLOAD_FOLDER = BASE_DIR / UPLOAD_FOLDER

    ENV_FILE_PATH = env_file if env_file.exists() else BASE_DIR / ".env"
    BASE_DIR = BASE_DIR

    JWT_ACCESS_TOKEN_EXPIRES = int(
        os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 3600)
    )

    JWT_REFRESH_TOKEN_EXPIRES = int(
        os.environ.get("JWT_REFRESH_TOKEN_EXPIRES", 2592000)
    )

    # ======================================================
    # Validate Configuration
    # ======================================================
    @classmethod
    def validate(cls):

        logger = logging.getLogger("config")

        logger.debug(f".env loaded from: {cls.ENV_FILE_PATH}")
        logger.debug(f"Current working directory: {os.getcwd()}")

        # -------------------------------
        # Firebase
        # -------------------------------
        logger.debug(
            f"FIREBASE_PROJECT_ID set: {bool(cls.FIREBASE_PROJECT_ID)}"
        )

        logger.debug(
            f"FIREBASE_CLIENT_EMAIL set: {bool(cls.FIREBASE_CLIENT_EMAIL)}"
        )

        logger.debug(
            f"FIREBASE_PRIVATE_KEY set: {bool(cls.FIREBASE_PRIVATE_KEY)}"
        )

        if cls.FIREBASE_PRIVATE_KEY:
            logger.debug(
                f"FIREBASE_PRIVATE_KEY length: {len(cls.FIREBASE_PRIVATE_KEY)}"
            )

        # -------------------------------
        # Groq
        # -------------------------------
        logger.debug(
            f"GROQ_API_KEY set: {bool(cls.GROQ_API_KEY)}"
        )

        if cls.GROQ_API_KEY:
            logger.debug(
                f"GROQ_API_KEY length: {len(cls.GROQ_API_KEY)}"
            )

        # -------------------------------
        # Validation
        # -------------------------------
        if not cls.SECRET_KEY:
            logger.warning(
                "SECRET_KEY is missing."
            )

        if not cls.GROQ_API_KEY:
            logger.warning(
                "GROQ_API_KEY is missing. AI generation features will fail."
            )
        elif len(cls.GROQ_API_KEY.strip()) < 40:
            logger.warning(
                "GROQ_API_KEY appears to be invalid or incomplete."
            )

        if not (
            cls.FIREBASE_PROJECT_ID
            and cls.FIREBASE_CLIENT_EMAIL
            and cls.FIREBASE_PRIVATE_KEY
        ):
            logger.warning(
                "Firebase credentials are incomplete. Firestore will not initialize."
            )