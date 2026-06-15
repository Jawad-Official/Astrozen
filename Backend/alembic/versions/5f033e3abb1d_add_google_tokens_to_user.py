"""add_google_tokens_to_user

Revision ID: 5f033e3abb1d
Revises: 8d7152ffd8f0
Create Date: 2026-05-02 15:50:16.787882

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5f033e3abb1d'
down_revision = '8d7152ffd8f0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'google_access_token' not in existing_columns:
            batch_op.add_column(sa.Column('google_access_token', sa.String(), nullable=True))
        if 'google_refresh_token' not in existing_columns:
            batch_op.add_column(sa.Column('google_refresh_token', sa.String(), nullable=True))
        if 'google_token_expires_at' not in existing_columns:
            batch_op.add_column(sa.Column('google_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    existing_columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'google_token_expires_at' in existing_columns:
            batch_op.drop_column('google_token_expires_at')
        if 'google_refresh_token' in existing_columns:
            batch_op.drop_column('google_refresh_token')
        if 'google_access_token' in existing_columns:
            batch_op.drop_column('google_access_token')
