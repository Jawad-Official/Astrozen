"""add issue resources and due date

Revision ID: a40dc2aa1f77
Revises: 1b116f5e0adf
Create Date: 2026-01-28 02:09:59.405892

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a40dc2aa1f77'
down_revision = '1b116f5e0adf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # due_date already exists based on previous migration error
    # op.add_column('issues', sa.Column('due_date', sa.Date(), nullable=True))
    
    # Create issue_resources table
    # Using postgresql.ENUM directly to avoid create_type=True which fails if type exists
    resourcetype_enum = postgresql.ENUM('LINK', 'DOCUMENT', name='resourcetype', create_type=False)
    
    op.create_table(
        'issue_resources',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('issue_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('type', resourcetype_enum, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
    )


def downgrade() -> None:
    op.drop_table('issue_resources')