from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Project, User


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    def register(self, *, name: str, email: str, password: str) -> User:
        existing = self.db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
        if existing:
            raise ValueError("An account with that email already exists.")

        user = User(
            email=email.lower(),
            name=name.strip(),
            password_hash=_hash_password(password),
        )
        self.db.add(user)
        self.db.flush()
        self.db.add(Project(user_id=user.id, name="Default Workspace", description="Primary extraction workspace"))
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate(self, *, email: str, password: str) -> tuple[User, str]:
        user = self.db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
        if not user or not _verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password.")

        token = self.create_access_token(user)
        return user, token

    def create_access_token(self, user: User) -> str:
        expires_at = datetime.now(UTC) + timedelta(days=7)
        payload = {
            "sub": user.id,
            "email": user.email,
            "name": user.name,
            "exp": expires_at,
        }
        return jwt.encode(payload, self.settings.secret_key, algorithm="HS256")

    def get_user_from_token(self, token: str) -> User | None:
        try:
            payload = jwt.decode(token, self.settings.secret_key, algorithms=["HS256"])
        except jwt.PyJWTError:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None
        return self.db.get(User, user_id)


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        salt_b64, digest_b64 = encoded.split("$", 1)
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
    except ValueError:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return hmac.compare_digest(actual, expected)
