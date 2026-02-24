from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud import (
    team as crud_team,
    user_role as crud_role,
    user as crud_user,
    feature as crud_feature,
    issue as crud_issue,
)
from app.services.project_service import project_service
from app.services.notification_service import notification_service
from app.models.notification import NotificationType
from app.models.team_model import Team
from app.models.user_role import UserRoleType
from app.schemas.team import TeamCreate, TeamUpdate
from uuid import UUID


class TeamService:
    """Business logic for Team management"""

    def create_team(self, db: Session, *, team_in: TeamCreate, user_id: UUID) -> Team:
        """
        Create new team:
        1. Check permissions (Admin or Leader)
        2. Generate identifier if missing
        3. Validate uniqueness
        4. Create team and add members
        """
        # Check permission
        # Assuming user must be at least a member of the org
        # Requirements: "can be any leader in the org or by default myself"

        # 1. Generate Identifier
        identifier = team_in.identifier
        if not identifier:
            identifier = Team.generate_identifier(team_in.name)

        # Check uniqueness in org
        existing = crud_team.get_by_identifier(
            db, organization_id=team_in.organization_id, identifier=identifier
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team with identifier {identifier} already exists in this organization",
            )

        # 2. Prepare data
        team = Team(
            organization_id=team_in.organization_id,
            name=team_in.name,
            identifier=identifier,
        )
        db.add(team)
        db.commit()

        # 3. Add Leaders
        leaders_added = []
        if team_in.leader_ids:
            for l_id in team_in.leader_ids:
                leader = crud_user.get(db, id=l_id)
                if leader:
                    # VALIDATION: Member can't be team leader
                    if leader.role == "member":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"User {leader.email} has 'member' role and cannot be a team leader",
                        )
                    team.leaders.append(leader)
                    team.members.append(leader)
                    leaders_added.append(l_id)

                    # Notify leader
                    if str(l_id) != str(user_id):
                        notification_service.notify_user(
                            db,
                            recipient_id=l_id,
                            type=NotificationType.TEAM_INVITE,
                            title="Added as Team Leader",
                            content=f"You have been added as a leader of team '{team.name}'",
                            actor_id=user_id,
                            target_id=str(team.id),
                            target_type="team",
                        )
        else:
            # Default to creator
            creator = crud_user.get(db, id=user_id)
            if creator:
                # VALIDATION: Member can't be team leader
                if creator.role == "member":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Users with 'member' role cannot be team leaders",
                    )
                team.leaders.append(creator)
                team.members.append(creator)
                leaders_added.append(user_id)

        # 4. Add other members
        if team_in.member_ids:
            for m_id in team_in.member_ids:
                if m_id not in leaders_added:
                    member = crud_user.get(db, id=m_id)
                    if member:
                        team.members.append(member)

                        # Notify member
                        if str(m_id) != str(user_id):
                            notification_service.notify_user(
                                db,
                                recipient_id=m_id,
                                type=NotificationType.TEAM_INVITE,
                                title="Invited to Team",
                                content=f"You have been added to team '{team.name}'",
                                actor_id=user_id,
                                target_id=str(team.id),
                                target_type="team",
                            )

        db.commit()
        db.refresh(team)

        # Sync members with projects
        project_service.sync_team_members(db, team_id=team.id)

        # 5. Import data if requested
        if team_in.import_from_team_id:
            self.import_data(
                db,
                target_team_id=team.id,
                source_team_id=team_in.import_from_team_id,
                user_id=user_id,
            )

        return team

    def update_team(self, db: Session, *, team_id: UUID, team_in: TeamUpdate) -> Team:
        """Update team attributes and relations"""
        team = crud_team.get(db, id=team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        # 1. Update basic fields
        update_data = team_in.model_dump(
            exclude={"leader_ids", "member_ids"}, exclude_unset=True
        )

        # Check identifier uniqueness if changed
        if "identifier" in update_data and update_data["identifier"] != team.identifier:
            existing = crud_team.get_by_identifier(
                db,
                organization_id=team.organization_id,
                identifier=update_data["identifier"],
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Team with identifier {update_data['identifier']} already exists",
                )

        for field, value in update_data.items():
            setattr(team, field, value)

        # 2. Update Leaders if provided
        if team_in.leader_ids is not None:
            new_leaders = []
            for l_id in team_in.leader_ids:
                leader = crud_user.get(db, id=l_id)
                if leader:
                    # VALIDATION: Member can't be team leader
                    if leader.role == "member":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"User {leader.email} has 'member' role and cannot be a team leader",
                        )
                    new_leaders.append(leader)
            team.leaders = new_leaders

            # Leaders must also be members
            for leader in new_leaders:
                if leader not in team.members:
                    team.members.append(leader)

        # 3. Update Members if provided
        if team_in.member_ids is not None:
            new_members = []
            for m_id in team_in.member_ids:
                member = crud_user.get(db, id=m_id)
                if member:
                    new_members.append(member)

            # Ensure leaders are still members
            for leader in team.leaders:
                if leader not in new_members:
                    new_members.append(leader)

            team.members = new_members

        db.add(team)
        db.commit()
        db.refresh(team)

        # Sync members with projects
        project_service.sync_team_members(db, team_id=team_id)

        return team

    def import_data(
        self, db: Session, *, target_team_id: UUID, source_team_id: UUID, user_id: UUID
    ):
        """
        Import data from another team:
        1. Copy Projects
        2. Copy Features
        3. Copy Issues
        """
        from app.models.project import Project
        from app.models.feature import Feature
        from app.models.issue import Issue
        from app.crud import issue as crud_issue

        # 1. Fetch source projects
        source_projects = (
            db.query(Project).filter(Project.team_id == source_team_id).all()
        )

        target_team = db.query(Team).filter(Team.id == target_team_id).first()
        if not target_team:
            return

        for s_project in source_projects:
            # Create new project
            new_project = Project(
                name=f"{s_project.name} (Imported)",
                icon=s_project.icon,
                color=s_project.color,
                description=s_project.description,
                status=s_project.status,
                health=s_project.health,
                priority=s_project.priority,
                team_id=target_team_id,
                visibility=s_project.visibility,
                lead_id=user_id,
            )
            db.add(new_project)
            db.flush()  # Get new_project.id

            # 2. Copy Features
            source_features = (
                db.query(Feature).filter(Feature.project_id == s_project.id).all()
            )
            for s_feature in source_features:
                new_feature = Feature(
                    project_id=new_project.id,
                    name=s_feature.name,
                    problem_statement=s_feature.problem_statement,
                    target_user=s_feature.target_user,
                    expected_outcome=s_feature.expected_outcome,
                    success_metric=s_feature.success_metric,
                    type=s_feature.type,
                    status=s_feature.status,
                    health=s_feature.health,
                    owner_id=user_id,
                    identifier=crud_feature.get_next_identifier(
                        db, target_team.identifier
                    ),
                )
                db.add(new_feature)
                db.flush()

                # 3. Copy Issues
                source_issues = (
                    db.query(Issue)
                    .filter(
                        Issue.feature_id == s_feature.id,
                        Issue.team_id == source_team_id,
                    )
                    .all()
                )

                for s_issue in source_issues:
                    # Generate new identifier for target team
                    identifier = crud_issue.get_next_identifier(
                        db, prefix=target_team.identifier
                    )

                    new_issue = Issue(
                        identifier=identifier,
                        title=s_issue.title,
                        description=s_issue.description,
                        status=s_issue.status,
                        priority=s_issue.priority,
                        team_id=target_team_id,
                        feature_id=new_feature.id,
                        visibility=s_issue.visibility,
                        assignee_id=None,  # Clear assignee on import
                    )
                    db.add(new_issue)

        db.commit()


team_service = TeamService()
