from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    ministry = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    min_age = Column(Integer, nullable=False)
    max_income = Column(Integer, nullable=False)
    eligibility_text = Column(Text, nullable=False)
    benefits = Column(Text, nullable=False)
    apply_link = Column(String(300), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookmarks = relationship("Bookmark", back_populates="scheme", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="scheme", cascade="all, delete-orphan")


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "scheme_id", name="uq_user_scheme_bookmark"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="bookmarks")
    scheme = relationship("Scheme", back_populates="bookmarks")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(40), nullable=False, default="interested")
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="applications")
    scheme = relationship("Scheme", back_populates="applications")
