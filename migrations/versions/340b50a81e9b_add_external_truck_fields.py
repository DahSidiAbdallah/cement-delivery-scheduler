"""Add external truck fields

Revision ID: 340b50a81e9b
Revises: 
Create Date: 2025-07-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '340b50a81e9b'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('deliveries') as batch_op:
        batch_op.add_column(sa.Column('external_truck_label', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('is_external', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade():
    with op.batch_alter_table('deliveries') as batch_op:
        batch_op.drop_column('is_external')
        batch_op.drop_column('external_truck_label')
