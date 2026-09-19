import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.asset import Asset
from app.models.component import Component
from app.models.sensor import SensorReading
from app.models.prediction import Prediction
from app.models.explanation import PredictionExplanation
from app.models.trend import TrendAnalysis
from app.models.status import AssetStatus
from app.services.shap_service import shap_service
from app.services.trend_service import trend_service
# Reserved for the future live telemetry ingestion and new-data ML inference phase.
# Not currently called during live user runtime requests because the current release
# operates exclusively on the existing validated HUMS dataset persisted in Neon PostgreSQL.

logger = logging.getLogger("sentinelai.services.ingestion")

SENSOR_COLUMNS = [
    "temperature",
    "vibration",
    "oil_pressure",
    "fuel_pressure",
    "rpm",
    "hydraulic_pressure",
    "battery_voltage",
    "coolant_temperature",
    "operating_hours",
    "load_percentage",
    "ambient_temperature",
    "sensor_status",
]

TEST_CSV_DEFINITIONS = [
    {"filename": "engine_test.csv", "component_type": "Engine"},
    {"filename": "battery_test.csv", "component_type": "Battery"},
    {"filename": "fuel_pump_test.csv", "component_type": "Fuel Pump"},
    {"filename": "hydraulic_system_test.csv", "component_type": "Hydraulic System"},
]

def _resolve_data_dir() -> Path:
    base = Path(__file__).resolve()
    candidates = [
        base.parent.parent.parent.parent / "ML" / "Data",
        base.parent.parent.parent.parent / "src" / "ML" / "Data",
        base.parent.parent.parent / "ML" / "Data",
        base.parent.parent.parent / "src" / "ML" / "Data",
        Path.cwd() / "src" / "ML" / "Data",
        Path.cwd() / "ML" / "Data",
        Path("d:/bob-ai-hackathon-NexGen/src/ML/Data"),
    ]
    for cand in candidates:
        if cand.exists() and (cand / "engine_test.csv").exists():
            return cand
    return base.parent.parent.parent.parent / "src" / "ML" / "Data"

def parse_iso_or_custom_timestamp(ts_val: Any) -> datetime:
    """Parses timestamp strings into timezone-aware UTC datetime."""
    if isinstance(ts_val, datetime):
        if ts_val.tzinfo is None:
            return ts_val.replace(tzinfo=timezone.utc)
        return ts_val.astimezone(timezone.utc)

    ts_str = str(ts_val).strip()
    formats = [
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(ts_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    # Fallback to dateutil/pandas
    dt = pd.to_datetime(ts_str, dayfirst=True).to_pydatetime()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class TelemetryIngestionPipeline:
    """
    Production-grade, idempotent CSV ingestion pipeline for HUMS telemetry and predictions.
    Preserves strict ingestion order:
      1. assets
      2. components
      3. sensor_readings
      4. predictions
      5. prediction_explanations
      6. trend_analysis
      7. asset_status
    """

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = Path(data_dir or _resolve_data_dir())

    def run_full_ingestion(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """Runs the complete ingestion for all 4 test datasets."""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        stats = {
            "assets_inserted": 0,
            "components_inserted": 0,
            "sensor_readings_inserted": 0,
            "predictions_inserted": 0,
            "explanations_inserted": 0,
            "trend_records_inserted": 0,
            "asset_status_records": 0,
            "files_processed": [],
            "errors": [],
        }

        try:
            # 1. Collect and preprocess all datasets
            loaded_dfs = []
            for item in TEST_CSV_DEFINITIONS:
                fname = item["filename"]
                ctype = item["component_type"]
                fpath = self.data_dir / fname
                if not fpath.exists():
                    # Check alternate names (e.g. hydraulic_test.csv)
                    if "hydraulic" in fname:
                        alt_path = self.data_dir / "hydraulic_test.csv"
                        if alt_path.exists():
                            fpath = alt_path

                if not fpath.exists():
                    msg = f"Test dataset not found: {fname} at {fpath}"
                    logger.error(msg)
                    stats["errors"].append(msg)
                    continue

                logger.info(f"Reading dataset: {fpath}")
                df = pd.read_csv(fpath)

                # Special Rule for Battery CSV:
                # The Battery prediction CSV has an additional last column. It must be IGNORED completely.
                if ctype == "Battery" or "battery" in fname.lower():
                    logger.info("Applying Battery CSV Special Rule: Dropping final column completely.")
                    df = df.iloc[:, :-1]

                df["source_file"] = fname
                df["component_type"] = ctype
                df["parsed_timestamp"] = df["timestamp"].apply(parse_iso_or_custom_timestamp)
                loaded_dfs.append((ctype, fname, df))
                stats["files_processed"].append(fname)

            if not loaded_dfs:
                raise RuntimeError("No datasets available for ingestion.")

            # 2. Ingest Assets (Step 1)
            all_asset_ids = set()
            for _, _, df in loaded_dfs:
                all_asset_ids.update(df["asset_id"].unique())

            logger.info(f"Processing {len(all_asset_ids)} unique assets...")
            existing_assets = {a[0] for a in db.query(Asset.asset_id).all()}
            new_assets = []
            for aid in all_asset_ids:
                if aid not in existing_assets:
                    new_assets.append(Asset(
                        asset_id=aid,
                        asset_name=f"Tactical Asset {aid}",
                        asset_type="Ground Vehicle"
                    ))
            if new_assets:
                db.bulk_save_objects(new_assets)
                db.commit()
            stats["assets_inserted"] = len(all_asset_ids)

            # 3. Ingest Components (Step 2)
            unique_components = {}
            for ctype, _, df in loaded_dfs:
                for _, row in df[["component_id", "asset_id", "component_type"]].drop_duplicates().iterrows():
                    unique_components[row["component_id"]] = (row["asset_id"], row["component_type"])

            logger.info(f"Processing {len(unique_components)} unique components...")
            existing_components = {c[0] for c in db.query(Component.component_id).all()}
            new_components = []
            for cid, (aid, ctype) in unique_components.items():
                if cid not in existing_components:
                    new_components.append(Component(
                        component_id=cid,
                        asset_id=aid,
                        component_type=ctype
                    ))
            if new_components:
                db.bulk_save_objects(new_components)
                db.commit()
            stats["components_inserted"] = len(unique_components)

            # 4. Ingest Sensor Readings & Trend Analysis & Predictions (Steps 3-6)
            total_readings = 0
            total_predictions = 0
            total_explanations = 0
            total_trends = 0

            for ctype, fname, df in loaded_dfs:
                logger.info(f"Processing telemetry & predictions for {ctype} ({len(df)} rows)...")

                # Prepare feature DF for SHAP
                drop_feat_cols = [
                    "asset_id", "timestamp", "component_id", "component_type",
                    "failure_within_50_hours", "failure_probability_percent",
                    "anomalies_percentage", "anomaly_probability_percent", "anomaly_label",
                    "sensor_status", "source_file", "parsed_timestamp"
                ]
                df_features = df.drop(columns=[c for c in drop_feat_cols if c in df.columns])

                # Calculate SHAP explanations for this batch
                shap_results = shap_service.explain_batch(ctype, df_features)

                # Process trend evaluation per component history
                trend_records_map = {}
                for comp_id, group in df.groupby("component_id"):
                    trend_res = trend_service.evaluate_component_series(ctype, group)
                    for idx, row_trend in enumerate(trend_res):
                        orig_idx = group.index[idx]
                        trend_records_map[orig_idx] = row_trend

                # Prepare batch objects
                readings_to_insert = []
                predictions_to_insert = []
                trend_to_insert = []

                # Fetch existing prediction keys to ensure idempotency
                existing_pred_keys = {
                    (p[0], p[1], p[2])
                    for p in db.query(Prediction.asset_id, Prediction.component_id, Prediction.timestamp)
                    .filter(Prediction.component_type == ctype).all()
                }

                existing_sensor_keys = {
                    (s[0], s[1], s[2])
                    for s in db.query(SensorReading.asset_id, SensorReading.component_id, SensorReading.timestamp)
                    .filter(SensorReading.component_type == ctype).all()
                }

                for idx, row in df.iterrows():
                    aid = row["asset_id"]
                    cid = row["component_id"]
                    ts = row["parsed_timestamp"]

                    # 3. Sensor Reading
                    sensor_key = (aid, cid, ts)
                    if sensor_key not in existing_sensor_keys:
                        s_record = {
                            "timestamp": ts,
                            "asset_id": aid,
                            "component_id": cid,
                            "component_type": ctype,
                            "temperature": float(row["temperature"]) if pd.notnull(row.get("temperature")) else None,
                            "vibration": float(row["vibration"]) if pd.notnull(row.get("vibration")) else None,
                            "oil_pressure": float(row["oil_pressure"]) if pd.notnull(row.get("oil_pressure")) else None,
                            "fuel_pressure": float(row["fuel_pressure"]) if pd.notnull(row.get("fuel_pressure")) else None,
                            "rpm": float(row["rpm"]) if pd.notnull(row.get("rpm")) else None,
                            "hydraulic_pressure": float(row["hydraulic_pressure"]) if pd.notnull(row.get("hydraulic_pressure")) else None,
                            "battery_voltage": float(row["battery_voltage"]) if pd.notnull(row.get("battery_voltage")) else None,
                            "coolant_temperature": float(row["coolant_temperature"]) if pd.notnull(row.get("coolant_temperature")) else None,
                            "operating_hours": float(row["operating_hours"]) if pd.notnull(row.get("operating_hours")) else None,
                            "load_percentage": float(row["load_percentage"]) if pd.notnull(row.get("load_percentage")) else None,
                            "ambient_temperature": float(row["ambient_temperature"]) if pd.notnull(row.get("ambient_temperature")) else None,
                            "sensor_status": str(row["sensor_status"]) if pd.notnull(row.get("sensor_status")) else "Normal",
                            "source_file": fname,
                        }
                        readings_to_insert.append(s_record)

                    # 4. Prediction & Scoring
                    pred_key = (aid, cid, ts)
                    if pred_key not in existing_pred_keys:
                        # Extract failure prediction
                        fail_prob = float(row.get("failure_probability_percent", 0.0))
                        fail_pred = int(row.get("failure_within_50_hours", 1 if fail_prob > 40.0 else 0))

                        # Extract anomaly prediction
                        anom_prob = float(row.get("anomalies_percentage", row.get("anomaly_probability_percent", 0.0)))
                        if "anomaly_label" in row and pd.notnull(row["anomaly_label"]):
                            anom_pred = int(row["anomaly_label"])
                        else:
                            anom_pred = 1 if anom_prob > 40.0 else 0

                        # Trend Risk
                        t_data = trend_records_map.get(idx, {})
                        trend_risk_val = t_data.get("trend_risk", 20.0)

                        # Health & Priority
                        anom_sev = scoring_service.calculate_anomaly_severity(anom_prob)
                        h_score = scoring_service.calculate_health_score(fail_prob, anom_sev, trend_risk_val)
                        p_score, p_level = scoring_service.calculate_maintenance_priority(fail_prob, anom_sev, trend_risk_val)

                        # SHAP attribution
                        shap_info = shap_results[idx] if idx < len(shap_results) else {}
                        prim_reason = shap_info.get("primary_reason")
                        sec_reason = shap_info.get("secondary_reason")

                        pred_record = {
                            "timestamp": ts,
                            "asset_id": aid,
                            "component_id": cid,
                            "component_type": ctype,
                            "anomaly_prediction": anom_pred,
                            "anomaly_probability": anom_prob,
                            "failure_prediction": fail_pred,
                            "failure_probability": fail_prob,
                            "primary_reason": prim_reason,
                            "secondary_reason": sec_reason,
                            "anomaly_severity": anom_sev,
                            "trend_risk": trend_risk_val,
                            "health_score": h_score,
                            "maintenance_priority": p_score,
                            "priority_level": p_level,
                            "model_version": "1.0.0",
                            "source_file": fname,
                            "_shap_explanations": shap_info.get("explanations", []),
                        }
                        predictions_to_insert.append(pred_record)

                        # Trend record
                        trend_to_insert.append({
                            "asset_id": aid,
                            "component_id": cid,
                            "timestamp": ts,
                            "trend_risk": trend_risk_val,
                            "rate_of_change": t_data.get("rate_of_change"),
                            "persistence_score": t_data.get("persistence_score"),
                            "degradation_score": t_data.get("degradation_score"),
                            "multi_sensor_score": t_data.get("multi_sensor_score"),
                        })

                # Bulk insert sensor readings
                if readings_to_insert:
                    db.bulk_insert_mappings(SensorReading, readings_to_insert)
                    db.commit()
                    total_readings += len(readings_to_insert)

                # Bulk insert trend analysis
                if trend_to_insert:
                    db.bulk_insert_mappings(TrendAnalysis, trend_to_insert)
                    db.commit()
                    total_trends += len(trend_to_insert)

                # Insert predictions and link explanations
                if predictions_to_insert:
                    logger.info(f"Inserting {len(predictions_to_insert)} predictions and SHAP explanations...")
                    batch_size = 250
                    for b_start in range(0, len(predictions_to_insert), batch_size):
                        batch = predictions_to_insert[b_start : b_start + batch_size]
                        pred_objs = []
                        exps_list = []
                        for item in batch:
                            shap_exps = item.pop("_shap_explanations", [])
                            pred_obj = Prediction(**item)
                            db.add(pred_obj)
                            pred_objs.append(pred_obj)
                            exps_list.append(shap_exps)

                        db.flush()  # Populates ALL pred_obj.id in a single round-trip!

                        exp_mappings = []
                        for pred_obj, shap_exps in zip(pred_objs, exps_list):
                            for exp in shap_exps:
                                exp_mappings.append({
                                    "prediction_id": pred_obj.id,
                                    "feature_name": exp["feature_name"],
                                    "shap_value": exp["shap_value"],
                                    "feature_value": exp.get("feature_value"),
                                    "contribution_direction": exp.get("contribution_direction"),
                                    "rank": exp.get("rank")
                                })

                        if exp_mappings:
                          db.bulk_insert_mappings(
                              PredictionExplanation, exp_mappings
                          )
                          total_explanations += len(exp_mappings)

                        db.commit()
                    total_predictions += len(predictions_to_insert)

            stats["sensor_readings_inserted"] = total_readings
            stats["predictions_inserted"] = total_predictions
            stats["explanations_inserted"] = total_explanations
            stats["trend_records_inserted"] = total_trends

            # 5. Ingest Asset Status (Step 7)
            logger.info("Computing current operational status for all assets...")
            # For each asset, find the latest prediction of each component
            status_count = 0
            all_assets = db.query(Asset.asset_id).all()
            for (aid,) in all_assets:
                # Query latest predictions for this asset's components
                subq = (
                    db.query(
                        Prediction.component_id,
                        Prediction.component_type,
                        Prediction.anomaly_prediction,
                        Prediction.priority_level,
                        Prediction.timestamp
                    )
                    .filter(Prediction.asset_id == aid)
                    .order_by(Prediction.component_id, Prediction.timestamp.desc())
                    .all()
                )

                # Keep only the latest prediction per component
                latest_by_comp = {}
                for cid, ctype, anom_pred, p_level, ts in subq:
                    if cid not in latest_by_comp:
                        latest_by_comp[cid] = {
                            "component_id": cid,
                            "component_type": ctype,
                            "anomaly_prediction": anom_pred,
                            "priority_level": p_level,
                            "timestamp": ts
                        }

                comp_list = list(latest_by_comp.values())
                status, crit_c, high_c, anom_c = scoring_service.calculate_asset_status(comp_list)

                # Record asset status
                db.add(AssetStatus(
                    asset_id=aid,
                    status=status,
                    critical_component_count=crit_c,
                    high_priority_component_count=high_c,
                    anomalous_component_count=anom_c,
                    calculated_at=datetime.now(timezone.utc)
                ))
                status_count += 1

            db.commit()
            stats["asset_status_records"] = status_count
            logger.info(f"Ingestion completed successfully: {stats}")
            return stats

        except Exception as e:
            db.rollback()
            logger.error(f"Ingestion pipeline failed: {e}", exc_info=True)
            stats["errors"].append(str(e))
            raise
        finally:
            if should_close:
                db.close()

ingestion_pipeline = TelemetryIngestionPipeline()
ingestion_service = ingestion_pipeline
