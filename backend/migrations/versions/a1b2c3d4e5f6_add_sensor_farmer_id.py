"""add_sensor_farmer_id

Revision ID: a1b2c3d4e5f6
Revises: 85784f52a7f8
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '85784f52a7f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sensors', sa.Column('farmer_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_sensors_farmer_id'), 'sensors', ['farmer_id'], unique=False)
    op.create_foreign_key('fk_sensors_farmer_id', 'sensors', 'farmers', ['farmer_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_sensors_farmer_id', 'sensors', type_='foreignkey')
    op.drop_index(op.f('ix_sensors_farmer_id'), table_name='sensors')
    op.drop_column('sensors', 'farmer_id')
