"""initial_migration

Revision ID: 0001_initial
Revises: 
Create Date: 2024-05-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Farmers
    op.create_table('farmers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('language', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_farmers_name'), 'farmers', ['name'], unique=False)
    op.create_index(op.f('ix_farmers_phone'), 'farmers', ['phone'], unique=False)

    # Fields
    op.create_table('fields',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('farmer_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('crop', sa.String(), nullable=True),
        sa.Column('growth_stage', sa.String(), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lon', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['farmer_id'], ['farmers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Sensor Readings
    op.create_table('sensor_readings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('field_id', sa.String(), nullable=True),
        sa.Column('ts', sa.DateTime(), nullable=True),
        sa.Column('moisture', sa.Float(), nullable=True),
        sa.Column('ph', sa.Float(), nullable=True),
        sa.Column('n', sa.Float(), nullable=True),
        sa.Column('p', sa.Float(), nullable=True),
        sa.Column('k', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['field_id'], ['fields.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sensor_readings_field_id'), 'sensor_readings', ['field_id'], unique=False)
    op.create_index(op.f('ix_sensor_readings_ts'), 'sensor_readings', ['ts'], unique=False)

    # Weather Readings
    op.create_table('weather_readings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('field_id', sa.String(), nullable=True),
        sa.Column('ts', sa.DateTime(), nullable=True),
        sa.Column('temp_c', sa.Float(), nullable=True),
        sa.Column('humidity_pct', sa.Float(), nullable=True),
        sa.Column('rainfall_mm', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['field_id'], ['fields.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_weather_readings_field_id'), 'weather_readings', ['field_id'], unique=False)
    op.create_index(op.f('ix_weather_readings_ts'), 'weather_readings', ['ts'], unique=False)

    # Images
    op.create_table('images',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('field_id', sa.String(), nullable=True),
        sa.Column('ts', sa.DateTime(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('rgb_url', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['field_id'], ['fields.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_images_field_id'), 'images', ['field_id'], unique=False)
    op.create_index(op.f('ix_images_ts'), 'images', ['ts'], unique=False)

    # Recommendations
    op.create_table('recommendations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('field_id', sa.String(), nullable=True),
        sa.Column('ts', sa.DateTime(), nullable=True),
        sa.Column('action_json', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('why_json', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['field_id'], ['fields.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recommendations_field_id'), 'recommendations', ['field_id'], unique=False)
    op.create_index(op.f('ix_recommendations_ts'), 'recommendations', ['ts'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recommendations_ts'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_field_id'), table_name='recommendations')
    op.drop_table('recommendations')
    
    op.drop_index(op.f('ix_images_ts'), table_name='images')
    op.drop_index(op.f('ix_images_field_id'), table_name='images')
    op.drop_table('images')
    
    op.drop_index(op.f('ix_weather_readings_ts'), table_name='weather_readings')
    op.drop_index(op.f('ix_weather_readings_field_id'), table_name='weather_readings')
    op.drop_table('weather_readings')
    
    op.drop_index(op.f('ix_sensor_readings_ts'), table_name='sensor_readings')
    op.drop_index(op.f('ix_sensor_readings_field_id'), table_name='sensor_readings')
    op.drop_table('sensor_readings')
    
    op.drop_table('fields')
    
    op.drop_index(op.f('ix_farmers_phone'), table_name='farmers')
    op.drop_index(op.f('ix_farmers_name'), table_name='farmers')
    op.drop_table('farmers')
