"""add oauth_provider and nullable password

Revision ID: b000731f8eae
Revises: 6b3c0d8f2a11
Create Date: 2026-06-17 23:53:36.556460

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b000731f8eae'
down_revision = '6b3c0d8f2a11'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('oauth_provider', sa.String(), nullable=True))
        batch_op.alter_column('hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=False)
        batch_op.drop_column('oauth_provider')
