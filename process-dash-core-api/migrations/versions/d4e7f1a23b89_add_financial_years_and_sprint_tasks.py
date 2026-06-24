"""add financial_years and sprint_tasks

Revision ID: d4e7f1a23b89
Revises: ab95e433868c
Create Date: 2026-06-23 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e7f1a23b89'
down_revision = 'ab95e433868c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # financial_years — org-level, one active at a time
    op.create_table(
        'financial_years',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('label', sa.String, nullable=False),          # e.g. "FY 2025-26"
        sa.Column('start_date', sa.String, nullable=False),     # YYYY-MM-DD
        sa.Column('end_date', sa.String, nullable=False),
        sa.Column('org_goal', sa.Text, nullable=True),
        sa.Column('prev_year_feedback', sa.Text, nullable=True),
        sa.Column('is_current', sa.Boolean, default=False),
        sa.Column('created_at', sa.String, nullable=True),
    )

    # sprint_tasks — lightweight checklist items per sprint
    op.create_table(
        'sprint_tasks',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('sprint_id', sa.String, nullable=False, index=True),
        sa.Column('title', sa.String, nullable=False),
        sa.Column('is_done', sa.Boolean, default=False),
        sa.Column('created_at', sa.String, nullable=True),
        sa.Column('updated_at', sa.String, nullable=True),
    )

    # link projects to financial year
    op.add_column('projects', sa.Column('financial_year_id', sa.String, nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'financial_year_id')
    op.drop_table('sprint_tasks')
    op.drop_table('financial_years')
