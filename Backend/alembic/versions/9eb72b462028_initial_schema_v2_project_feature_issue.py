"""initial_schema_v2_project_feature_issue

Revision ID: 9eb72b462028
Revises: 
Create Date: 2026-01-25 23:15:40.493817

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9eb72b462028'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if we are on a fresh database
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'organizations' not in existing_tables:
        # Create Enums first with correct cases (mostly lowercase, matching models)
        op.execute("CREATE TYPE visibility AS ENUM ('team', 'organization')")
        op.execute("CREATE TYPE projectstatus AS ENUM ('backlog', 'planned', 'in_progress', 'paused', 'completed', 'cancelled')")
        op.execute("CREATE TYPE projecthealth AS ENUM ('on_track', 'at_risk', 'off_track', 'no_updates')")
        op.execute("CREATE TYPE projectpriority AS ENUM ('urgent', 'high', 'medium', 'low', 'none')")
        op.execute("CREATE TYPE featuretype AS ENUM ('new_capability', 'enhancement', 'experiment', 'infrastructure')")
        op.execute("CREATE TYPE featurestatus AS ENUM ('discovery', 'validated', 'in_build', 'in_review', 'shipped', 'adopted', 'killed')")
        op.execute("CREATE TYPE featurehealth AS ENUM ('on_track', 'at_risk', 'off_track')")
        op.execute("CREATE TYPE cyclestatus AS ENUM ('upcoming', 'active', 'completed')")
        op.execute("CREATE TYPE issuestatus AS ENUM ('backlog', 'todo', 'in_progress', 'done', 'cancelled')")
        op.execute("CREATE TYPE issuepriority AS ENUM ('urgent', 'high', 'medium', 'low', 'none')")
        op.execute("CREATE TYPE triagestatus AS ENUM ('pending', 'accepted', 'declined', 'duplicate')")
        op.execute("CREATE TYPE activitytype AS ENUM ('created', 'status_changed', 'priority_changed', 'assigned', 'comment', 'cycle_changed')")
        op.execute("CREATE TYPE userroletype AS ENUM ('admin', 'leader', 'member')")
        op.execute("CREATE TYPE viewtype AS ENUM ('issues', 'projects')")
        op.execute("CREATE TYPE viewvisibility AS ENUM ('personal', 'team')")
        op.execute("CREATE TYPE viewlayout AS ENUM ('list', 'board')")

        # 2. Create Base Tables
        op.create_table('organizations',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('created_by_id', sa.UUID(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('users',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('email', sa.String(), nullable=False),
            sa.Column('first_name', sa.String(), nullable=False),
            sa.Column('last_name', sa.String(), nullable=False),
            sa.Column('job_title', sa.String(), nullable=True),
            sa.Column('hashed_password', sa.String(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('organization_id', sa.UUID(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        
        # Now add the FK from organizations back to users (circular)
        op.create_foreign_key('fk_organizations_created_by', 'organizations', 'users', ['created_by_id'], ['id'], ondelete='SET NULL')

        op.create_table('teams',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('organization_id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('identifier', sa.String(length=5), nullable=False),
            sa.Column('leader_id', sa.UUID(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['leader_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('organization_id', 'identifier', name='unique_org_team_identifier')
        )

        op.create_table('team_members',
            sa.Column('team_id', sa.UUID(), nullable=True),
            sa.Column('user_id', sa.UUID(), nullable=True),
            sa.Column('joined_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('team_id', 'user_id', name='unique_team_member')
        )

        op.create_table('team_leaders',
            sa.Column('team_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('assigned_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('team_id', 'user_id')
        )

        op.create_table('cycles',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('status', sa.Enum('upcoming', 'active', 'completed', name='cyclestatus'), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('projects',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('icon', sa.String(), nullable=False),
            sa.Column('color', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.Enum('backlog', 'planned', 'in_progress', 'paused', 'completed', 'cancelled', name='projectstatus'), nullable=False),
            sa.Column('health', sa.Enum('on_track', 'at_risk', 'off_track', 'no_updates', name='projecthealth'), nullable=False),
            sa.Column('priority', sa.Enum('urgent', 'high', 'medium', 'low', 'none', name='projectpriority'), nullable=False),
            sa.Column('team_id', sa.UUID(), nullable=False),
            sa.Column('visibility', sa.Enum('team', 'organization', name='visibility'), nullable=False),
            sa.Column('lead_id', sa.UUID(), nullable=True),
            sa.Column('start_date', sa.Date(), nullable=True),
            sa.Column('target_date', sa.Date(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['lead_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('project_members',
            sa.Column('project_id', sa.UUID(), nullable=True),
            sa.Column('user_id', sa.UUID(), nullable=True),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
        )

        op.create_table('project_teams',
            sa.Column('project_id', sa.UUID(), nullable=True),
            sa.Column('team_id', sa.UUID(), nullable=True),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE')
        )

        op.create_table('features',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('project_id', sa.UUID(), nullable=False),
            sa.Column('owner_id', sa.UUID(), nullable=True),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('problem_statement', sa.Text(), nullable=True),
            sa.Column('target_user', sa.String(), nullable=True),
            sa.Column('expected_outcome', sa.Text(), nullable=True),
            sa.Column('success_metric', sa.Text(), nullable=True),
            sa.Column('type', sa.Enum('new_capability', 'enhancement', 'experiment', 'infrastructure', name='featuretype'), nullable=False),
            sa.Column('status', sa.Enum('discovery', 'validated', 'in_build', 'in_review', 'shipped', 'adopted', 'killed', name='featurestatus'), nullable=False),
            sa.Column('health', sa.Enum('on_track', 'at_risk', 'off_track', name='featurehealth'), nullable=False),
            sa.Column('delivery_confidence', sa.Float(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('milestones',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('feature_id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('target_date', sa.Date(), nullable=True),
            sa.Column('completed', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['feature_id'], ['features.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('issues',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('identifier', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.Enum('backlog', 'todo', 'in_progress', 'done', 'cancelled', name='issuestatus'), nullable=False),
            sa.Column('priority', sa.Enum('urgent', 'high', 'medium', 'low', 'none', name='issuepriority'), nullable=False),
            sa.Column('triage_status', sa.Enum('pending', 'accepted', 'declined', 'duplicate', name='triagestatus'), nullable=True),
            sa.Column('team_id', sa.UUID(), nullable=False),
            sa.Column('visibility', sa.Enum('team', 'organization', name='visibility'), nullable=False),
            sa.Column('feature_id', sa.UUID(), nullable=True),
            sa.Column('milestone_id', sa.UUID(), nullable=True),
            sa.Column('cycle_id', sa.UUID(), nullable=True),
            sa.Column('assignee_id', sa.UUID(), nullable=True),
            sa.Column('project_id', sa.UUID(), nullable=True), # To be dropped later in this migration
            sa.Column('estimate', sa.Integer(), nullable=True),
            sa.Column('due_date', sa.Date(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['cycle_id'], ['cycles.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['feature_id'], ['features.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['milestone_id'], ['milestones.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_issues_identifier'), 'issues', ['identifier'], unique=True)

        op.create_table('comments',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('issue_id', sa.UUID(), nullable=False),
            sa.Column('author_id', sa.UUID(), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('activities',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('issue_id', sa.UUID(), nullable=False),
            sa.Column('type', sa.Enum('created', 'status_changed', 'priority_changed', 'assigned', 'comment', 'cycle_changed', name='activitytype'), nullable=False),
            sa.Column('actor_id', sa.UUID(), nullable=False),
            sa.Column('old_value', sa.String(), nullable=True),
            sa.Column('new_value', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('user_roles',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('organization_id', sa.UUID(), nullable=False),
            sa.Column('role', sa.Enum('admin', 'leader', 'member', name='userroletype'), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'organization_id', name='unique_user_org')
        )

        op.create_table('custom_views',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('icon', sa.String(), nullable=False),
            sa.Column('type', sa.Enum('issues', 'projects', name='viewtype'), nullable=False),
            sa.Column('owner_id', sa.UUID(), nullable=False),
            sa.Column('visibility', sa.Enum('personal', 'team', name='viewvisibility'), nullable=False),
            sa.Column('filter_config', sa.JSON(), nullable=False),
            sa.Column('layout', sa.Enum('list', 'board', name='viewlayout'), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('saved_filters',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('filter_config', sa.JSON(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        op.create_table('invite_codes',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('organization_id', sa.UUID(), nullable=False),
            sa.Column('code', sa.String(length=8), nullable=False),
            sa.Column('created_by_id', sa.UUID(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('used_count', sa.Integer(), nullable=True),
            sa.Column('max_uses', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_invite_codes_code'), 'invite_codes', ['code'], unique=True)

    # 3. Alter issues.feature_id to NOT NULL (as intended by original migration)
    op.alter_column('issues', 'feature_id',
               existing_type=sa.UUID(),
               nullable=False)
               
    try:
        op.drop_constraint('issues_project_id_fkey', 'issues', type_='foreignkey')
    except:
        pass
    try:
        op.drop_constraint('issues_feature_id_fkey', 'issues', type_='foreignkey')
    except:
        pass

    op.create_foreign_key(None, 'issues', 'features', ['feature_id'], ['id'], ondelete='CASCADE')
    op.drop_column('issues', 'project_id')


def downgrade() -> None:
    op.add_column('issues', sa.Column('project_id', sa.UUID(), autoincrement=False, nullable=True))
    op.drop_constraint(None, 'issues', type_='foreignkey')
    op.create_foreign_key('issues_feature_id_fkey', 'issues', 'features', ['feature_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('issues_project_id_fkey', 'issues', 'projects', ['project_id'], ['id'], ondelete='SET NULL')
    op.alter_column('issues', 'feature_id',
               existing_type=sa.UUID(),
               nullable=True)
