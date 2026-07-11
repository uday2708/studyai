import os
import json
import uuid
import logging
import threading
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
from backend.config import Config

logger = logging.getLogger(__name__)

# Global lock for thread-safe local JSON writes
_json_db_lock = threading.Lock()

class DBAdapter:
    """
    Adapter that switches between Firestore and Local JSON fallback based on credentials.
    """
    def __init__(self):
        self.firestore_db = None
        self.use_local = True
        
        firebase_logger = logging.getLogger("firebase.firebase_config")
        local_logger = logging.getLogger("services.local_storage")
        app_logger = logging.getLogger("studyai.app")
        
        if Config.FIREBASE_PROJECT_ID and Config.FIREBASE_CLIENT_EMAIL and Config.FIREBASE_PRIVATE_KEY:
            try:
                private_key = Config.FIREBASE_PRIVATE_KEY
                if private_key.startswith('"') and private_key.endswith('"'):
                    private_key = private_key[1:-1]
                if private_key.startswith("'") and private_key.endswith("'"):
                    private_key = private_key[1:-1]
                private_key = private_key.replace("\\n", "\n")

                cred_dict = {
                    "type": "service_account",
                    "project_id": Config.FIREBASE_PROJECT_ID,
                    "private_key": private_key,
                    "client_email": Config.FIREBASE_CLIENT_EMAIL,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
                
                try:
                    app = firebase_admin.get_app()
                except ValueError:
                    app = firebase_admin.initialize_app(cred)
                    
                self.firestore_db = firestore.client()
                
                # Verify that Firestore API is enabled and accessible
                self.firestore_db.collection("_health_check").document("ping").get(timeout=5)
                
                self.use_local = False
                firebase_logger.info("🔥 Firebase initialized successfully")
                firebase_logger.info("📦 Firestore is ready")
            except Exception as e:
                firebase_logger.warning(
                    f"Firestore connection check failed: {e}. "
                    "Falling back to Local JSON Database."
                )
                self.use_local = True
        else:
            self.use_local = True
            
        if self.use_local:
            self.local_dir = Path(Config.LOCAL_DB_DIR)
            self.local_dir.mkdir(parents=True, exist_ok=True)
            local_logger.info(f"✅ Local JSON storage initialised at: {self.local_dir.absolute()}")
            app_logger.info("📁 Local storage initialized")

    def _get_local_file_path(self, collection_name):
        return self.local_dir / f"{collection_name}.json"

    def _read_local_collection(self, collection_name):
        file_path = self._get_local_file_path(collection_name)
        if not file_path.exists():
            return {}
        with _json_db_lock:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading local collection {collection_name}: {e}")
                return {}

    def _write_local_collection(self, collection_name, data):
        file_path = self._get_local_file_path(collection_name)
        # Ensure directory exists dynamically in case it was deleted
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with _json_db_lock:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error writing local collection {collection_name}: {e}")

    def get_doc(self, collection, doc_id):
        """Get document by collection and ID."""
        if not self.use_local:
            try:
                doc_ref = self.firestore_db.collection(collection).document(doc_id)
                doc = doc_ref.get()
                if doc.exists:
                    res = doc.to_dict()
                    res["id"] = doc.id
                    return res
                return None
            except Exception as e:
                logger.error(f"Firestore get_doc error: {e}. Trying fallback if database failed.")
                # If Firestore query failed, we don't implicitly switch to local mid-run, 
                # but log the failure. Returning None.
                return None
        else:
            collection_data = self._read_local_collection(collection)
            doc_data = collection_data.get(doc_id)
            if doc_data:
                # Ensure the id key is present
                doc_data["id"] = doc_id
                return doc_data
            return None

    def set_doc(self, collection, doc_id, data):
        """Set (create or completely overwrite/merge) document by ID."""
        # Clean id field if in data to prevent duplicate fields
        data_to_save = data.copy()
        if "id" in data_to_save:
            del data_to_save["id"]

        if not self.use_local:
            try:
                self.firestore_db.collection(collection).document(doc_id).set(data_to_save, merge=True)
                return doc_id
            except Exception as e:
                logger.error(f"Firestore set_doc error: {e}")
                raise e
        else:
            collection_data = self._read_local_collection(collection)
            collection_data[doc_id] = data_to_save
            self._write_local_collection(collection, collection_data)
            return doc_id

    def add_doc(self, collection, data):
        """Add new document with auto-generated ID."""
        doc_id = str(uuid.uuid4())
        self.set_doc(collection, doc_id, data)
        return doc_id

    def query_docs(self, collection, filters=None):
        """
        Query documents inside a collection.
        filters: List of tuples (field, operator, value) e.g. [('email', '==', 'test@test.com')]
        """
        if filters is None:
            filters = []

        if not self.use_local:
            try:
                ref = self.firestore_db.collection(collection)
                for field, op, val in filters:
                    # In firestore, check operator translation if needed, standard is ==, <, >, etc.
                    ref = ref.where(field, op, val)
                results = []
                for doc in ref.stream():
                    d = doc.to_dict()
                    d["id"] = doc.id
                    results.append(d)
                return results
            except Exception as e:
                logger.error(f"Firestore query_docs error: {e}")
                return []
        else:
            collection_data = self._read_local_collection(collection)
            results = []
            for doc_id, data in collection_data.items():
                match = True
                for field, op, val in filters:
                    item_val = data.get(field)
                    if op == "==":
                        if item_val != val:
                            match = False
                            break
                    elif op == "!=":
                        if item_val == val:
                            match = False
                            break
                    elif op == "in":
                        if item_val not in val:
                            match = False
                            break
                if match:
                    # Include the id key
                    doc_copy = data.copy()
                    doc_copy["id"] = doc_id
                    results.append(doc_copy)
            return results

    def delete_doc(self, collection, doc_id):
        """Delete a document by ID."""
        if not self.use_local:
            try:
                self.firestore_db.collection(collection).document(doc_id).delete()
                return True
            except Exception as e:
                logger.error(f"Firestore delete_doc error: {e}")
                raise e
        else:
            collection_data = self._read_local_collection(collection)
            if doc_id in collection_data:
                del collection_data[doc_id]
                self._write_local_collection(collection, collection_data)
                return True
            return False
