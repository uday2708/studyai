import os
import shutil
import pytest
from pathlib import Path
from backend.config import Config

TEST_DIR = Path(__file__).resolve().parent / "test_api_local_db"
Config.LOCAL_DB_DIR = TEST_DIR
Config.UPLOAD_FOLDER = TEST_DIR / "uploads"

from backend.app import create_app

@pytest.fixture
def app():
    # Force testing configuration
    app = create_app()
    app.config.update({
        "TESTING": True,
        "ENV": "development"
    })
    
    # Ensure test directories exist
    TEST_DIR.mkdir(parents=True, exist_ok=True)
    
    yield app
    
    # Cleanup
    if TEST_DIR.exists():
        shutil.rmtree(TEST_DIR)

@pytest.fixture
def client(app):
    return app.test_client()

def test_auth_flows(client):
    # 1. Register a test user
    payload = {
        "email": "user@studyai.com",
        "username": "study_user",
        "password": "mypassword123"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    
    res_data = response.get_json()
    assert res_data["success"] is True
    assert "access_token" in res_data["data"]
    assert "refresh_token" in res_data["data"]
    assert res_data["data"]["user"]["email"] == "user@studyai.com"
    
    # 2. Re-registering should return 400
    response_dup = client.post("/api/auth/register", json=payload)
    assert response_dup.status_code == 400
    
    # 3. Validation failure check (invalid email structure)
    payload_bad = {
        "email": "invalid_email",
        "username": "usr",
        "password": "123" # Too short
    }
    response_bad = client.post("/api/auth/register", json=payload_bad)
    assert response_bad.status_code == 400
    res_bad = response_bad.get_json()
    assert res_bad["success"] is False
    assert len(res_bad["errors"]) > 0

    # 4. Login user
    login_payload = {
        "email": "user@studyai.com",
        "password": "mypassword123"
    }
    response_login = client.post("/api/auth/login", json=login_payload)
    assert response_login.status_code == 200
    login_data = response_login.get_json()
    assert "access_token" in login_data["data"]
    
    # 5. Access protected route without token (401 check)
    response_protected_fail = client.get("/api/materials")
    assert response_protected_fail.status_code == 401
    
    # 6. Access protected route with valid token
    token = login_data["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    response_protected_success = client.get("/api/materials", headers=headers)
    assert response_protected_success.status_code == 200
    materials_data = response_protected_success.get_json()
    assert materials_data["success"] is True
    assert isinstance(materials_data["data"], list)
    assert len(materials_data["data"]) == 0
