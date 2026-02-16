"""add_ai_project_features_v2

Revision ID: efa4d48c2f98
Revises: a40dc2aa1f77
Create Date: 2026-02-08 19:42:43.364417

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'efa4d48c2f98'
down_revision = 'a40dc2aa1f77'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing tables and types with CASCADE to handle everything
    op.execute("DROP TABLE IF EXISTS project_assets CASCADE")
    op.execute("DROP TABLE IF EXISTS validation_reports CASCADE")
    op.execute("DROP TABLE IF EXISTS project_ideas CASCADE")
    op.execute("DROP TABLE IF EXISTS feature_dependencies CASCADE")
    
    op.execute("DROP TYPE IF EXISTS ideastatus CASCADE")
    op.execute("DROP TYPE IF EXISTS assettype CASCADE")
    op.execute("DROP TYPE IF EXISTS assetstatus CASCADE")

    # Create tables
    op.create_table('project_ideas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('raw_input', sa.String(), nullable=False),
        sa.Column('refined_description', sa.String(), nullable=True),
        sa.Column('clarification_questions', sa.JSON(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'CLARIFICATION_NEEDED', 'READY_FOR_VALIDATION', 'VALIDATED', 'BLUEPRINT_GENERATED', 'COMPLETED', name='ideastatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('validation_reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_idea_id', sa.UUID(), nullable=False),
        sa.Column('market_feasibility', sa.JSON(), nullable=False),
        sa.Column('improvements', sa.JSON(), nullable=False),
        sa.Column('core_features', sa.JSON(), nullable=False),
        sa.Column('tech_stack', sa.JSON(), nullable=False),
        sa.Column('pricing_model', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_idea_id'], ['project_ideas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('project_assets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_idea_id', sa.UUID(), nullable=False),
        sa.Column('asset_type', sa.Enum('PRD', 'APP_FLOW', 'TECH_STACK', 'FRONTEND_GUIDELINES', 'BACKEND_SCHEMA', 'IMPLEMENTATION_PLAN', 'DIAGRAM_USER_FLOW', 'DIAGRAM_KANBAN', name='assettype'), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('r2_path', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', name='assetstatus'), nullable=False),
        sa.Column('chat_history', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_idea_id'], ['project_ideas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('project_assets')
    op.drop_table('validation_reports')
    op.drop_table('project_ideas')
    op.execute("DROP TYPE IF EXISTS ideastatus")
    op.execute("DROP TYPE IF EXISTS assettype")
    op.execute("DROP TYPE IF EXISTS assetstatus")
