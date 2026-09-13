from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base service layer foundation containing business logic coordinates
    between API routers and database repositories.
    """
    def __init__(self, repository: BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]):
        self.repository = repository

    def get_by_id(self, db: Session, id: Any) -> Optional[ModelType]:
        return self.repository.get(db, id=id)

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.repository.get_multi(db, skip=skip, limit=limit)

    def create(self, db: Session, obj_in: CreateSchemaType) -> ModelType:
        return self.repository.create(db, obj_in=obj_in)
