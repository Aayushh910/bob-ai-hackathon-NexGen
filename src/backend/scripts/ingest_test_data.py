#!/usr/bin/env python3
"""
SentinelAI Telemetry & Prediction Ingestion CLI
Loads:
  - engine_test.csv
  - battery_test.csv (drops final column)
  - fuel_pump_test.csv
  - hydraulic_system_test.csv
Into Neon PostgreSQL following strict foreign-key order:
  1. assets
  2. components
  3. sensor_readings
  4. predictions
  5. prediction_explanations
  6. trend_analysis
  7. asset_status
"""
import sys
import time
from pathlib import Path

# Add backend root to sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.database import check_database_connection, SessionLocal
from app.services.ingestion import ingestion_pipeline

def main():
    print("=" * 70)
    print("        SENTINELAI — NEON POSTGRESQL INGESTION PIPELINE")
    print("=" * 70)

    print("\n1. Verifying database connection...")
    if not check_database_connection():
        print("[ERROR] Could not connect to Neon PostgreSQL. Check DATABASE_URL in .env.")
        sys.exit(1)
    print("[SUCCESS] Connected to Neon PostgreSQL.")

    print("\n2. Executing ingestion pipeline...")
    t0 = time.time()
    db = SessionLocal()
    try:
        results = ingestion_pipeline.run_full_ingestion(db=db)
        elapsed = time.time() - t0

        print("\n" + "=" * 70)
        print("                  INGESTION SUMMARY STATISTICS")
        print("=" * 70)
        print(f"Files Processed:           {', '.join(results.get('files_processed', []))}")
        print(f"Assets Ingested:           {results.get('assets_inserted', 0)}")
        print(f"Components Ingested:       {results.get('components_inserted', 0)}")
        print(f"Sensor Readings Ingested:  {results.get('sensor_readings_inserted', 0)}")
        print(f"Predictions Ingested:      {results.get('predictions_inserted', 0)}")
        print(f"SHAP Explanations Saved:   {results.get('explanations_inserted', 0)}")
        print(f"Trend Analysis Records:    {results.get('trend_records_inserted', 0)}")
        print(f"Asset Status Evaluated:    {results.get('asset_status_records', 0)}")
        print(f"Total Execution Time:      {elapsed:.2f} seconds")
        print("=" * 70)

        if results.get("errors"):
            print("[WARNING] Warnings/Errors encountered:")
            for err in results["errors"]:
                print(f"  - {err}")
        else:
            print("[SUCCESS] Ingestion completed with zero errors.")

    except Exception as e:
        print(f"[FATAL ERROR] Ingestion failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
