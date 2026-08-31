import uuid
from typing import Generic, TypeVar, Type, Optional, List, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


def _coerce_uuid(id: Any) -> Any:
    """Coerce a string primary key into a real uuid.UUID.

    Most models in this app use SQLAlchemy's UUID(as_uuid=True) column
    type. On SQLite (no native UUID column type), that type's bind
    processor requires an actual uuid.UUID instance and raises
    AttributeError on a plain str - it only happens to work on PostgreSQL
    because psycopg2 casts a string to UUID natively, bypassing
    SQLAlchemy's own processor. Several callers pass a bare `str` path
    parameter straight through (e.g. routes typed `id: str` rather than
    `id: UUID`), which crashed lookups against local SQLite databases.
    Passing an already-correct uuid.UUID (or any non-string id, such as
    an int primary key elsewhere) is unaffected.
    """
    if isinstance(id, str):
        try:
            return uuid.UUID(id)
        except (ValueError, AttributeError, TypeError):
            pass
    return id


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base class for CRUD operations"""

    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).

        **Parameters**
        * `model`: A SQLAlchemy model class
        * `schema`: A Pydantic model (schema) class
        """
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """Get a single record by ID"""
        return db.query(self.model).filter(self.model.id == _coerce_uuid(id)).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records with pagination"""
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record"""
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType | dict[str, Any]
    ) -> ModelType:
        """Update an existing record"""
        obj_data = db_obj.__dict__
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, id: Any) -> ModelType:
        """Delete a record"""
        obj = db.query(self.model).get(_coerce_uuid(id))
        db.delete(obj)
        db.commit()
        return obj
