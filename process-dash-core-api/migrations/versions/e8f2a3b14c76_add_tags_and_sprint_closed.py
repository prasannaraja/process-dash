"""add tags to user_stories and is_closed to sprint_definitions

Revision ID: e8f2a3b14c76
Revises: d4e7f1a23b89
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa

revision = "e8f2a3b14c76"
down_revision = "d4e7f1a23b89"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add tags column to user_stories (nullable JSON string, e.g. '["PSP","TSP"]')
    with op.batch_alter_table("user_stories") as batch_op:
        batch_op.add_column(sa.Column("tags", sa.Text(), nullable=True))

    # Add is_closed column to sprint_definitions
    with op.batch_alter_table("sprint_definitions") as batch_op:
        batch_op.add_column(
            sa.Column("is_closed", sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade() -> None:
    with op.batch_alter_table("user_stories") as batch_op:
        batch_op.drop_column("tags")

    with op.batch_alter_table("sprint_definitions") as batch_op:
        batch_op.drop_column("is_closed")
