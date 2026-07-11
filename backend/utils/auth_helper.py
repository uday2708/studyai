import os
import hashlib
import logging

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    """
    Secure password hashing using PBKDF2 with HMAC SHA256 and unique salt.
    """
    salt = os.urandom(16)
    rounds = 100000
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    return f"{salt.hex()}:{rounds}:{key.hex()}"

def verify_password(password: str, hashed_str: str) -> bool:
    """
    Verify a raw password against its PBKDF2 hash.
    """
    try:
        parts = hashed_str.split(":")
        if len(parts) != 3:
            return False
        salt_hex, rounds_str, key_hex = parts
        
        salt = bytes.fromhex(salt_hex)
        rounds = int(rounds_str)
        key = bytes.fromhex(key_hex)
        
        new_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
        return new_key == key
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False
