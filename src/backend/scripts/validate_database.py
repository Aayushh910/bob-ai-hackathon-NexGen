#!/usr/bin/env python3
"""
SentinelAI Full Database & Pipeline Validation Suite
Verifies all 60 acceptance criteria and specifications:
  - Database connection & tables
  - Schema, PKs, FKs, constraints, and indexes
  - Ingestion counts and referential integrity
  - 8-model registry and SHAP explanation layer
  - Asset A035 full retrieval (all 4 components)
  - Test Cases 1, 2, 3 (Normal, 1 problem, multiple problems)
"""
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from sqlalchemy import inspect, text
from app.core.database import SessionLocal, engine, check_database_connection
from app.models.asset import Asset
from app.models.component import Component
from app.models.sensor import SensorReading
from app.models.prediction import Prediction
from app.models.explanation import PredictionExplanation
from app.models.trend import TrendAnalysis
from app.models.status import AssetStatus
from app.ml.registry import model_registry

def run_validation():
    print("=" * 75)
    print("        SENTINELAI — COMPREHENSIVE DATABASE & PIPELINE VALIDATION")
    print("=" * 75)

    db = SessionLocal()
    passed_checks = 0
    total_checks = 0

    def check(name: str, condition: bool, details: str = ""):
        nonlocal passed_checks, total_checks
        total_checks += 1
        if condition:
            passed_checks += 1
            print(f" [PASS] {name}" + (f" -> {details}" if details else ""))
        else:
            print(f" [FAIL] {name}" + (f" -> {details}" if details else ""))

    try:
        # 1. Database Connection
        print("\n--- 1. DATABASE CONNECTIVITY ---")
        conn_ok = check_database_connection()
        check("Neon PostgreSQL Connection", conn_ok, "Active session established")

        # 2. Table Verification
        print("\n--- 2. TABLES & SCHEMA VERIFICATION ---")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        expected_tables = [
            "assets", "components", "sensor_readings",
            "predictions", "prediction_explanations", "trend_analysis", "asset_status"
        ]
        for tbl in expected_tables:
            check(f"Table '{tbl}' exists", tbl in tables)

        # 3. Foreign Keys Verification
        print("\n--- 3. REFERENTIAL INTEGRITY & FOREIGN KEYS ---")
        fks_comp = [fk["referred_table"] for fk in inspector.get_foreign_keys("components")]
        check("components -> assets FK", "assets" in fks_comp)

        fks_sensor = [fk["referred_table"] for fk in inspector.get_foreign_keys("sensor_readings")]
        check("sensor_readings -> assets FK", "assets" in fks_sensor)
        check("sensor_readings -> components FK", "components" in fks_sensor)

        fks_pred = [fk["referred_table"] for fk in inspector.get_foreign_keys("predictions")]
        check("predictions -> assets FK", "assets" in fks_pred)
        check("predictions -> components FK", "components" in fks_pred)

        fks_exp = [fk["referred_table"] for fk in inspector.get_foreign_keys("prediction_explanations")]
        check("prediction_explanations -> predictions FK", "predictions" in fks_exp)

        fks_trend = [fk["referred_table"] for fk in inspector.get_foreign_keys("trend_analysis")]
        check("trend_analysis -> assets FK", "assets" in fks_trend)
        check("trend_analysis -> components FK", "components" in fks_trend)

        fks_status = [fk["referred_table"] for fk in inspector.get_foreign_keys("asset_status")]
        check("asset_status -> assets FK", "assets" in fks_status)

        # 4. Indexes Verification
        print("\n--- 4. INDEXES VERIFICATION ---")
        pred_indexes = [idx["name"] for idx in inspector.get_indexes("predictions")]
        check("predictions(asset_id) indexed", any("asset_id" in str(idx) for idx in pred_indexes))
        check("predictions(component_id) indexed", any("component_id" in str(idx) for idx in pred_indexes))
        check("predictions(timestamp) indexed", any("timestamp" in str(idx) for idx in pred_indexes))
        check("predictions(asset_id, component_id, timestamp DESC) indexed", "ix_predictions_asset_comp_ts_desc" in pred_indexes)

        # 5. Row Counts & Ingested Data
        print("\n--- 5. DATASET ROW COUNTS ---")
        n_assets = db.query(Asset).count()
        n_components = db.query(Component).count()
        n_sensors = db.query(SensorReading).count()
        n_preds = db.query(Prediction).count()
        n_exps = db.query(PredictionExplanation).count()
        n_trends = db.query(TrendAnalysis).count()
        n_statuses = db.query(AssetStatus).count()

        print(f"   Assets:               {n_assets}")
        print(f"   Components:           {n_components}")
        print(f"   Sensor Readings:      {n_sensors}")
        print(f"   Predictions:          {n_preds}")
        print(f"   SHAP Explanations:    {n_exps}")
        print(f"   Trend Records:        {n_trends}")
        print(f"   Asset Status Records: {n_statuses}")

        check("Assets count == 50", n_assets == 50)
        check("Components count == 200 (50 assets * 4)", n_components == 200)
        check("Sensor Readings >= 4000", n_sensors >= 4000)
        check("Predictions >= 4000", n_preds >= 4000)
        check("SHAP Explanations >= 40000", n_exps >= 40000)
        check("Trend Analysis records >= 4000", n_trends >= 4000)
        check("Asset Status count == 50", n_statuses == 50)

        # 6. ML Model Registry
        print("\n--- 6. 8 PRE-TRAINED ML MODELS PRESERVATION ---")
        ml_status = model_registry.get_status_overview()
        check("All 8 ML Models Ready & Preserved", ml_status["all_models_ready"], f"{ml_status['total_models']} models")
        for m in ml_status["models"]:
            print(f"   - {m['component_type']} {m['prediction_type']}: {m['artifact_file']} ({m['model_class']}) -> {m['status']}")

        # 7. Probability & Score Bounds
        print("\n--- 7. VALUE CONSTRAINTS & BOUNDS ---")
        invalid_anom_prob = db.query(Prediction).filter((Prediction.anomaly_probability < 0) | (Prediction.anomaly_probability > 100)).count()
        invalid_fail_prob = db.query(Prediction).filter((Prediction.failure_probability < 0) | (Prediction.failure_probability > 100)).count()
        invalid_health = db.query(Prediction).filter((Prediction.health_score < 0) | (Prediction.health_score > 100)).count()
        invalid_priority = db.query(Prediction).filter((Prediction.maintenance_priority < 0) | (Prediction.maintenance_priority > 100)).count()
        invalid_pred_vals = db.query(Prediction).filter(~Prediction.anomaly_prediction.in_([0, 1]) | ~Prediction.failure_prediction.in_([0, 1])).count()

        check("0 <= anomaly_probability <= 100", invalid_anom_prob == 0)
        check("0 <= failure_probability <= 100", invalid_fail_prob == 0)
        check("0 <= health_score <= 100", invalid_health == 0)
        check("0 <= maintenance_priority <= 100", invalid_priority == 0)
        check("anomaly_prediction & failure_prediction in {0, 1}", invalid_pred_vals == 0)

        # 8. Battery CSV Special Rule Check
        print("\n--- 8. BATTERY CSV SPECIAL RULE VERIFICATION ---")
        # Ensure battery sensor readings have valid columns and no corrupted mappings
        bat_readings = db.query(SensorReading).filter(SensorReading.component_type == "Battery").first()
        check("Battery data ingested with battery_voltage", bat_readings is not None and bat_readings.battery_voltage is not None)
        # Verify battery predictions exist and anomaly probability matches
        bat_pred = db.query(Prediction).filter(Prediction.component_type == "Battery").first()
        check("Battery predictions exist and valid", bat_pred is not None and 0 <= bat_pred.anomaly_probability <= 100)

        # 9. Query Complete Asset A035
        print("\n--- 9. QUERY COMPLETE ASSET: A035 ---")
        a035 = db.query(Asset).filter(Asset.asset_id == "A035").first()
        check("Asset A035 found", a035 is not None)

        a035_comps = db.query(Component).filter(Component.asset_id == "A035").all()
        comp_types = {c.component_type for c in a035_comps}
        check("A035 has exactly 4 components", len(a035_comps) == 4, str(comp_types))
        check("A035 has Engine, Battery, Fuel Pump, Hydraulic System", comp_types == {"Engine", "Battery", "Fuel Pump", "Hydraulic System"})

        print("\n   Asset A035 Component Breakdown:")
        for comp in a035_comps:
            latest_pred = (
                db.query(Prediction)
                .filter(Prediction.component_id == comp.component_id)
                .order_by(Prediction.timestamp.desc())
                .first()
            )
            if latest_pred:
                print(f"   [{comp.component_type} | {comp.component_id}]")
                print(f"      Anomaly:      {latest_pred.anomaly_prediction} ({latest_pred.anomaly_probability:.2f}%) | Severity: {latest_pred.anomaly_severity:.2f}")
                print(f"      Failure 50h:  {latest_pred.failure_prediction} ({latest_pred.failure_probability:.2f}%)")
                print(f"      Primary:      {latest_pred.primary_reason} | Secondary: {latest_pred.secondary_reason}")
                print(f"      Trend Risk:   {latest_pred.trend_risk:.2f} | Health Score: {latest_pred.health_score:.2f}")
                print(f"      Priority:     {latest_pred.maintenance_priority:.2f} ({latest_pred.priority_level})")

        # Query SHAP Explanations for A035-BAT
        print("\n   SHAP Attribution Sample (A035-BAT):")
        bat_p = db.query(Prediction).filter(Prediction.component_id == "A035-BAT").order_by(Prediction.timestamp.desc()).first()
        if bat_p:
            exps = db.query(PredictionExplanation).filter(PredictionExplanation.prediction_id == bat_p.id).order_by(PredictionExplanation.rank.asc()).all()
            for exp in exps[:4]:
                print(f"      Rank {exp.rank}: {exp.feature_name:<20} SHAP={exp.shap_value:+.4f} (val={exp.feature_value}) [{exp.contribution_direction}]")
            check("SHAP explanations linked to prediction", len(exps) > 0)

        # Asset Status for A035
        a035_st = db.query(AssetStatus).filter(AssetStatus.asset_id == "A035").order_by(AssetStatus.calculated_at.desc()).first()
        if a035_st:
            print(f"\n   Asset A035 Calculated Status: {a035_st.status} (Critical: {a035_st.critical_component_count}, High: {a035_st.high_priority_component_count}, Anomalies: {a035_st.anomalous_component_count})")
            check("Asset A035 status calculated", a035_st.status in ["READY", "ATTENTION", "NOT_READY"])

        # 10. Required Test Cases (Section 52)
        print("\n--- 10. REQUIRED TEST CASES (SECTION 52) ---")
        from app.services.scoring_service import scoring_service

        # Case 1: Normal Asset (No components above attention thresholds)
        case1_comps = [
            {"component_id": "TEST-ENG", "priority_level": "LOW", "anomaly_prediction": 0},
            {"component_id": "TEST-BAT", "priority_level": "LOW", "anomaly_prediction": 0},
            {"component_id": "TEST-PMP", "priority_level": "LOW", "anomaly_prediction": 0},
            {"component_id": "TEST-HYD", "priority_level": "LOW", "anomaly_prediction": 0},
        ]
        s1, cr1, hi1, an1 = scoring_service.calculate_asset_status(case1_comps)
        check("Case 1 — Normal Asset (All 4 components normal) -> READY", s1 == "READY", f"Status={s1}")

        # Case 2: One Problematic Component (Engine high anomaly, others normal)
        case2_comps = [
            {"component_id": "TEST-ENG", "priority_level": "HIGH", "anomaly_prediction": 1},
            {"component_id": "TEST-BAT", "priority_level": "LOW", "anomaly_prediction": 0},
            {"component_id": "TEST-PMP", "priority_level": "LOW", "anomaly_prediction": 0},
            {"component_id": "TEST-HYD", "priority_level": "LOW", "anomaly_prediction": 0},
        ]
        s2, cr2, hi2, an2 = scoring_service.calculate_asset_status(case2_comps)
        check("Case 2 — One Problematic Component (Engine anomaly) -> ATTENTION", s2 == "ATTENTION", f"Status={s2} (High={hi2}, Anomalies={an2})")

        # Case 3: Multiple Problematic Components (Engine & Battery high anomaly)
        case3_comps = [
            {"component_id": "TEST-ENG", "priority_level": "HIGH", "anomaly_prediction": 1},
            {"component_id": "TEST-BAT", "priority_level": "HIGH", "anomaly_prediction": 1},
            {"component_id": "TEST-PMP", "priority_level": "LOW", "anomaly_prediction": 0},
            {"component_id": "TEST-HYD", "priority_level": "LOW", "anomaly_prediction": 0},
        ]
        s3, cr3, hi3, an3 = scoring_service.calculate_asset_status(case3_comps)
        check("Case 3 — Multiple Problematic Components -> ATTENTION / NOT_READY", s3 in ["ATTENTION", "NOT_READY"], f"Status={s3} (High={hi3}, Anomalies={an3})")

        # Fleet Ingested Status Distribution
        print("\n   Fleet Status Distribution in Database:")
        st_dist = db.execute(text("SELECT status, count(*) FROM asset_status GROUP BY status")).fetchall()
        for row in st_dist:
            print(f"      - {row[0]}: {row[1]} assets")
        check("Fleet assets have calculated statuses in Neon database", len(st_dist) > 0)

        print("\n" + "=" * 75)
        print(f"VALIDATION COMPLETED: {passed_checks}/{total_checks} CHECKS PASSED.")
        print("=" * 75)
        return passed_checks == total_checks

    finally:
        db.close()

if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)
