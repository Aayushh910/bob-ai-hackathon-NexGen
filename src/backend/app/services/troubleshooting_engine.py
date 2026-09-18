"""SentinelAI Component-Based Troubleshooting Engine.

Synthesizes factual telemetry, failure probabilities, anomalous sensors,
and maintenance logs from Neon PostgreSQL to generate actionable,
controlled diagnostic check recommendations without hallucinations.
"""

from typing import Any, Dict, List, Optional

# Component-specific standard operational diagnostic check procedures
COMPONENT_DIAGNOSTIC_PROCEDURES: Dict[str, List[str]] = {
    "Engine": [
        "Inspect engine oil level and check viscosity for thermal degradation or dilution.",
        "Check engine mount bolt torque and inspect dampeners for harmonic vibration fatigue.",
        "Inspect coolant circuit, radiator airflow, and thermostat valve operation.",
        "Perform differential oil pressure check across the primary filter for metallic debris.",
    ],
    "Hydraulic System": [
        "Verify hydraulic reservoir fluid level and inspect for fluid foaming or aeration.",
        "Inspect high-pressure hydraulic lines and cylinder rod wiper seals for micro-leaks.",
        "Test primary system relief valve calibration and hydraulic accumulator pre-charge.",
        "Inspect return-line filter particulate indicator for particulate contamination.",
    ],
    "Fuel Pump": [
        "Inspect primary and secondary fuel filter elements for sediment or microbial fouling.",
        "Verify auxiliary pump DC harness voltage and chassis ground continuity.",
        "Conduct dynamic fuel pressure delivery test under sustained operational RPM.",
        "Check pump casing and delivery manifold for cavitation erosion or vapor lock.",
    ],
    "Battery": [
        "Measure terminal resting open-circuit voltage and individual cell specific gravity.",
        "Clean terminal posts, remove oxidation, and apply anti-corrosion dielectric grease.",
        "Test charging alternator diode ripple and regulator set-point under full electrical load.",
        "Inspect master disconnect relay contacts for thermal discoloration or pitting.",
    ],
}

# Sensor-specific diagnostic check procedures
SENSOR_DIAGNOSTIC_PROCEDURES: Dict[str, List[str]] = {
    "temperature": [
        "Inspect cooling ducting and heat exchangers for thermal obstruction.",
        "Verify coolant pump impeller drive and thermal sensor probe calibration.",
    ],
    "vibration": [
        "Perform spectral FFT vibration analysis to isolate bearing pass frequencies.",
        "Check shaft alignment, rotor dynamic balance, and mechanical coupling backlash.",
    ],
    "oil_pressure": [
        "Check oil pressure relief spring tension and scavenge pump drive coupling.",
        "Perform laboratory oil analysis (spectrometric metal particle audit).",
    ],
    "fuel_pressure": [
        "Check low-pressure fuel feed line for suction air leaks or vapor bubbles.",
        "Verify tank boost pump output pressure before high-pressure injection stage.",
    ],
    "hydraulic_pressure": [
        "Inspect variable-displacement pump swashplate servo valve response.",
        "Check hydraulic cooling circuit bypass valve operation.",
    ],
    "battery_voltage": [
        "Check alternator drive belt tension and inspect for pulley slip.",
        "Verify ground strap bonding resistance between engine block and chassis (< 0.05 ohms).",
    ],
}


class TroubleshootingEngine:
    """Generates controlled, factual diagnostic suggestions for assets."""

    def generate_asset_troubleshooting(
        self,
        asset_id: str,
        status: str,
        health_score: float,
        failure_prob: float,
        highest_component: Optional[str] = None,
        primary_reason: Optional[str] = None,
        anomalies: Optional[List[Dict[str, Any]]] = None,
        sensor_readings: Optional[Dict[str, Any]] = None,
        maintenance_records: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes a complete troubleshooting report combining status,
        component failure mode, telemetry anomalies, and sensor deviations.
        """
        recommended_checks: List[str] = []
        contributing_factors: List[str] = []
        directives: List[str] = []

        # 1. Evaluate Failure Risk Posture
        if failure_prob >= 75.0:
            contributing_factors.append(f"Critical breakdown risk: **{failure_prob:.1f}%** 50-hour failure probability")
            directives.append(f"Immediate red-tag lockout. Halt all operational sorties for Asset {asset_id}.")
        elif failure_prob >= 50.0:
            contributing_factors.append(f"Elevated failure trajectory: **{failure_prob:.1f}%** failure probability")
            directives.append("Restrict platform to low-stress secondary missions until maintenance verification.")
        else:
            directives.append("Standard sortie clearance permitted; observe routine interval inspections.")

        # 2. Evaluate Primary Component and Reason
        comp_name = highest_component or "Subsystem"
        if primary_reason and primary_reason != "Nominal operation":
            contributing_factors.append(f"Primary subsystem stress driver: *{primary_reason}*")

        # Component-specific procedures
        matched_procedures = COMPONENT_DIAGNOSTIC_PROCEDURES.get(comp_name)
        if matched_procedures:
            recommended_checks.extend(matched_procedures[:3])
        else:
            recommended_checks.append(f"Perform depot-level diagnostic teardown of {comp_name}.")

        # 3. Evaluate Sensor Readings for Outliers
        if sensor_readings:
            temp = sensor_readings.get("temperature")
            vib = sensor_readings.get("vibration")
            oil_p = sensor_readings.get("oilPressure")
            hyd_p = sensor_readings.get("hydraulicPressure")
            volt = sensor_readings.get("batteryVoltage")

            if temp is not None and temp > 95.0:
                contributing_factors.append(f"Elevated thermal reading: **{temp:.1f} °C** (Nominal: 70–95 °C)")
                recommended_checks.extend(SENSOR_DIAGNOSTIC_PROCEDURES.get("temperature", []))
            if vib is not None and vib > 0.45:
                contributing_factors.append(f"Abnormal vibration amplitude: **{vib:.3f} g** (Nominal: < 0.45 g)")
                recommended_checks.extend(SENSOR_DIAGNOSTIC_PROCEDURES.get("vibration", []))
            if oil_p is not None and (oil_p < 45.0 or oil_p > 65.0):
                contributing_factors.append(f"Oil pressure out of tolerance: **{oil_p:.1f} PSI** (Nominal: 45–65 PSI)")
                recommended_checks.extend(SENSOR_DIAGNOSTIC_PROCEDURES.get("oil_pressure", []))
            if hyd_p is not None and (hyd_p < 2800.0 or hyd_p > 3200.0):
                contributing_factors.append(f"Hydraulic pressure deviation: **{hyd_p:.1f} PSI** (Nominal: 2800–3200 PSI)")
                recommended_checks.extend(SENSOR_DIAGNOSTIC_PROCEDURES.get("hydraulic_pressure", []))
            if volt is not None and (volt < 24.0 or volt > 28.5):
                contributing_factors.append(f"Battery bus voltage irregularity: **{volt:.1f} V** (Nominal: 24–28 V)")
                recommended_checks.extend(SENSOR_DIAGNOSTIC_PROCEDURES.get("battery_voltage", []))

        # 4. Evaluate Active Anomalies
        if anomalies and len(anomalies) > 0:
            top_anom = anomalies[0]
            sensor = top_anom.get("sensor") or "Telemetry"
            severity = top_anom.get("severity") or "HIGH"
            contributing_factors.append(f"Active **{severity}** anomaly logged on `{sensor}` channel")
            recommended_checks.append(f"Cross-calibrate sensor transducer for {sensor} with calibrated ground instrumentation.")

        # 5. Deduplicate and trim recommended checks
        unique_checks: List[str] = []
        for chk in recommended_checks:
            if chk not in unique_checks:
                unique_checks.append(chk)

        # Fallback if no specific checks triggered
        if not unique_checks:
            unique_checks = [
                f"Review recent sensor telemetry trend logs for {asset_id}.",
                "Inspect mechanical linkages and wiring harnesses for signs of physical wear.",
                "Verify sensor baseline calibration against standard operating parameters.",
            ]

        priority_str = "HIGH" if failure_prob >= 75.0 else ("MEDIUM" if failure_prob >= 50.0 else "LOW")
        procedures = [
            {
                "priority": priority_str,
                "component": comp_name,
                "diagnostic_check": chk,
                "telemetry_correlation": contributing_factors[0] if contributing_factors else "Nominal telemetry correlation",
                "operational_directive": directives[0] if directives else "Observe standard maintenance schedule."
            }
            for chk in unique_checks[:5]
        ]

        # Build structured output
        return {
            "assetId": asset_id,
            "status": status,
            "healthScore": health_score,
            "failureProbability": failure_prob,
            "component": comp_name,
            "primaryReason": primary_reason or "Nominal operational telemetry",
            "contributingFactors": contributing_factors,
            "recommendedChecks": unique_checks[:5],
            "directives": directives,
            "procedures": procedures,
        }

    def format_troubleshooting_markdown(self, data: Dict[str, Any]) -> str:
        """Formats troubleshooting analysis into clean, structured Markdown."""
        aid = data["assetId"]
        status = data["status"]
        health = data["healthScore"]
        fail_prob = data["failureProbability"]
        comp = data["component"]
        factors = data.get("contributingFactors", [])
        checks = data.get("recommendedChecks", [])
        directives = data.get("directives", [])

        md = [
            f"## 🛠️ Diagnostic & Troubleshooting Analysis: Asset {aid}\n",
            f"- **Operational Status:** `{status}`",
            f"- **Health Score:** {health:.1f}%",
            f"- **50-Hour Failure Probability:** **{fail_prob:.1f}%**",
            f"- **Target Component:** `{comp}`\n",
        ]

        # Contributing Factors
        if factors:
            md.append("### 🔍 Contributing Telemetry Factors")
            for f in factors:
                md.append(f"- {f}")
            md.append("")

        # Actionable Diagnostic Checks
        md.append("### 📋 Recommended Diagnostic Checks")
        for i, chk in enumerate(checks, 1):
            md.append(f"{i}. {chk}")
        md.append("")

        # Operational Directives
        if directives:
            md.append("### 🚦 Operational Directives")
            for d in directives:
                md.append(f"> ⚠️ {d}")

        return "\n".join(md)


troubleshooting_engine = TroubleshootingEngine()
