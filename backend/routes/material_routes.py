import logging
import uuid
from pathlib import Path
from flask import Blueprint, request
from backend.repositories.db_repository import MaterialRepository
from backend.schemas.validation_schemas import validate_payload, UploadTextSchema
from backend.middleware.auth_middleware import token_required
from backend.services.file_service import FileService
from backend.services.worker_service import WorkerService
from backend.utils.response import api_response
from backend.config import Config

logger = logging.getLogger(__name__)

material_bp = Blueprint("materials", __name__)

@material_bp.route("", methods=["POST"])
@token_required
def upload_material(current_user_id):
    """
    Endpoint supporting file upload OR raw text paste.
    """
    # Check if request has files (multipart/form-data)
    if "file" in request.files:
        file = request.files["file"]
        if file.filename == "":
            return api_response(
                success=False,
                message="No file selected for upload.",
                status_code=400
            )
            
        if not FileService.allowed_file(file.filename):
            return api_response(
                success=False,
                message="Unsupported file type. Only PDF, DOCX, and TXT are allowed.",
                status_code=400
            )
            
        # Generate unique temporary file name
        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_name = f"{uuid.uuid4()}.{ext}"
        upload_path = Path(Config.UPLOAD_FOLDER) / unique_name
        
        try:
            file.save(str(upload_path))
        except Exception as e:
            logger.error(f"Failed to save uploaded file: {e}")
            return api_response(
                success=False,
                message="Could not save file to server storage.",
                status_code=500
            )

        # Create database pending entry
        material_data = {
            "user_id": current_user_id,
            "title": file.filename,
            "filename": file.filename,
            "file_type": ext,
            "status": "pending",
            "progress": 0,
            "text_content": ""
        }
        
        material_id = MaterialRepository.create(material_data)
        material_data["id"] = material_id
        
        # Submit task to Thread Worker
        WorkerService.submit_task(
            FileService.process_material_async,
            material_id,
            str(upload_path)
        )
        
        logger.info(f"File uploaded. Spawning parsing task for material {material_id}.")
        return api_response(
            success=True,
            message="File uploaded successfully. Processing started in background.",
            data=material_data,
            status_code=202
        )
        
    # Otherwise, check for raw text paste in JSON body
    else:
        # We manually fetch JSON to validate with schema since validate_payload only works if request is purely JSON
        json_data = request.get_json(silent=True)
        if not json_data:
            return api_response(
                success=False,
                message="Request must contain a file upload or a JSON text body.",
                status_code=400
            )
            
        try:
            # Manually run validation schema
            payload = UploadTextSchema(**json_data)
        except Exception as e:
            # Let global validator parse it or raise directly
            raise e
            
        material_data = {
            "user_id": current_user_id,
            "title": payload.title,
            "filename": "Pasted Text",
            "file_type": "txt",
            "status": "completed",
            "progress": 100,
            "text_content": payload.content,
            "word_count": len(payload.content.split())
        }
        
        material_id = MaterialRepository.create(material_data)
        material_data["id"] = material_id
        
        logger.info(f"Raw text material {material_id} created successfully.")
        return api_response(
            success=True,
            message="Material saved successfully.",
            data=material_data,
            status_code=201
        )

@material_bp.route("", methods=["GET"])
@token_required
def get_materials(current_user_id):
    """
    List all materials for the authenticated user.
    """
    materials = MaterialRepository.get_by_user(current_user_id)
    # Strip heavy text content in listings for performance
    for m in materials:
        if "text_content" in m and len(m["text_content"]) > 100:
            m["text_content"] = m["text_content"][:100] + "..."
            
    return api_response(
        success=True,
        message="Materials retrieved successfully.",
        data=materials
    )

@material_bp.route("/<material_id>", methods=["GET"])
@token_required
def get_material_by_id(current_user_id, material_id):
    """
    Get full details (including extracted text) of a specific material.
    """
    material = MaterialRepository.get_by_id(material_id)
    if not material:
        return api_response(
            success=False,
            message="Material not found.",
            status_code=404
        )
        
    if material["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied to this material.",
            status_code=403
        )
        
    return api_response(
        success=True,
        message="Material details retrieved successfully.",
        data=material
    )

@material_bp.route("/<material_id>", methods=["DELETE"])
@token_required
def delete_material(current_user_id, material_id):
    """
    Delete a study material.
    """
    material = MaterialRepository.get_by_id(material_id)
    if not material:
        return api_response(
            success=False,
            message="Material not found.",
            status_code=404
        )
        
    if material["user_id"] != current_user_id:
        return api_response(
            success=False,
            message="Access denied to delete this material.",
            status_code=403
        )
        
    # Check if Firestore / Local deleted
    deleted = MaterialRepository.delete(material_id)
    if deleted:
        logger.info(f"Material {material_id} deleted successfully.")
        return api_response(
            success=True,
            message="Material deleted successfully."
        )
        
    return api_response(
        success=False,
        message="Could not delete material.",
        status_code=500
    )
