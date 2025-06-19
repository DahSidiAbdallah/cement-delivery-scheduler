"""Add notes column to deliveries table

Revision ID: add_notes_to_deliveries_manual
Revises: f7af7e451a8c
Create Date: 2025-06-19 13:48:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_notes_to_deliveries_manual'
down_revision = 'f7af7e451a8c'
branch_labels = None
depends_on = None


def upgrade():
    # Add notes column to deliveries table
    with op.batch_alter_table('deliveries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))


def downgrade():
    # Remove notes column from deliveries table
    with op.batch_alter_table('deliveries', schema=None) as batch_op:
        batch_op.drop_column('notes')
