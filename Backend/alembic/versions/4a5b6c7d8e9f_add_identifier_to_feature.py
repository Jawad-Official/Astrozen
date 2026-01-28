"""add identifier to feature

Revision ID: 4a5b6c7d8e9f
Revises: 234399c000c1
Create Date: 2026-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a5b6c7d8e9f'
down_revision = '234399c000c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('features', sa.Column('identifier', sa.String(), nullable=True))
    op.create_index(op.f('ix_features_identifier'), 'features', ['identifier'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_features_identifier'), table_name='features')
    op.drop_column('features', 'identifier')
