"""add sprint definitions

Revision ID: a1f4d8c93e52
Revises: 4bb7c65314a2
Create Date: 2026-03-09 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "a1f4d8c93e52"
down_revision: Union[str, Sequence[str], None] = "4bb7c65314a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sprint_definitions",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sprint_definitions_start_date"), "sprint_definitions", ["start_date"], unique=False)
    op.create_index(op.f("ix_sprint_definitions_end_date"), "sprint_definitions", ["end_date"], unique=False)
    op.create_index(op.f("ix_sprint_definitions_is_archived"), "sprint_definitions", ["is_archived"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sprint_definitions_is_archived"), table_name="sprint_definitions")
    op.drop_index(op.f("ix_sprint_definitions_end_date"), table_name="sprint_definitions")
    op.drop_index(op.f("ix_sprint_definitions_start_date"), table_name="sprint_definitions")
    op.drop_table("sprint_definitions")
