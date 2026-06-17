"""add idea_id to documents

Revision ID: eaab564ba700
Revises: b000731f8eae
Create Date: 2026-06-17 23:53:36.556460

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eaab564ba700'
down_revision = 'b000731f8eae'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('idea_id', sa.UUID(), nullable=True))
        batch_op.create_foreign_key(
            'fk_documents_idea_id', 'project_ideas',
            ['idea_id'], ['id'], ondelete='CASCADE'
        )


def downgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_constraint('fk_documents_idea_id', type_='foreignkey')
        batch_op.drop_column('idea_id')
