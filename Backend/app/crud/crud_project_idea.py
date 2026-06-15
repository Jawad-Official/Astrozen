from typing import Optional, List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.project_idea import ProjectIdea, ValidationReport, ProjectAsset, IdeaStatus
from app.schemas.ai import IdeaSubmit, IdeaUpdate

class CRUDProjectIdea(CRUDBase[ProjectIdea, IdeaSubmit, IdeaUpdate]):
    def create_with_user(self, db: Session, *, obj_in: IdeaSubmit, user_id: str) -> ProjectIdea:
        db_obj = ProjectIdea(
            raw_input=obj_in.raw_input,
            user_id=user_id,
            status=IdeaStatus.DRAFT
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_user(self, db: Session, *, user_id: str) -> List[ProjectIdea]:
        return db.query(ProjectIdea).filter(ProjectIdea.user_id == user_id).all()

    def create_validation_report(self, db: Session, *, idea_id: str, report_data: dict) -> ValidationReport:
        db_obj = ValidationReport(
            project_idea_id=idea_id,
            **report_data
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_asset(self, db: Session, *, idea_id: str, asset_type: str) -> Optional[ProjectAsset]:
        return db.query(ProjectAsset).filter(
            ProjectAsset.project_idea_id == idea_id,
            ProjectAsset.asset_type == asset_type
        ).first()

    def create_or_update_asset(self, db: Session, *, idea_id: str, asset_type: str, content: str, status: str, r2_path: str = None) -> ProjectAsset:
        asset = self.get_asset(db, idea_id=idea_id, asset_type=asset_type)
        if asset:
            asset.content = content
            asset.status = status
            if r2_path:
                asset.r2_path = r2_path
        else:
            asset = ProjectAsset(
                project_idea_id=idea_id,
                asset_type=asset_type,
                content=content,
                status=status,
                r2_path=r2_path
            )
            db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

project_idea = CRUDProjectIdea(ProjectIdea)
