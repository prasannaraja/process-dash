"""add project foundation

Revision ID: c39d2f7a11f1
Revises: a1f4d8c93e52
Create Date: 2026-03-09 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "c39d2f7a11f1"
down_revision: Union[str, Sequence[str], None] = "a1f4d8c93e52"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("allocation_start_date", sa.Date(), nullable=True),
        sa.Column("allocation_end_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_name"), "projects", ["name"], unique=False)
    op.create_index(op.f("ix_projects_is_active"), "projects", ["is_active"], unique=False)

    op.create_table(
        "project_configurations",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("project_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("default_sprint_duration_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_project_configurations_project_id"), "project_configurations", ["project_id"], unique=False)

    op.create_table(
        "team_members",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("project_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("role", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="CONTRIBUTOR"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_team_members_project_id"), "team_members", ["project_id"], unique=False)
    op.create_index(op.f("ix_team_members_is_active"), "team_members", ["is_active"], unique=False)

    op.create_table(
        "project_contacts",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("project_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("contact_role", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="STAKEHOLDER"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_project_contacts_project_id"), "project_contacts", ["project_id"], unique=False)

    op.create_table(
        "team_allocations",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("project_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("team_member_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("allocation_percentage", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["team_member_id"], ["team_members.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_team_allocations_project_id"), "team_allocations", ["project_id"], unique=False)
    op.create_index(op.f("ix_team_allocations_team_member_id"), "team_allocations", ["team_member_id"], unique=False)

    op.add_column("event_log", sa.Column("project_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column("sprint_definitions", sa.Column("project_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_index(op.f("ix_event_log_project_id"), "event_log", ["project_id"], unique=False)
    op.create_index(op.f("ix_sprint_definitions_project_id"), "sprint_definitions", ["project_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sprint_definitions_project_id"), table_name="sprint_definitions")
    op.drop_index(op.f("ix_event_log_project_id"), table_name="event_log")
    op.drop_column("sprint_definitions", "project_id")
    op.drop_column("event_log", "project_id")

    op.drop_index(op.f("ix_team_allocations_team_member_id"), table_name="team_allocations")
    op.drop_index(op.f("ix_team_allocations_project_id"), table_name="team_allocations")
    op.drop_table("team_allocations")

    op.drop_index(op.f("ix_project_contacts_project_id"), table_name="project_contacts")
    op.drop_table("project_contacts")

    op.drop_index(op.f("ix_team_members_is_active"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_project_id"), table_name="team_members")
    op.drop_table("team_members")

    op.drop_index(op.f("ix_project_configurations_project_id"), table_name="project_configurations")
    op.drop_table("project_configurations")

    op.drop_index(op.f("ix_projects_is_active"), table_name="projects")
    op.drop_index(op.f("ix_projects_name"), table_name="projects")
    op.drop_table("projects")
