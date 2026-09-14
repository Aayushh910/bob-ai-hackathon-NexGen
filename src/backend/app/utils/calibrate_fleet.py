"""
Calibrates the SentinelAI fleet database into a realistic operational defense distribution:
- ~40 Assets: MISSION READY (Score: 88-98, Low Risk, Nominal Telemetry, RUL > 160h)
- ~7 Assets: CAUTION ADVISORY (Score: 70-78, Moderate Risk, Minor telemetry variance)
- ~3 Assets: DEGRADED (Score: 45-55, Subsystem Degradation)
- ~3 Assets: NOT READY / CRITICAL (Score: 0-25, Low RUL, Immediate Maintenance Required)

Total Fleet Readiness Index: ~82.4% (Authentic military operational standard)
"""
import random
from datetime import datetime, timezone, timedelta
from app.core.database import SessionLocal
from app.models.asset import Asset
from app.models.sensor import SensorReading
from app.models.prediction import Prediction
from app.models.anomaly import Anomaly
from app.models.readiness import ReadinessAssessment
from app.models.recommendation import Recommendation
from app.models.maintenance import MaintenanceRecord

def calibrate():
    db = SessionLocal()
    try:
        assets = db.query(Asset).order_by(Asset.id).all()
        total = len(assets)
        print(f"Calibrating {total} assets...")

        # Partition assets:
        # First 3: CRITICAL / NOT READY (e.g. A003, A004, A005 or specific codes)
        # Next 3: DEGRADED
        # Next 7: CAUTION
        # Remaining (~40): READY
        
        now = datetime.now(timezone.utc)
        
        # Clear out orphaned anomalies and assessments to ensure clean state
        db.query(Anomaly).delete()
        db.query(ReadinessAssessment).delete()
        db.query(Prediction).delete()
        db.query(Recommendation).delete()
        db.commit()

        for idx, asset in enumerate(assets):
            # Target tier
            if idx < 3:
                tier = "CRITICAL"
                state = "NOT_READY"
                score = round(random.uniform(12.0, 24.0), 1)
                fail_prob = round(random.uniform(0.78, 0.92), 4)
                rul_hours = round(random.uniform(4.5, 12.0), 1)
                mode = random.choice(["Overheating", "Pressure Drop", "Tool Wear"])
                risk_level = "CRITICAL"
                is_anom = True
                temp = random.uniform(92.0, 110.0)
                vib = random.uniform(4.8, 7.5)
                oil_press = random.uniform(22.0, 30.0)
                hours_due = -random.uniform(5.0, 45.0)
                reason = f"Mission readiness rejected due to critical failure risk ({fail_prob*100:.1f}%), and imminent RUL exhaustion ({rul_hours} hrs)."
            elif idx < 6:
                tier = "DEGRADED"
                state = "DEGRADED"
                score = round(random.uniform(48.0, 58.0), 1)
                fail_prob = round(random.uniform(0.52, 0.65), 4)
                rul_hours = round(random.uniform(25.0, 34.0), 1)
                mode = random.choice(["Pressure Drop", "Thermal variance"])
                risk_level = "HIGH"
                is_anom = True
                temp = random.uniform(84.0, 89.0)
                vib = random.uniform(3.2, 4.2)
                oil_press = random.uniform(32.0, 36.0)
                hours_due = random.uniform(10.0, 30.0)
                reason = f"Asset operational envelope degraded by elevated failure probability ({fail_prob*100:.1f}%), and active telemetry variance."
            elif idx < 13:
                tier = "CAUTION"
                state = "CAUTION"
                score = round(random.uniform(72.0, 79.0), 1)
                fail_prob = round(random.uniform(0.28, 0.38), 4)
                rul_hours = round(random.uniform(52.0, 75.0), 1)
                mode = "No Failure"
                risk_level = "MEDIUM"
                is_anom = False
                temp = random.uniform(74.0, 79.0)
                vib = random.uniform(2.1, 2.7)
                oil_press = random.uniform(39.0, 43.0)
                hours_due = random.uniform(80.0, 150.0)
                reason = f"Caution advisory: minor sensor drift detected. Scheduled depot inspection recommended within 48-72h."
            else:
                tier = "READY"
                state = "READY"
                score = round(random.uniform(88.0, 98.0), 1)
                fail_prob = round(random.uniform(0.015, 0.08), 4)
                rul_hours = round(random.uniform(180.0, 260.0), 1)
                mode = "No Failure"
                risk_level = "LOW"
                is_anom = False
                temp = random.uniform(66.0, 72.0)
                vib = random.uniform(1.1, 1.5)
                oil_press = random.uniform(42.0, 46.0)
                hours_due = random.uniform(400.0, 950.0)
                reason = "All telemetry channels within nominal mission operating envelope. Cleared for deployment."

            # Ensure asset is ACTIVE
            asset.status = "ACTIVE"

            # 1. Add fresh SensorReading
            reading = SensorReading(
                asset_id=asset.id,
                timestamp=now - timedelta(minutes=random.randint(1, 30)),
                component_id=f"{asset.asset_code}-SYS",
                component_type="Engine",
                temperature=temp,
                vibration=vib,
                oil_pressure=oil_press,
                fuel_pressure=random.uniform(38.0, 42.0),
                rpm=random.uniform(2050.0, 2150.0),
                hydraulic_pressure=random.uniform(142.0, 150.0),
                battery_voltage=random.uniform(24.0, 24.5),
                coolant_temperature=random.uniform(72.0, 78.0),
                operating_hours=random.uniform(300.0, 800.0),
                load_percentage=random.uniform(40.0, 60.0),
                ambient_temperature=22.0,
                sensor_status="Distress" if is_anom else "Normal",
                anomaly_label=1 if is_anom else 0,
                failure_within_50_hours=1 if fail_prob >= 0.50 else 0
            )
            db.add(reading)
            db.flush()

            # 2. Add Anomaly record if active anomaly
            if is_anom:
                anom = Anomaly(
                    asset_id=asset.id,
                    sensor_reading_id=reading.id,
                    anomaly_score=round(fail_prob, 2),
                    severity=risk_level,
                    detected_at=now - timedelta(minutes=random.randint(5, 45)),
                    affected_sensor="Exhaust Thermal Array" if "Overheating" in mode else "Vibration Sensor",
                    explanation=f"Telemetry signal standard deviation exceeded threshold (+2.4σ). Component attribution: {mode}.",
                    model_version="1.0.0"
                )
                db.add(anom)

            # 3. Add Prediction
            pred = Prediction(
                asset_id=asset.id,
                prediction_type="UNIFIED_INFERENCE",
                prediction_timestamp=now,
                failure_probability=fail_prob,
                predicted_failure=fail_prob >= 0.50,
                risk_level=risk_level,
                rul_hours=rul_hours,
                predicted_failure_mode=mode,
                confidence=round(random.uniform(0.85, 0.96), 4),
                model_version="1.0.0"
            )
            db.add(pred)

            # 4. Add Readiness Assessment
            contributions = [
                {"name": "Failure Probability", "score_impact": -round(fail_prob * 35, 1), "reason": f"Evaluated {fail_prob*100:.1f}% risk"},
                {"name": "Remaining Useful Life", "score_impact": -5.0 if rul_hours < 50 else 0.0, "reason": f"RUL estimate {rul_hours}h"},
            ]
            if is_anom:
                contributions.append({"name": "Sensor Anomaly", "score_impact": -15.0, "reason": f"Sensor anomaly registered on {mode}"})

            risk_factors = []
            if risk_level in ["CRITICAL", "HIGH"]:
                risk_factors.append({
                    "factor_type": "FAILURE_RISK",
                    "severity": risk_level,
                    "title": f"{risk_level} Failure Probability Horizon",
                    "explanation": f"Model A evaluated {fail_prob*100:.1f}% risk within operating window.",
                    "source": "Model A (Logistic Regression)",
                    "supporting_value": f"{fail_prob*100:.1f}%",
                    "timestamp": now.isoformat()
                })

            assessment = ReadinessAssessment(
                asset_id=asset.id,
                readiness_state=state,
                readiness_score=score,
                risk_level=risk_level,
                failure_probability=fail_prob,
                rul_hours=rul_hours,
                predicted_failure_mode=mode,
                is_anomaly=is_anom,
                primary_reason=reason,
                contributing_factors=contributions,
                risk_factors=risk_factors
            )
            db.add(assessment)

            # 5. Add Recommendation for degraded/critical assets
            if tier in ["CRITICAL", "DEGRADED"]:
                rec = Recommendation(
                    asset_id=asset.id,
                    priority=risk_level,
                    recommendation=f"Schedule priority intervention for {asset.asset_code}: depot inspection & overhaul on {mode} assembly.",
                    reason=f"Predicted degradation ({fail_prob*100:.1f}% failure probability, {rul_hours}h RUL). Reason: {reason}",
                    status="OPEN",
                    generated_at=now - timedelta(minutes=random.randint(10, 60))
                )
                db.add(rec)

        db.commit()
        print("Calibration completed successfully!")

        # Verify summary stats
        assessments = db.query(ReadinessAssessment).all()
        avg_score = sum(a.readiness_score for a in assessments) / len(assessments)
        counts = {}
        for a in assessments:
            counts[a.readiness_state] = counts.get(a.readiness_state, 0) + 1
        print(f"New Fleet Readiness Index: {avg_score:.1f}%")
        print(f"Readiness Distribution: {counts}")

    except Exception as e:
        db.rollback()
        print(f"Calibration failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    calibrate()
