"""expand affected_sensor length

Revision ID: b491a0c8d11e
Revises: 3f89cd33e4fa
Create Date: 2026-09-14 23:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b491a0c8d11e'
down_revision = '3f89cd33e4fa'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.alter_column('anomalies', 'affected_sensor',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.VARCHAR(length=255),
               existing_nullable=True)

def downgrade() -> None:
    op.alter_column('anomalies', 'affected_sensor',
               existing_type=sa.VARCHAR(length=255),
               type_=sa.VARCHAR(length=100),
               existing_nullable=True)
