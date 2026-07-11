import os
import shutil
import pytest
from pathlib import Path
from backend.config import Config

# Point the test database to a separate temporary directory
TEST_DIR = Path(__file__).resolve().parent / "test_local_db"
Config.LOCAL_DB_DIR = TEST_DIR
Config.UPLOAD_FOLDER = TEST_DIR / "uploads"

# Now import services & repositories
from backend.utils.auth_helper import hash_password, verify_password
from backend.services.file_service import FileService
from backend.repositories.db_repository import UserRepository, MaterialRepository

@pytest.fixture(autouse=True)
def run_around_tests():
    """Setup and teardown local database folders for tests."""
    TEST_DIR.mkdir(parents=True, exist_ok=True)
    yield
    # Clean up test database
    if TEST_DIR.exists():
        shutil.rmtree(TEST_DIR)

def test_password_hashing():
    password = "SuperSecurePassword123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_file_extension_validation():
    assert FileService.allowed_file("lecture_notes.pdf") is True
    assert FileService.allowed_file("syllabus.docx") is True
    assert FileService.allowed_file("read_me.txt") is True
    assert FileService.allowed_file("malicious.exe") is False
    assert FileService.allowed_file("image.png") is False
    assert FileService.allowed_file("no_extension") is False

def test_user_repository():
    user_data = {
        "email": "TestEmail@Example.com",  # Mixed case to test normalisation
        "username": "TestUser",
        "password_hash": "mocked_hash"
    }
    user_id = UserRepository.create(user_data)
    assert user_id is not None
    
    # Query email - normalisation check
    fetched_user = UserRepository.get_by_email("testemail@example.com")
    assert fetched_user is not None
    assert fetched_user["email"] == "testemail@example.com"
    assert fetched_user["username"] == "testuser"
    
    # Get by ID
    fetched_user_by_id = UserRepository.get_by_id(user_id)
    assert fetched_user_by_id is not None
    assert fetched_user_by_id["username"] == "testuser"

def test_material_repository():
    material_data = {
        "user_id": "test_user_id",
        "title": "Algorithms 101",
        "filename": "algo.txt",
        "file_type": "txt",
        "text_content": "Binary search divides the search space in half repeatedly."
    }
    
    mat_id = MaterialRepository.create(material_data)
    assert mat_id is not None
    
    materials = MaterialRepository.get_by_user("test_user_id")
    assert len(materials) == 1
    assert materials[0]["title"] == "Algorithms 101"
    
    # Update status
    material = MaterialRepository.get_by_id(mat_id)
    material["status"] = "completed"
    material["progress"] = 100
    MaterialRepository.update(mat_id, material)
    
    updated = MaterialRepository.get_by_id(mat_id)
    assert updated["status"] == "completed"
    assert updated["progress"] == 100
