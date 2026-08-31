"""add indexes to documents project_id and idea_id

Revision ID: a1f2c3d4e5b6
Revises: eaab564ba700
Create Date: 2026-08-31 12:47:35.296795

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'a1f2c3d4e5b6'
down_revision = 'eaab564ba700'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.create_index('idx_documents_project_id', ['project_id'], unique=False)
        batch_op.create_index('idx_documents_idea_id', ['idea_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_index('idx_documents_idea_id')
        batch_op.drop_index('idx_documents_project_id')
