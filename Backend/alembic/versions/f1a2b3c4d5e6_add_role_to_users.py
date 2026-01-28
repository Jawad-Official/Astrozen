"""Add role column to users table

Revision ID: f1a2b3c4d5e6
Revises: 2c5f5b3dac36
Create Date: 2026-01-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = '2c5f5b3dac36'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add role column with default 'member'
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='member'))
    # Remove server_default so it's handled by SQLAlchemy model default thereafter
    op.alter_column('users', 'role', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'role')