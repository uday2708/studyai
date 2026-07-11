import logging
from pathlib import Path
import PyPDF2
import docx2txt
from backend.repositories.db_repository import MaterialRepository

logger = logging.getLogger(__name__)

class FileService:
    """
    Service responsible for reading and extracting text from study materials.
    """
    
    @staticmethod
    def allowed_file(filename):
        """Check if file extension is supported."""
        allowed_extensions = {"pdf", "docx", "txt"}
        return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions

    @classmethod
    def extract_text_from_file(cls, file_path: Path) -> str:
        """
        Extract text based on file extension.
        """
        suffix = file_path.suffix.lower()
        
        if suffix == ".txt":
            # Try utf-8, fallback to latin-1
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
            except UnicodeDecodeError:
                with open(file_path, "r", encoding="latin-1") as f:
                    return f.read()
                    
        elif suffix == ".pdf":
            text_content = []
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                num_pages = len(reader.pages)
                
                if num_pages == 0:
                    raise ValueError("PDF file contains no pages.")
                    
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
                        
            return "\n\n".join(text_content)
            
        elif suffix == ".docx":
            # docx2txt handles docx extract directly
            text = docx2txt.process(str(file_path))
            return text if text else ""
            
        else:
            raise ValueError(f"Unsupported file extension: {suffix}")

    @classmethod
    def process_material_async(cls, material_id: str, file_path_str: str):
        """
        Background task to extract text and update the material state.
        This function runs inside a background worker thread.
        """
        file_path = Path(file_path_str)
        logger.info(f"Starting background parsing for material ID: {material_id}, File: {file_path}")
        
        material = MaterialRepository.get_by_id(material_id)
        if not material:
            logger.error(f"Material {material_id} not found in database. Aborting parsing.")
            return

        try:
            # 1. Start parsing
            MaterialRepository.update(material_id, {
                **material,
                "status": "processing",
                "progress": 20
            })
            
            # 2. Perform text extraction
            extracted_text = cls.extract_text_from_file(file_path)
            
            # Clean text (strip whitespace)
            extracted_text = extracted_text.strip()
            
            # 3. Check extraction output
            if not extracted_text:
                raise ValueError("No extractable text was found in this file.")
                
            logger.info(f"Successfully extracted {len(extracted_text)} characters from {file_path.name}")
            
            # 4. Save content and complete task
            MaterialRepository.update(material_id, {
                **material,
                "text_content": extracted_text,
                "status": "completed",
                "progress": 100,
                "word_count": len(extracted_text.split())
            })
            
        except Exception as e:
            logger.error(f"Failed to parse material {material_id}: {e}")
            MaterialRepository.update(material_id, {
                **material,
                "status": "failed",
                "progress": 0,
                "error_message": str(e)
            })
        finally:
            # Safely delete the temp file after processing is complete
            # to avoid cluttering local disk storage.
            try:
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Temporary file {file_path} deleted.")
            except Exception as ex:
                logger.error(f"Could not delete temporary file {file_path}: {ex}")
