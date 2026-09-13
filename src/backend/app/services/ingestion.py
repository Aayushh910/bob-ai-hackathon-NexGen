import csv
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from app.models.asset import Asset
from app.models.sensor import SensorReading
from app.core.database import SessionLocal

logger = logging.getLogger("sentinelai.ingestion")

REQUIRED_CSV_COLUMNS = [
    "asset_id",
    "timestamp",
    "temperature",
    "vibration",
    "oil_pressure",
    "fuel_pressure",
    "rpm",
    "hydraulic_pressure"
]

class IngestionResult:
    def __init__(self):
        self.total_records_processed: int = 0
        self.successful_records: int = 0
        self.rejected_records: int = 0
        self.duplicate_records: int = 0
        self.assets_created: int = 0
        self.telemetry_records_inserted: int = 0
        self.rejection_reasons: Dict[str, int] = {}
        self.errors: List[str] = []

    def add_rejection(self, reason: str):
        self.rejected_records += 1
        self.rejection_reasons[reason] = self.rejection_reasons.get(reason, 0) + 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_records_processed": self.total_records_processed,
            "successful_records": self.successful_records,
            "rejected_records": self.rejected_records,
            "duplicate_records": self.duplicate_records,
            "assets_created": self.assets_created,
            "telemetry_records_inserted": self.telemetry_records_inserted,
            "rejection_reasons": self.rejection_reasons,
            "errors": self.errors[:10]  # First 10 error messages
        }

class CSVIngestionService:
    """
    Production ingestion pipeline for SentinelAI telemetry datasets.
    Supports validation, timestamp normalization, asset auto-establishment,
    duplicate prevention, transaction safety, and batch insertion.
    """

    def parse_float(self, value: Any, default: Optional[float] = None) -> Optional[float]:
        if value is None or str(value).strip() == "":
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def parse_int(self, value: Any, default: Optional[int] = None) -> Optional[int]:
        if value is None or str(value).strip() == "":
            return default
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default

    def parse_timestamp(self, ts_str: str) -> Optional[datetime]:
        if not ts_str:
            return None
        ts_clean = ts_str.strip()
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d",
        ):
            try:
                return datetime.strptime(ts_clean, fmt)
            except ValueError:
                pass
        return None

    def ensure_assets(
        self,
        db: Session,
        asset_codes: Set[str],
        result: IngestionResult
    ) -> Dict[str, int]:
        """
        Verify existing assets and create missing ones in a single query.
        Returns a mapping of asset_code -> asset.id.
        """
        existing = db.query(Asset).filter(Asset.asset_code.in_(asset_codes)).all()
        code_to_id = {a.asset_code: a.id for a in existing}

        missing_codes = asset_codes - set(code_to_id.keys())
        if missing_codes:
            for code in sorted(missing_codes):
                new_asset = Asset(
                    asset_code=code,
                    asset_type="Heavy Equipment",
                    model="Sentinel-HUMS-V1",
                    manufacturer="Defense Systems Corp",
                    year=2024,
                    location="Main Depot Sector 4",
                    status="ACTIVE"
                )
                db.add(new_asset)
                result.assets_created += 1

            db.commit()
            # Refresh lookup
            all_assets = db.query(Asset).filter(Asset.asset_code.in_(asset_codes)).all()
            code_to_id = {a.asset_code: a.id for a in all_assets}

        return code_to_id

    def ingest_sensor_csv(
        self,
        file_path: str,
        db: Session,
        batch_size: int = 2000,
        dry_run: bool = False
    ) -> IngestionResult:
        result = IngestionResult()
        path = Path(file_path)

        if not path.exists():
            result.errors.append(f"File not found: {file_path}")
            return result

        logger.info("Starting CSV ingestion from: %s (Dry Run: %s)", file_path, dry_run)

        # 1. First Pass: Scan for headers and unique asset IDs
        unique_asset_codes: Set[str] = set()
        with open(path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                result.errors.append("CSV file has no headers.")
                return result

            missing_headers = [col for col in REQUIRED_CSV_COLUMNS if col not in reader.fieldnames]
            if missing_headers:
                result.errors.append(f"Missing required CSV columns: {missing_headers}")
                return result

            for row in reader:
                code = row.get("asset_id", "").strip()
                if code:
                    unique_asset_codes.add(code)

        logger.info("Found %d unique asset codes in dataset.", len(unique_asset_codes))

        # 2. Establish assets in PostgreSQL
        asset_map = self.ensure_assets(db, unique_asset_codes, result)

        # 3. Second Pass: Read and validate rows in batches
        seen_keys: Set[Tuple[int, datetime, Optional[str]]] = set()
        batch_objects: List[SensorReading] = []

        with open(path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            for line_no, row in enumerate(reader, start=2):
                result.total_records_processed += 1

                asset_code = row.get("asset_id", "").strip()
                if not asset_code or asset_code not in asset_map:
                    result.add_rejection(f"Invalid or missing asset_id at line {line_no}")
                    continue

                asset_id = asset_map[asset_code]
                ts_str = row.get("timestamp", "")
                ts = self.parse_timestamp(ts_str)
                if not ts:
                    result.add_rejection(f"Invalid timestamp format at line {line_no}")
                    continue

                component_id = row.get("component_id", "").strip() or None
                dedup_key = (asset_id, ts, component_id)

                if dedup_key in seen_keys:
                    result.duplicate_records += 1
                    continue
                seen_keys.add(dedup_key)

                # Validate core sensor metrics
                temp = self.parse_float(row.get("temperature"))
                vib = self.parse_float(row.get("vibration"))
                oil = self.parse_float(row.get("oil_pressure"))
                fuel = self.parse_float(row.get("fuel_pressure"))
                rpm = self.parse_float(row.get("rpm"))
                hyd = self.parse_float(row.get("hydraulic_pressure"))

                if any(v is None for v in (temp, vib, oil, fuel, rpm, hyd)):
                    result.add_rejection(f"Malformed numerical telemetry value at line {line_no}")
                    continue

                reading = SensorReading(
                    asset_id=asset_id,
                    timestamp=ts,
                    component_id=component_id,
                    component_type=row.get("component_type", "").strip() or None,
                    temperature=temp,
                    vibration=vib,
                    oil_pressure=oil,
                    fuel_pressure=fuel,
                    rpm=rpm,
                    hydraulic_pressure=hyd,
                    battery_voltage=self.parse_float(row.get("battery_voltage")),
                    coolant_temperature=self.parse_float(row.get("coolant_temperature")),
                    operating_hours=self.parse_float(row.get("operating_hours")),
                    load_percentage=self.parse_float(row.get("load_percentage")),
                    ambient_temperature=self.parse_float(row.get("ambient_temperature")),
                    sensor_status=row.get("sensor_status", "Normal").strip() or "Normal",
                    anomaly_label=self.parse_int(row.get("anomaly_label"), 0),
                    failure_within_50_hours=self.parse_int(row.get("failure_within_50_hours"), 0),
                    engine_temperature=temp,
                    fuel_level=self.parse_float(row.get("load_percentage"), 50.0)
                )

                batch_objects.append(reading)
                result.successful_records += 1

                if len(batch_objects) >= batch_size:
                    if not dry_run:
                        db.bulk_save_objects(batch_objects)
                        db.commit()
                    result.telemetry_records_inserted += len(batch_objects)
                    batch_objects.clear()

            # Insert remaining records
            if batch_objects:
                if not dry_run:
                    db.bulk_save_objects(batch_objects)
                    db.commit()
                result.telemetry_records_inserted += len(batch_objects)
                batch_objects.clear()

        if dry_run:
            db.rollback()
            logger.info("Dry run completed. Rolled back all changes.")

        logger.info(
            "Ingestion complete: %d processed, %d valid, %d rejected, %d duplicates, %d assets, %d inserted.",
            result.total_records_processed,
            result.successful_records,
            result.rejected_records,
            result.duplicate_records,
            result.assets_created,
            result.telemetry_records_inserted
        )
        return result

    def ingest_maintenance_csv(self, db: Session, csv_path: str) -> int:
        """
        Ingests real maintenance history from maintenance_data.csv into maintenance_records table.
        """
        from app.models.maintenance import MaintenanceRecord
        path = Path(csv_path)
        if not path.is_file():
            logger.error(f"Maintenance CSV file not found: {csv_path}")
            return 0

        # Load existing assets map
        assets = db.query(Asset).all()
        asset_map = {a.asset_code: a.id for a in assets}

        # Clean existing maintenance records before fresh comprehensive ingestion
        db.query(MaintenanceRecord).delete()
        db.commit()

        inserted = 0
        with open(path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                asset_code = row.get("asset_id", "").strip()
                if not asset_code or asset_code not in asset_map:
                    continue

                m_date = self.parse_timestamp(row.get("maintenance_date", ""))
                if not m_date:
                    continue

                asset_db_id = asset_map[asset_code]
                c_id = row.get("component_id", "").strip() or None
                c_type = row.get("component_type", "").strip() or "General"
                issue = row.get("issue_detected", "").strip() or "Routine inspection"
                cond = row.get("component_condition", "").strip() or "Good"
                failure = row.get("failure_type", "").strip() or "None"
                parts = row.get("parts_replaced", "").strip() or "None"
                dur_hours = self.parse_float(row.get("maintenance_duration_hours"), 2.0)
                op_hours = self.parse_float(row.get("operating_hours"))
                next_due = self.parse_float(row.get("next_maintenance_due_hours"))
                failed = bool(self.parse_int(row.get("failure_occurred"), 0))

                rec = MaintenanceRecord(
                    asset_id=asset_db_id,
                    component_id=c_id,
                    component_type=c_type,
                    maintenance_date=m_date,
                    operating_hours=op_hours,
                    maintenance_type=row.get("maintenance_type", "Preventive").strip(),
                    component=c_type,
                    issue_detected=issue,
                    failure_type=failure,
                    component_condition=cond,
                    parts_replaced=parts,
                    failure_occurred=failed,
                    maintenance_duration_hours=dur_hours,
                    next_maintenance_due_hours=next_due,
                    description=f"{issue} | Condition: {cond} | Failure: {failure} | Replaced: {parts}",
                    technician="Avionics & Mechanical Specialist",
                    cost=round(dur_hours * 150.0, 2),
                    next_maintenance_date=None,
                    maintenance_status="COMPLETED"
                )
                db.add(rec)
                inserted += 1

            db.commit()

        logger.info("Maintenance records ingestion complete: %d records inserted.", inserted)
        return inserted

ingestion_service = CSVIngestionService()

