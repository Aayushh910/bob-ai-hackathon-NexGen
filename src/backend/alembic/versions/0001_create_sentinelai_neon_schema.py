"""create sentinelai neon schema

Revision ID: 0001_initial_neon
Revises: 
Create Date: 2026-09-18 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_neon'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. assets table
    op.create_table(
        'assets',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('asset_id', sa.String(length=50), nullable=False),
        sa.Column('asset_name', sa.String(length=100), nullable=True),
        sa.Column('asset_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_id', name='uq_assets_asset_id')
    )
    op.create_index('ix_assets_id', 'assets', ['id'], unique=False)
    op.create_index('ix_assets_asset_id', 'assets', ['asset_id'], unique=True)

    # 2. components table
    op.create_table(
        'components',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('component_id', sa.String(length=50), nullable=False),
        sa.Column('asset_id', sa.String(length=50), nullable=False),
        sa.Column('component_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id'], ondelete='CASCADE', name='fk_components_asset_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('component_id', name='uq_components_component_id')
    )
    op.create_index('ix_components_id', 'components', ['id'], unique=False)
    op.create_index('ix_components_component_id', 'components', ['component_id'], unique=True)
    op.create_index('ix_components_asset_id', 'components', ['asset_id'], unique=False)
    op.create_index('ix_components_component_type', 'components', ['component_type'], unique=False)

    # 3. sensor_readings table
    op.create_table(
        'sensor_readings',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('asset_id', sa.String(length=50), nullable=False),
        sa.Column('component_id', sa.String(length=50), nullable=False),
        sa.Column('component_type', sa.String(length=50), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('vibration', sa.Float(), nullable=True),
        sa.Column('oil_pressure', sa.Float(), nullable=True),
        sa.Column('fuel_pressure', sa.Float(), nullable=True),
        sa.Column('rpm', sa.Float(), nullable=True),
        sa.Column('hydraulic_pressure', sa.Float(), nullable=True),
        sa.Column('battery_voltage', sa.Float(), nullable=True),
        sa.Column('coolant_temperature', sa.Float(), nullable=True),
        sa.Column('operating_hours', sa.Float(), nullable=True),
        sa.Column('load_percentage', sa.Float(), nullable=True),
        sa.Column('ambient_temperature', sa.Float(), nullable=True),
        sa.Column('sensor_status', sa.String(length=50), nullable=True),
        sa.Column('source_file', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id'], ondelete='CASCADE', name='fk_sensor_readings_asset_id'),
        sa.ForeignKeyConstraint(['component_id'], ['components.component_id'], ondelete='CASCADE', name='fk_sensor_readings_comp_id'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sensor_readings_id', 'sensor_readings', ['id'], unique=False)
    op.create_index('ix_sensor_readings_asset_id', 'sensor_readings', ['asset_id'], unique=False)
    op.create_index('ix_sensor_readings_component_id', 'sensor_readings', ['component_id'], unique=False)
    op.create_index('ix_sensor_readings_timestamp', 'sensor_readings', ['timestamp'], unique=False)
    op.create_index('ix_sensor_readings_asset_timestamp', 'sensor_readings', ['asset_id', 'timestamp'], unique=False)
    op.create_index('ix_sensor_readings_comp_ts_desc', 'sensor_readings', ['component_id', sa.text('timestamp DESC')], unique=False)

    # 4. predictions table
    op.create_table(
        'predictions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('asset_id', sa.String(length=50), nullable=False),
        sa.Column('component_id', sa.String(length=50), nullable=False),
        sa.Column('component_type', sa.String(length=50), nullable=False),
        sa.Column('anomaly_prediction', sa.Integer(), nullable=False),
        sa.Column('anomaly_probability', sa.Float(), nullable=False),
        sa.Column('failure_prediction', sa.Integer(), nullable=False),
        sa.Column('failure_probability', sa.Float(), nullable=False),
        sa.Column('primary_reason', sa.Text(), nullable=True),
        sa.Column('secondary_reason', sa.Text(), nullable=True),
        sa.Column('anomaly_severity', sa.Float(), nullable=True),
        sa.Column('trend_risk', sa.Float(), nullable=True),
        sa.Column('health_score', sa.Float(), nullable=True),
        sa.Column('maintenance_priority', sa.Float(), nullable=True),
        sa.Column('priority_level', sa.String(length=50), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('source_file', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id'], ondelete='CASCADE', name='fk_predictions_asset_id'),
        sa.ForeignKeyConstraint(['component_id'], ['components.component_id'], ondelete='CASCADE', name='fk_predictions_comp_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_id', 'component_id', 'timestamp', name='uq_predictions_asset_comp_ts'),
        sa.CheckConstraint('anomaly_prediction IN (0, 1)', name='chk_pred_anomaly_prediction'),
        sa.CheckConstraint('anomaly_probability >= 0 AND anomaly_probability <= 100', name='chk_pred_anomaly_prob'),
        sa.CheckConstraint('failure_prediction IN (0, 1)', name='chk_pred_failure_prediction'),
        sa.CheckConstraint('failure_probability >= 0 AND failure_probability <= 100', name='chk_pred_failure_prob'),
        sa.CheckConstraint('anomaly_severity IS NULL OR (anomaly_severity >= 0 AND anomaly_severity <= 100)', name='chk_pred_anomaly_severity'),
        sa.CheckConstraint('trend_risk IS NULL OR (trend_risk >= 0 AND trend_risk <= 100)', name='chk_pred_trend_risk'),
        sa.CheckConstraint('health_score IS NULL OR (health_score >= 0 AND health_score <= 100)', name='chk_pred_health_score'),
        sa.CheckConstraint('maintenance_priority IS NULL OR (maintenance_priority >= 0 AND maintenance_priority <= 100)', name='chk_pred_maint_priority')
    )
    op.create_index('ix_predictions_id', 'predictions', ['id'], unique=False)
    op.create_index('ix_predictions_asset_id', 'predictions', ['asset_id'], unique=False)
    op.create_index('ix_predictions_component_id', 'predictions', ['component_id'], unique=False)
    op.create_index('ix_predictions_component_type', 'predictions', ['component_type'], unique=False)
    op.create_index('ix_predictions_timestamp', 'predictions', ['timestamp'], unique=False)
    op.create_index('ix_predictions_anomaly_prediction', 'predictions', ['anomaly_prediction'], unique=False)
    op.create_index('ix_predictions_failure_prediction', 'predictions', ['failure_prediction'], unique=False)
    op.create_index('ix_predictions_priority_level', 'predictions', ['priority_level'], unique=False)
    op.create_index('ix_predictions_asset_comp_ts_desc', 'predictions', ['asset_id', 'component_id', sa.text('timestamp DESC')], unique=False)

    # 5. prediction_explanations table
    op.create_table(
        'prediction_explanations',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('prediction_id', sa.BigInteger(), nullable=False),
        sa.Column('feature_name', sa.String(length=100), nullable=False),
        sa.Column('shap_value', sa.Float(), nullable=False),
        sa.Column('feature_value', sa.Float(), nullable=True),
        sa.Column('contribution_direction', sa.String(length=20), nullable=True),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prediction_id'], ['predictions.id'], ondelete='CASCADE', name='fk_pred_explanations_pred_id'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_prediction_explanations_id', 'prediction_explanations', ['id'], unique=False)
    op.create_index('ix_prediction_explanations_pred_id', 'prediction_explanations', ['prediction_id'], unique=False)
    op.create_index('ix_prediction_explanations_pred_rank', 'prediction_explanations', ['prediction_id', 'rank'], unique=False)

    # 6. trend_analysis table
    op.create_table(
        'trend_analysis',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('asset_id', sa.String(length=50), nullable=False),
        sa.Column('component_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('trend_risk', sa.Float(), nullable=False),
        sa.Column('rate_of_change', sa.Float(), nullable=True),
        sa.Column('persistence_score', sa.Float(), nullable=True),
        sa.Column('degradation_score', sa.Float(), nullable=True),
        sa.Column('multi_sensor_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id'], ondelete='CASCADE', name='fk_trend_analysis_asset_id'),
        sa.ForeignKeyConstraint(['component_id'], ['components.component_id'], ondelete='CASCADE', name='fk_trend_analysis_comp_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('trend_risk >= 0 AND trend_risk <= 100', name='chk_trend_risk_range')
    )
    op.create_index('ix_trend_analysis_id', 'trend_analysis', ['id'], unique=False)
    op.create_index('ix_trend_analysis_asset_id', 'trend_analysis', ['asset_id'], unique=False)
    op.create_index('ix_trend_analysis_component_id', 'trend_analysis', ['component_id'], unique=False)
    op.create_index('ix_trend_analysis_timestamp', 'trend_analysis', ['timestamp'], unique=False)
    op.create_index('ix_trend_analysis_comp_ts_desc', 'trend_analysis', ['component_id', sa.text('timestamp DESC')], unique=False)

    # 7. asset_status table
    op.create_table(
        'asset_status',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('asset_id', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('critical_component_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('high_priority_component_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('anomalous_component_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id'], ondelete='CASCADE', name='fk_asset_status_asset_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('READY', 'ATTENTION', 'NOT_READY')", name='chk_asset_status_allowed')
    )
    op.create_index('ix_asset_status_id', 'asset_status', ['id'], unique=False)
    op.create_index('ix_asset_status_asset_id', 'asset_status', ['asset_id'], unique=False)
    op.create_index('ix_asset_status_status', 'asset_status', ['status'], unique=False)
    op.create_index('ix_asset_status_asset_calc_desc', 'asset_status', ['asset_id', sa.text('calculated_at DESC')], unique=False)

def downgrade() -> None:
    op.drop_table('asset_status')
    op.drop_table('trend_analysis')
    op.drop_table('prediction_explanations')
    op.drop_table('predictions')
    op.drop_table('sensor_readings')
    op.drop_table('components')
    op.drop_table('assets')
