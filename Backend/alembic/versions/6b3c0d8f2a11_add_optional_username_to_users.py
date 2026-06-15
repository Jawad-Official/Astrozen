"""add_optional_username_to_users

Revision ID: 6b3c0d8f2a11
Revises: 5f033e3abb1d
Create Date: 2026-05-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '6b3c0d8f2a11'
down_revision = '5f033e3abb1d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    existing_indexes = {index["name"] for index in sa.inspect(bind).get_indexes("users")}

    with op.batch_alter_table("users", schema=None) as batch_op:
        if "username" not in existing_columns:
            batch_op.add_column(sa.Column("username", sa.String(), nullable=True))
        if "idx_users_username" not in existing_indexes:
            batch_op.create_index("idx_users_username", ["username"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    existing_columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    existing_indexes = {index["name"] for index in sa.inspect(bind).get_indexes("users")}

    with op.batch_alter_table("users", schema=None) as batch_op:
        if "idx_users_username" in existing_indexes:
            batch_op.drop_index("idx_users_username")
        if "username" in existing_columns:
            batch_op.drop_column("username")
