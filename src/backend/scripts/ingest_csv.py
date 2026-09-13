import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.services.ingestion import ingestion_service

def main():
    parser = argparse.ArgumentParser(description="SentinelAI CSV Telemetry Ingestion Pipeline")
    parser.add_argument(
        "--file",
        type=str,
        default=str(backend_dir.parent / "ML" / "Data" / "sensor_data.csv"),
        help="Path to sensor_data.csv"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=2000,
        help="Batch size for database bulk insert (default: 2000)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate without committing to database"
    )

    args = parser.parse_args()

    print("==================================================")
    print("SentinelAI — Telemetry CSV Ingestion")
    print(f"Dataset File : {args.file}")
    print(f"Batch Size   : {args.batch_size}")
    print(f"Dry Run Mode : {args.dry_run}")
    print("==================================================")

    db = SessionLocal()
    try:
        result = ingestion_service.ingest_sensor_csv(
            file_path=args.file,
            db=db,
            batch_size=args.batch_size,
            dry_run=args.dry_run
        )

        print("\n--- INGESTION RESULTS ---")
        print(f"Total Processed       : {result.total_records_processed:,}")
        print(f"Successful Records    : {result.successful_records:,}")
        print(f"Rejected Records      : {result.rejected_records:,}")
        print(f"Duplicate Records     : {result.duplicate_records:,}")
        print(f"Assets Established    : {result.assets_created:,}")
        print(f"Telemetry Inserted    : {result.telemetry_records_inserted:,}")

        if result.rejection_reasons:
            print("\nRejection Breakdown:")
            for reason, count in result.rejection_reasons.items():
                print(f"  - {reason}: {count}")

        if result.errors:
            print("\nErrors encountered:")
            for err in result.errors:
                print(f"  - {err}")

        if result.rejected_records > 0 or result.errors:
            print("\n[WARNING] Some records could not be ingested.")
        else:
            print("\n[SUCCESS] Ingestion completed with 100% data integrity.")

    finally:
        db.close()

if __name__ == "__main__":
    main()
