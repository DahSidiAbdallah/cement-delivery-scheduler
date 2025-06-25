"""Add destination to deliveries

Revision ID: 2a1b3c4d5e6f
Revises: 40ea303fc24e
Create Date: 2025-06-19 12:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2a1b3c4d5e6f'
down_revision = '40ea303fc24e'
branch_labels = None
depends_on = None


def upgrade():
    # Add destination column to deliveries table
    op.add_column('deliveries', sa.Column('destination', sa.String(length=255), nullable=False, server_default=''))
    
    # If you need to update existing rows with a default value, you can use:
    # op.execute("UPDATE deliveries SET destination = '' WHERE destination IS NULL")
    # But since we set nullable=False with a server_default, this might not be necessary


def downgrade():
    # Drop the destination column
    op.drop_column('deliveries', 'destination')
