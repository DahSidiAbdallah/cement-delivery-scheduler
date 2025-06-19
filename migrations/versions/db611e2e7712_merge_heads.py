"""merge heads

Revision ID: db611e2e7712
Revises: add_notes_to_deliveries_manual, d081aec894e4
Create Date: 2025-06-19 13:49:32.947179

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'db611e2e7712'
down_revision = ('add_notes_to_deliveries_manual', 'd081aec894e4')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
