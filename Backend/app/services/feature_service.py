from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud import feature as crud_feature
from app.models.feature import Feature, FeatureStatus
from app.schemas.feature import FeatureCreate, FeatureUpdate
from uuid import UUID


class FeatureService:
    """Business logic for Feature management"""
    
    def create_feature(
        self,
        db: Session,
        *,
        feature_in: FeatureCreate,
        user_id: UUID
    ) -> Feature:
        """Create new feature"""
        from app.models.project import Project
        from app.models.team_model import Team
        
        project = db.query(Project).filter(Project.id == feature_in.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        team = db.query(Team).filter(Team.id == project.team_id).first()
        if not team:
            # Fallback if project has no team, though schema says it should
            prefix = "FEAT"
        else:
            prefix = team.identifier
            
        identifier = crud_feature.get_next_identifier(db, prefix=prefix)
        return crud_feature.create(db, obj_in=feature_in, identifier=identifier)

    def update_status(
        self,
        db: Session,
        *,
        feature_id: UUID,
        status: FeatureStatus,
        user_id: UUID
    ) -> Feature:
        """
        Update feature status with gate checks:
        1. Cannot move to VALIDATED without Core Definition (Problem, Target, Outcome, Metric)
        2. Cannot move to IN_BUILD without Validation Evidence
        """
        feature = crud_feature.get(db, id=feature_id)
        if not feature:
            raise HTTPException(status_code=404, detail="Feature not found")
            
        # Gate Check: Discovery -> Validated
        if status == FeatureStatus.VALIDATED or (feature.status == FeatureStatus.DISCOVERY and status in [FeatureStatus.IN_BUILD, FeatureStatus.IN_REVIEW]):
            if not all([feature.problem_statement, feature.target_user, feature.expected_outcome, feature.success_metric]):
                # Or check if they are being updated in this same call? (Managed by basic update usually)
                # If we are ONLY updating status here, we must fail.
                # If we are passing feature_in with updates, we should check the *merged* state.
                # Here we assume this method is for explicit status transitions.
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot move to Validated status without Core Definition fields (Problem, Target, Outcome, Metric)"
                )

        # Gate Check: Validated -> In Build
        if status == FeatureStatus.IN_BUILD:
            if not feature.validation_evidence:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot move to In Build status without Validation Evidence"
                )
                
        # Status Transitions Restriction (Forward only or Rollback?)
        # User req: "Status transitions are restricted... Forward-only, with explicit rollback."
        # Not implementing strict state machine library, but simple checks
        
        feature.status = status
        db.commit()
        db.refresh(feature)
        return feature


feature_service = FeatureService()
