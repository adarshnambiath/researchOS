"""
SQLAlchemy database engine and session factory.

This module is the single source of truth for database connection
configuration.  All other modules obtain sessions through the
dependency-injected get_db() function rather than importing the
engine directly.

Design decision: SQLite is used for MVP because it requires zero
infrastructure.  When multi-user support is needed, change the
database URL in config.py — nothing else in this module needs to change.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency that provides a database session.

    The session is closed automatically when the request completes,
    even if the endpoint raises an exception.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
