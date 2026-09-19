"""Semantic Intent Classification and Paraphrase Understanding Engine for SentinelAI.

Understands natural language and paraphrases across diverse phrasings, synonyms,
abbreviations, informal language, typos, incomplete queries, and conversational follow-ups.
Does not depend on exact keyword matching or rigid sentence structures.
"""

import re
import difflib
import logging
from typing import Any, Dict, List, Optional, Tuple, Set

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.schemas.chat import ChatMessage
from app.services.ibm_bob_client import ibm_bob_client

logger = logging.getLogger("sentinelai.semantic_intent")


# ─── DOMAIN DICTIONARY & SYNONYMS ─────────────────────────────────────────────

# Domain abbreviations mapped to expanded semantic equivalents
DOMAIN_ABBREVIATIONS: Dict[str, str] = {
    "fmc": "fully mission capable ready operational",
    "nmc": "not mission capable grounded unready down",
    "pmc": "partially mission capable attention degraded",
    "or rate": "operational readiness rate",
    "or": "operational readiness",
    "rul": "remaining useful life operating hours life exhaustion",
    "hums": "health and usage monitoring system telemetry sensors anomalies",
    "shap": "root cause explanation feature importance diagnostics",
    "pm": "preventive scheduled maintenance servicing",
    "cm": "corrective maintenance repair overhaul",
    "sortie": "mission deployment operational sortie",
    "sorties": "mission deployments operational sorties",
    "birds": "assets vehicles aircraft",
    "iron": "assets vehicles machinery platforms",
    "rigs": "assets vehicles machinery platforms",
    "hulls": "assets vehicles platforms",
    "unit": "asset vehicle machine",
    "units": "assets vehicles machines",
    "platform": "asset vehicle machine",
    "platforms": "assets vehicles machines",
    "machine": "asset vehicle machine",
    "machines": "assets vehicles machines",
}

# Common spelling mistakes and domain typos mapped to canonical terms
COMMON_TYPOS: Dict[str, str] = {
    "rediness": "readiness",
    "readyness": "readiness",
    "readines": "readiness",
    "redy": "ready",
    "anomoly": "anomaly",
    "anomolies": "anomalies",
    "anomly": "anomaly",
    "anomalys": "anomalies",
    "annomaly": "anomaly",
    "maintanance": "maintenance",
    "maintenence": "maintenance",
    "maintenace": "maintenance",
    "maintanence": "maintenance",
    "servicing": "servicing",
    "servis": "service",
    "critcal": "critical",
    "critcality": "criticality",
    "critcaly": "critically",
    "falure": "failure",
    "failur": "failure",
    "failiure": "failure",
    "faillure": "failure",
    "probablity": "probability",
    "probabilty": "probability",
    "proberbility": "probability",
    "hydralic": "hydraulic",
    "hydralics": "hydraulics",
    "telematry": "telemetry",
    "telemtery": "telemetry",
    "temprature": "temperature",
    "vibrashun": "vibration",
    "vibraton": "vibration",
    "presure": "pressure",
    "subsystem": "subsystem",
    "sub-system": "subsystem",
    "diagnoze": "diagnose",
    "diagnos": "diagnose",
}

# Domain semantic synonym clusters for concept normalization
SYNONYM_REPLACEMENTS: List[Tuple[re.Pattern, str]] = [
    # Grounded / Unready synonyms (must match before ready synonyms!)
    (re.compile(r"\b(non[- ]mission capable|not mission capable|not mission[- ]ready|not combat[- ]ready|not operational|not ready|non[- ]operational|sidelined|out of action|inoperative|benched|dead in the water|cannot deploy|can't deploy|unable to deploy|unfit to deploy|prevented from deploying|unfit to fly|offline)\b", re.IGNORECASE), "grounded unready unavailable nmc"),
    # Ready / Operational synonyms
    (re.compile(r"\b(good to go|fit for flight|cleared for duty|combat ready|mission capable|up and running|deployable|cleared to fly|cleared for sortie)\b", re.IGNORECASE), "ready operational deployable fmc"),
    # Breakdown / Failure risk synonyms
    (re.compile(r"\b(blow up|crap out|crapping out|conk out|break down|bust|wear out|fall apart|catastrophic failure)\b", re.IGNORECASE), "failure breakdown failure probability at risk"),
    # Anomaly / Glitch synonyms
    (re.compile(r"\b(glitching out|glitching|acting up|going crazy|funky|out of whack|sensor glitch|erratic reading|weird telemetry)\b", re.IGNORECASE), "anomaly anomalous sensor deviation outlier"),
    # Maintenance / Servicing synonyms
    (re.compile(r"\b(turn a wrench|wrench turned|wrench turn|lube and tune|oil change|depot overhaul|scheduled servicing|tune up)\b", re.IGNORECASE), "maintenance servicing scheduled maintenance repair"),
    # Diagnostic / Troubleshoot synonyms
    (re.compile(r"\b(what is wrong with|what's wrong with|what happened to|why is .+ down|why is .+ broken|why is .+ degraded|what's the issue with|what is the issue with)\b", re.IGNORECASE), "diagnose explain root cause why unready"),
    # Urgent / Attention synonyms
    (re.compile(r"\b(red alert|burning fires|fire drill|drop everything|top urgent|emergency queue)\b", re.IGNORECASE), "immediate attention critical urgent"),
]

# Canonical vocabulary for fuzzy spelling correction of longer domain tokens
CANONICAL_DOMAIN_VOCABULARY = [
    "readiness", "operational", "grounded", "critical", "anomaly", "anomalies",
    "telemetry", "maintenance", "servicing", "overdue", "failure", "probability",
    "component", "subsystem", "hydraulic", "vibration", "temperature", "pressure",
    "diagnosis", "diagnostics", "interventions", "breakdown", "exhaustion",
    "useful", "directive", "recommendation", "deteriorating", "improving"
]


# ─── TRAINING / FEW-SHOT EXEMPLAR BANK FOR 15 CAPABILITIES ───────────────────

CAPABILITY_EXEMPLARS: Dict[str, List[str]] = {
    "FLEET_STATUS": [
        "What is the current fleet readiness?",
        "How many assets are ready?",
        "How many vehicles are good to go?",
        "What's our current fleet readiness?",
        "How many platforms can be deployed?",
        "Tell me the current operational readiness",
        "What is happening across the fleet?",
        "Give me the operational picture",
        "What is our overall mission readiness?",
        "What percentage of our fleet is operational?",
        "How is the fleet readiness looking today?",
        "Fleet status summary",
        "Readiness overview",
        "How many units are cleared for combat?",
        "Are the vehicles mission capable?",
        "What is the fleet health index?",
        "How many total platforms are mission ready?",
        "Fleet operational posture",
        "Readiness count across the inventory",
        "What is the total operational capability of our fleet?",
        "Give me a status check on our entire force",
        "How ready is our equipment?",
        "Fleet readiness score",
        "How many assets can deploy right now?",
        "Show me general fleet readiness statistics",
        "Overall status of our fleet inventory",
        "Operational readiness count",
        "Are our rigs in good shape?",
        "FMC platform count",
        "What is our overall OR rate?",
    ],
    "NOT_READY_ASSETS": [
        "Which assets are NOT mission-ready?",
        "What assets are grounded?",
        "Which assets are unready?",
        "Which vehicles are down?",
        "Are any machines out of action?",
        "Show me sidelined platforms",
        "Grounded equipment list",
        "Which units cannot deploy?",
        "List all inoperative platforms",
        "Which platforms are NMC non mission capable?",
        "Assets that failed pre-flight inspection",
        "Show unready assets",
        "Which platforms are benched?",
        "Any vehicles sidelined right now?",
        "Assets prevented from deploying on sorties",
        "Which assets are unavailable for missions?",
        "Units currently grounded in depot",
        "List of dead or offline platforms",
        "Which machines are not mission ready?",
        "Which iron is sidelined?",
        "Are any platforms unfit to fly?",
        "Which vehicles failed readiness standards?",
    ],
    "CRITICAL_ASSETS": [
        "Which assets need immediate attention?",
        "Which assets are critical?",
        "What are the top urgent assets?",
        "Most critical problems right now",
        "Where are our red-level emergencies?",
        "Urgent priority platforms",
        "What needs urgent intervention?",
        "Assets with critical priority status",
        "Top danger list across the fleet",
        "Which platforms require immediate depot attention?",
        "High severity asset issues",
        "Immediate attention queue",
        "Which units are in critical condition?",
        "Who needs emergency triage?",
        "Show most critical assets requiring commander attention",
        "Highest priority damaged assets",
        "Red alert critical assets list",
    ],
    "FAILURE_RISK": [
        "Which assets have highest failure risk?",
        "What assets have high failure probability?",
        "Which assets are at risk of breakdown?",
        "What's about to blow up?",
        "Highest breakdown probability",
        "Which units are close to failing?",
        "Assets most likely to fail within 50 hours",
        "Predict impending catastrophic breakdown",
        "Which platforms have the worst failure odds?",
        "High risk of breakdown across the fleet",
        "Rank assets by failure probability",
        "Prognostic failure risk ranking",
        "Which machines are on the verge of breaking down?",
        "Top components about to conk out",
        "Prognostic failure odds over 50 hours",
        "Who is predicted to crash or fail mechanically?",
    ],
    "ANOMALIES": [
        "Which assets have active anomalies?",
        "What sensor anomalies are detected?",
        "Are there any telemetry anomalies?",
        "Sensor telemetry glitching out",
        "Any abnormal sensor readings?",
        "Irregular telemetry detections",
        "Sensors acting up",
        "Statistical outliers in sensor feeds",
        "Which vehicles show abnormal telemetry patterns?",
        "HUMS sensor deviations",
        "Unusual vibration or heat spikes",
        "Telemetry irregularities across platforms",
        "Outlier telemetry detections",
        "Sensor anomaly alerts",
        "Which machines have abnormal sensor signals?",
        "Erratic sensor behavior detected",
    ],
    "LOW_RUL": [
        "Which assets have low RUL?",
        "What assets are running out of operating hours?",
        "Which assets have depleted remaining useful life?",
        "Platforms running low on useful hours",
        "Imminent life exhaustion",
        "Who is running out of time before overhaul?",
        "Depleted RUL inventory",
        "Remaining operating hours critically low",
        "Units nearing expiration of service life",
        "Assets with lowest remaining hours",
        "Exhausted remaining life",
        "Shortest remaining useful lifespan",
        "Hours left before component death",
        "Which components have minimal RUL remaining?",
    ],
    "MAINTENANCE_REQUIRED": [
        "Which assets require maintenance?",
        "What maintenance actions are needed?",
        "Which assets need servicing?",
        "Who needs a wrench turned?",
        "Scheduled servicing backlog",
        "Pending repairs list",
        "Platforms requiring depot intervention",
        "Corrective maintenance queue",
        "Vehicles waiting for mechanic servicing",
        "Which machines need parts replaced?",
        "Maintenance actions necessary across fleet",
        "Who is waiting for preventive maintenance?",
        "Repair queue for fleet vehicles",
    ],
    "OVERDUE_MAINTENANCE": [
        "Which assets are overdue for maintenance?",
        "What assets are past due for servicing?",
        "Machines that missed their scheduled service",
        "Overdue PM checks",
        "Assets past their maintenance interval",
        "Delinquent maintenance inspections",
        "Who exceeded the service window?",
        "Lapsed maintenance schedule",
        "Past due PM on the line",
        "Which vehicles operated past recommended overhaul hours?",
    ],
    "INTERVENTIONS": [
        "Which maintenance actions are critical?",
        "What maintenance interventions should be prioritized?",
        "Top priority maintenance interventions",
        "Actionable repairs ranked by urgency",
        "Intervention schedule for degraded components",
        "Prioritize our maintenance actions",
        "Which interventions are highest priority?",
        "Urgent maintenance tasks and directives",
    ],
    "READINESS_TRENDS": [
        "How is fleet readiness changing?",
        "Which assets are deteriorating?",
        "What is the fleet readiness trend?",
        "Is overall readiness improving or degrading?",
        "Trajectory of fleet posture",
        "Are our vehicles getting worse over time?",
        "Historical trend trajectory",
        "Is telemetry deteriorating or stabilizing?",
        "4-signal trend analysis across the fleet",
        "Readiness trend line over recent sorties",
    ],
    "RECENT_CHANGES": [
        "What changed recently?",
        "What changed since the previous assessment?",
        "What are recent operational events?",
        "Latest state transitions",
        "Recent logged activity across the fleet",
        "What happened since the last check?",
        "Recent predictions and state updates",
        "Recent telemetry events log",
    ],
    "ASSET_EXPLANATION": [
        "What's wrong with A021?",
        "Why is A021 down?",
        "Check A021",
        "Why can't A021 deploy?",
        "What's the issue with platform A021?",
        "Diagnose unit 21",
        "Why is machine A021 degraded?",
        "Root cause for A021 failure",
        "Why did A021 get grounded?",
        "What caused A021 to fail?",
        "Investigate A021",
        "Inspect A021",
        "Audit platform A021",
        "What is broken on A021?",
        "Why is vehicle A021 not mission-ready?",
        "Give diagnostic explanation for A021",
        "Why did platform A021 fail inspection?",
        "Troubleshoot A021",
        "Explain degradation of A021",
    ],
    "ASSET_MAINTENANCE": [
        "When should asset A001 be serviced?",
        "What component needs attention on A001?",
        "Maintenance backlog for A021",
        "Service requirements for machine 21",
        "Does A021 need an overhaul?",
        "When is A021 due for scheduled maintenance?",
        "Parts replacement needed for A021",
        "What repairs are scheduled for A021?",
        "Depot maintenance timeline for A021",
    ],
    "ASSET_STATUS": [
        "What is the status of asset A001?",
        "Tell me about A002",
        "Asset details for A005",
        "Check status of platform 21",
        "How is A021 looking?",
        "A021 dossier",
        "Give me telemetry details on A021",
        "Show health score for A021",
        "Operational readiness of A021",
        "Current posture of vehicle 21",
        "Inspection report on A021",
        "Full telemetry read on A021",
        "Is A021 ready?",
    ],
    "RECOMMENDED_ACTION": [
        "What should be done for asset A002?",
        "What operational directives are pending?",
        "Recommended fix for A021",
        "What action plan is prescribed?",
        "Mitigation steps for A021",
        "What directives should commanders issue?",
        "Recommended actions for degraded units",
        "What should we do about critical components?",
        "Suggested maintenance and command directives",
    ],
}


class SemanticUnderstandingEngine:
    """Enterprise semantic intent classifier, entity extractor, and paraphrase engine."""

    def __init__(self):
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._char_vectorizer: Optional[TfidfVectorizer] = None
        self._exemplar_intents: List[str] = []
        self._exemplar_texts: List[str] = []
        self._exemplar_tfidf: Optional[np.ndarray] = None
        self._exemplar_char_tfidf: Optional[np.ndarray] = None
        self._init_semantic_exemplars()

    def _init_semantic_exemplars(self):
        """Initializes and precomputes TF-IDF vector matrices for fast cosine similarity."""
        intents_list = []
        texts_list = []

        for intent, queries in CAPABILITY_EXEMPLARS.items():
            for q in queries:
                normalized = self.normalize_text(q)
                intents_list.append(intent)
                texts_list.append(normalized)

        self._exemplar_intents = intents_list
        self._exemplar_texts = texts_list

        # Word-level n-grams (1 to 2 words) with English stop words and sublinear term-frequency scaling
        self._vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            analyzer="word",
            stop_words="english",
            lowercase=True,
        )
        self._exemplar_tfidf = self._vectorizer.fit_transform(texts_list)

        # Character-level n-grams (3 to 5 chars) with word-boundary awareness for typos/abbreviations
        self._char_vectorizer = TfidfVectorizer(
            ngram_range=(3, 5),
            sublinear_tf=True,
            analyzer="char_wb",
            lowercase=True,
        )
        self._exemplar_char_tfidf = self._char_vectorizer.fit_transform(texts_list)
        logger.info("Initialized SemanticUnderstandingEngine with %d exemplar queries across %d capabilities.", len(texts_list), len(CAPABILITY_EXEMPLARS))

    # ─── TEXT NORMALIZATION, TYPOS & SYNONYMS ─────────────────────────────────

    def normalize_text(self, text_str: str) -> str:
        """Applies synonym mapping, typo correction, and abbreviation expansion."""
        if not text_str:
            return ""

        q = text_str.lower().strip()

        # 1. Expand complex multi-word phrase synonyms first
        for pattern, replacement in SYNONYM_REPLACEMENTS:
            q = pattern.sub(replacement, q)

        # 2. Tokenize and normalize words, abbreviations, and spelling errors
        tokens = re.findall(r"[a-zA-Z0-9#\-_]+", q)
        normalized_tokens: List[str] = []

        for token in tokens:
            # Check domain abbreviation
            if token in DOMAIN_ABBREVIATIONS:
                normalized_tokens.append(DOMAIN_ABBREVIATIONS[token])
                continue

            # Check known typos
            if token in COMMON_TYPOS:
                normalized_tokens.append(COMMON_TYPOS[token])
                continue

            # Fuzzy spelling correction for longer domain words (length >= 5)
            if len(token) >= 5 and not token.startswith("a") and not token.isdigit():
                matches = difflib.get_close_matches(token, CANONICAL_DOMAIN_VOCABULARY, n=1, cutoff=0.82)
                if matches:
                    normalized_tokens.append(matches[0])
                    continue

            normalized_tokens.append(token)

        normalized_sentence = " ".join(normalized_tokens)
        return normalized_sentence

    # ─── MULTI-PATTERN ENTITY EXTRACTION ──────────────────────────────────────

    def extract_asset_entities(
        self, text_str: str, history: Optional[List[ChatMessage]] = None
    ) -> Tuple[Optional[str], List[str]]:
        """
        Extracts asset identifiers across numerous notations:
        - A021, A1, a021, a21, A-21, A_21, A 21, A00021
        - asset 21, asset #21, asset A021
        - vehicle 21, vehicle #021, vehicle A21
        - platform 21, platform A021, platform #21
        - machine 21, machine A021
        - unit 21, unit #21, unit A021
        Also resolves coreferences and follow-up pronouns ('it', 'that one', 'first one') from history.
        """
        if not text_str:
            return None, []

        codes: List[str] = []
        raw = text_str.strip()

        # Pattern 1: Direct 'A' or 'a' followed by dash/space/none and 1-6 digits
        # Matches: A021, a021, A-21, a-021, A_21, A 21
        matches_direct = re.findall(r"\b[aA][-_ ]?(\d{1,6})\b", raw)
        for m in matches_direct:
            num = int(m)
            code = f"A{num:03d}"
            if code not in codes:
                codes.append(code)

        # Pattern 2: Explicit noun followed by optional number or A-code
        # Matches: "asset 21", "asset #21", "platform A021", "unit 21", "vehicle 21", "machine 021"
        matches_nouns = re.findall(
            r"\b(?:asset|platform|vehicle|machine|unit)[-_\s#]*([aA]?[-_ ]?\d{1,6})\b",
            raw,
            re.IGNORECASE,
        )
        for m in matches_nouns:
            clean_m = re.sub(r"[aA\-_\s#]", "", m)
            if clean_m.isdigit():
                num = int(clean_m)
                code = f"A{num:03d}"
                if code not in codes:
                    codes.append(code)

        # Pattern 3: Short standalone queries like "A021?", "A21", "021" if explicitly prompted
        if not codes and re.match(r"^[aA]?\d{1,3}\??$", raw.strip()):
            num_str = re.sub(r"[^\d]", "", raw)
            if num_str:
                num = int(num_str)
                codes.append(f"A{num:03d}")

        if codes:
            return codes[0], codes

        # ─── Coreference & Conversational Context Resolution ───
        if not history:
            return None, []

        q_lower = text_str.lower().strip()

        # Scope reset check: explicit fleet-wide queries should not inherit asset context
        scope_resets = [
            "all assets", "show assets", "list assets", "fleet inventory", "fleet status",
            "fleet readiness", "how many ready", "readiness count", "across the fleet",
            "overall picture", "system settings", "general overview"
        ]
        if any(sr in q_lower for sr in scope_resets):
            return None, []

        # Find historical asset mentions in recent history
        all_recent_codes: List[str] = []
        for turn in reversed(history[-4:]):
            content = turn.content if hasattr(turn, "content") else str(turn)
            historical_primary, historical_all = self.extract_asset_entities(content, history=None)
            for c in historical_all:
                if c not in all_recent_codes:
                    all_recent_codes.append(c)

        if not all_recent_codes:
            return None, []

        # 1. Ordinal markers
        if any(w in q_lower for w in ["first one", "1st one", "first asset", "first unit", "the first"]):
            return all_recent_codes[0], [all_recent_codes[0]]
        if any(w in q_lower for w in ["second one", "2nd one", "second asset", "second unit", "the second"]):
            if len(all_recent_codes) >= 2:
                return all_recent_codes[1], [all_recent_codes[1]]
        if any(w in q_lower for w in ["last one", "last asset", "the last"]):
            return all_recent_codes[-1], [all_recent_codes[-1]]

        # 2. Referential pronouns & markers
        referential_markers = [
            "it", "its", "that asset", "this asset", "the asset", "that machine", "this machine",
            "that platform", "this platform", "that vehicle", "this vehicle", "that unit", "this unit",
            "that one", "this one", "the same one", "same asset", "about that", "about it"
        ]
        tokens = set(re.findall(r"\b\w+\b", q_lower))
        has_referential_marker = any(m in q_lower for m in referential_markers) or bool(tokens.intersection({"it", "its", "that", "this"}))

        # 3. Follow-up intent questions without explicit subject
        followup_markers = [
            "why", "why?", "how to fix", "troubleshoot", "what to do", "what checks", "what action",
            "diagnostics", "sensors", "telemetry", "temperature", "vibration", "pressure", "rpm",
            "maintenance", "repairs", "trend", "getting worse", "is it at risk", "tell me more",
            "explain", "details", "check", "inspect", "audit", "status", "health", "ready?"
        ]
        has_followup_marker = any(m in q_lower for m in followup_markers)

        if has_referential_marker or has_followup_marker:
            return all_recent_codes[0], all_recent_codes

        return None, []

    # ─── SEMANTIC INTENT CLASSIFICATION ───────────────────────────────────────

    def classify_intent_llm(self, query: str, asset_code: Optional[str] = None) -> Optional[Tuple[str, float]]:
        """
        Few-shot guided LLM semantic understanding via IBM Bob / Granite.
        Returns (intent, confidence) or None if unconfigured / timed out.
        """
        if not ibm_bob_client.is_configured:
            return None

        prompt = f"""You are the SentinelAI Operational Semantic Intent Classifier.
Your task is to understand what the user means, regardless of unique wording, informal language, abbreviations, or sentence structure.

CLASSIFICATION RULES:
1. Map the user query to exactly ONE of these SentinelAI capabilities:
- FLEET_STATUS: Fleet-wide readiness, deployability count, overall posture (e.g. "How many vehicles are good to go?", "What's our operational readiness?").
- NOT_READY_ASSETS: Sidelined, unready, grounded, or down assets (e.g. "What assets are grounded?", "Which iron is red?").
- CRITICAL_ASSETS: Urgent attention queue, severe risk assets (e.g. "Which assets need immediate attention?", "Where are emergencies?").
- FAILURE_RISK: Highest failure probability, impending mechanical breakdown (e.g. "Which assets have highest failure risk?", "What's about to blow up?").
- ANOMALIES: Sensor telemetry deviations, glitches, statistical outliers (e.g. "Which assets have active anomalies?", "Sensor telemetry glitching out").
- LOW_RUL: Depleted remaining useful life, running out of hours (e.g. "Which assets have low RUL?", "Who is running out of operating hours?").
- MAINTENANCE_REQUIRED: Maintenance queue, pending repairs, servicing needs (e.g. "Which assets require maintenance?", "Who needs a wrench turned?").
- OVERDUE_MAINTENANCE: Exceeded service intervals, past due servicing (e.g. "Which assets are overdue for maintenance?").
- INTERVENTIONS: Ranked priority maintenance actions (e.g. "Which maintenance actions are critical?").
- READINESS_TRENDS: Trajectory of readiness over time (e.g. "How is fleet readiness changing?", "Which assets are deteriorating?").
- RECENT_CHANGES: Recent state transitions and operational events (e.g. "What changed recently?").
- ASSET_EXPLANATION: Single asset root-cause diagnosis or reason for being down (e.g. "What's wrong with A021?", "Check A021", "Why is A021 down?").
- ASSET_MAINTENANCE: Single asset servicing schedule and components (e.g. "When should asset A001 be serviced?").
- ASSET_STATUS: Single asset comprehensive telemetry and posture (e.g. "Status of A021", "Tell me about A002").
- RECOMMENDED_ACTION: Operational directives or mitigation actions (e.g. "What should be done for A002?").
- UNKNOWN: Completely unrelated or out-of-domain query (e.g. "What is the weather in Tokyo?").

QUERY TO CLASSIFY: "{query}"
EXTRACTED ASSET CODE: {asset_code or "None"}

Respond strictly with a JSON object:
{{"intent": "<INTENT_NAME>", "confidence": <float between 0.0 and 1.0>}}"""

        try:
            response_text = ibm_bob_client.generate_chat_response(
                user_query=prompt,
                context_block="",
                history=[],
                system_prompt="You are a strict JSON operational intent classifier."
            )
            if response_text:
                import json
                match = re.search(r"\{.*\}", response_text, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    intent = parsed.get("intent", "").strip().upper()
                    conf = float(parsed.get("confidence", 0.90))
                    if intent in CAPABILITY_EXEMPLARS or intent == "UNKNOWN":
                        return intent, conf
        except Exception as exc:
            logger.debug("LLM semantic classification fallback: %s", exc)

        return None

    def classify_intent_semantic(
        self,
        query: str,
        asset_id: Optional[int] = None,
        history: Optional[List[ChatMessage]] = None,
    ) -> Tuple[str, float, Optional[str]]:
        """
        Classifies query into a SentinelAI capability using semantic meaning:
        1. Multi-pattern entity extraction (including history inheritance).
        2. LLM few-shot semantic classification (if configured).
        3. High-performance hybrid TF-IDF n-gram vector cosine similarity across exemplar clusters.
        4. Domain concept scoring and threshold calibration.
        Returns: (intent, confidence, asset_code)
        """
        if not query or not query.strip():
            return "UNKNOWN", 0.0, None

        raw_query = query.strip()
        asset_code, _ = self.extract_asset_entities(raw_query, history=history)
        has_asset = bool(asset_code or asset_id)

        # Normalize query with synonyms, abbreviations, and typo corrections
        norm_query = self.normalize_text(raw_query)

        # 1. First attempt LLM semantic classification if configured
        llm_result = self.classify_intent_llm(raw_query, asset_code)
        if llm_result:
            intent, conf = llm_result
            # Validate asset-specific intents require an asset
            if intent in ("ASSET_EXPLANATION", "ASSET_MAINTENANCE", "ASSET_STATUS", "RECOMMENDED_ACTION") and not asset_code and not asset_id:
                pass  # Fall through to semantic vector classification to verify
            else:
                return intent, conf, asset_code

        # 2. Vectorized Semantic Cosine Similarity Classification
        # Word-level TF-IDF similarity
        query_vec = self._vectorizer.transform([norm_query])
        word_sims = cosine_similarity(query_vec, self._exemplar_tfidf)[0]

        # Character n-gram TF-IDF similarity (robust to typos and slight morphological variations)
        char_query_vec = self._char_vectorizer.transform([norm_query])
        char_sims = cosine_similarity(char_query_vec, self._exemplar_char_tfidf)[0]

        # Blended similarity score (60% word n-gram, 40% char n-gram)
        blended_sims = 0.60 * word_sims + 0.40 * char_sims

        # Out-of-domain guard: queries without assets, without domain concepts, and with low word similarity
        max_word_sim = float(np.max(word_sims)) if len(word_sims) > 0 else 0.0
        has_domain_signals = any(
            w in norm_query for w in [
                "readiness", "ready", "grounded", "critical", "urgent", "attention",
                "failure", "breakdown", "probability", "risk", "anomaly", "anomalies",
                "sensor", "telemetry", "rul", "useful life", "maintenance", "service",
                "servicing", "overdue", "intervention", "trend", "deteriorat", "improving",
                "changed", "asset", "platform", "vehicle", "unit", "machine", "fleet",
                "status", "posture", "directive", "action", "hums", "fmc", "nmc", "sortie",
                "sorties", "birds", "iron", "rigs", "hulls", "why", "check", "diagnos"
            ]
        )
        if not has_asset and not has_domain_signals and max_word_sim < 0.18:
            return "UNKNOWN", 0.0, None

        # Aggregate similarity scores by intent (taking top-3 mean per intent)
        intent_scores: Dict[str, float] = {}
        for intent in CAPABILITY_EXEMPLARS:
            intent_indices = [idx for idx, it in enumerate(self._exemplar_intents) if it == intent]
            if not intent_indices:
                continue
            scores = [blended_sims[idx] for idx in intent_indices]
            scores.sort(reverse=True)
            top_scores = scores[:3]
            intent_scores[intent] = float(np.mean(top_scores))

        # 3. Targeted Concept & Entity Context Tuning
        has_asset = bool(asset_code or asset_id)
        q_tokens = set(re.findall(r"\b\w+\b", norm_query.lower()))

        # If asset is present, evaluate single-asset operational intents
        if has_asset:
            # 1. Telemetry / Readings / Health / Dossier / Status
            status_triggers = {"status", "tell me", "details", "health", "state", "how is", "dossier", "reading", "readings", "telemetry", "pressure", "vibration", "temperature", "sensor", "sensors", "rpm", "voltage"}
            if any(t in norm_query for t in status_triggers) or q_tokens.intersection(status_triggers):
                intent_scores["ASSET_STATUS"] = max(intent_scores.get("ASSET_STATUS", 0.0), 0.95)

            # 2. Incomplete single asset query e.g. "A021?", "Platform 21"
            clean_raw = raw_query.strip("?!. ")
            non_status_triggers = [
                "why", "wrong", "broken", "issue", "down", "fix", "diagnose", "diag", "inspect",
                "investigate", "audit", "troubleshoot", "check", "explain", "service", "servicing",
                "maintenance", "overhaul", "repair", "action", "recommend", "directive", "mitigate"
            ]
            if len(clean_raw.split()) <= 3 and not any(w in clean_raw.lower() for w in non_status_triggers):
                intent_scores["ASSET_STATUS"] = max(intent_scores.get("ASSET_STATUS", 0.0), 0.95)

            # 3. Diagnostic / Troubleshooting / Why / Check intent
            diag_triggers = {"why", "wrong", "reason", "down", "issue", "cause", "broken", "degraded",
                             "not ready", "unready", "diagnose", "inspect", "investigate", "audit", "troubleshoot", "check"}
            if (any(t in norm_query for t in diag_triggers) or q_tokens.intersection(diag_triggers)) and not (q_tokens.intersection({"sensor", "sensors", "reading", "readings", "telemetry", "pressure"})):
                intent_scores["ASSET_EXPLANATION"] = max(intent_scores.get("ASSET_EXPLANATION", 0.0), 0.98)

            # 4. Maintenance intent for single asset
            maint_triggers = {"service", "serviced", "servicing", "maintenance", "component", "subsystem", "parts", "overhaul", "repair"}
            if any(t in norm_query for t in maint_triggers) or q_tokens.intersection(maint_triggers):
                intent_scores["ASSET_MAINTENANCE"] = max(intent_scores.get("ASSET_MAINTENANCE", 0.0), 0.95)

            # 5. Recommended action for single asset
            action_triggers = {"do", "action", "directive", "recommendation", "recommend", "mitigate", "fix"}
            if any(t in norm_query for t in action_triggers) or q_tokens.intersection(action_triggers):
                intent_scores["RECOMMENDED_ACTION"] = max(intent_scores.get("RECOMMENDED_ACTION", 0.0), 0.95)
        else:
            # Penalize asset-specific intents if no asset is referenced
            for asset_intent in ["ASSET_EXPLANATION", "ASSET_MAINTENANCE", "ASSET_STATUS"]:
                if asset_intent in intent_scores:
                    intent_scores[asset_intent] *= 0.1

        # Fleet-level concept boosts
        if not has_asset:
            # 1. Readiness Trends (checked before generic readiness)
            trend_signals = {"trend", "changing", "deteriorat", "improving", "trajectory", "getting worse", "getting better"}
            if any(ts in norm_query for ts in trend_signals):
                intent_scores["READINESS_TRENDS"] = max(intent_scores.get("READINESS_TRENDS", 0.0), 0.96)

            # 2. Recent Changes
            recent_signals = {"recent", "what changed", "since previous", "latest activity", "recent event"}
            if any(rcs in norm_query for rcs in recent_signals):
                intent_scores["RECENT_CHANGES"] = max(intent_scores.get("RECENT_CHANGES", 0.0), 0.96)

            # 3. Failure Risk & Impending Breakdown
            fail_signals = {"highest failure", "failure risk", "failure probability", "breakdown", "at risk", "blow up", "crapping out", "conk out", "catastrophic breakdown", "fail mechanically", "predict impending", "worst failure odds"}
            if any(fs in norm_query for fs in fail_signals) or "failure" in q_tokens:
                intent_scores["FAILURE_RISK"] = max(intent_scores.get("FAILURE_RISK", 0.0), 0.96)

            # 4. Sensor Telemetry Anomalies
            anom_signals = {"anomaly", "anomalies", "anomalous", "glitching", "outlier", "sensor deviation", "irregular telemetry", "sensors acting up", "erratic sensor", "heat spikes", "vibration spikes", "unusual vibration", "abnormal sensor", "abnormal readings"}
            if any(ans in norm_query for ans in anom_signals) or ("abnormal" in norm_query and "sensor" in norm_query) or ("unusual" in norm_query and "spike" in norm_query):
                intent_scores["ANOMALIES"] = max(intent_scores.get("ANOMALIES", 0.0), 0.96)

            # 5. Grounded / Not-Ready Assets
            grounded_signals = {
                "grounded", "not ready", "unready", "sidelined", "out of action", "inoperative",
                "nmc", "benched", "cannot deploy", "can't deploy", "unfit to fly", "unfit to deploy",
                "failed pre-flight", "prevented from deploying", "unavailable for missions",
                "failed readiness standards", "not mission capable", "non mission capable",
                "not mission-ready", "not mission ready", "not operational", "not combat-ready", "offline"
            }
            has_grounded = (
                any(gs in norm_query for gs in grounded_signals)
                or ("down" in q_tokens and "break" not in norm_query and "conk" not in norm_query)
                or ("not" in q_tokens and any(rt in q_tokens for rt in ["ready", "operational", "deployable"]))
            )
            if has_grounded:
                intent_scores["NOT_READY_ASSETS"] = max(intent_scores.get("NOT_READY_ASSETS", 0.0), 0.98)

            # 6. Critical Assets
            crit_signals = {"immediate attention", "critical", "urgent", "emergency", "top priority", "red alert", "emergency triage", "red-level"}
            if any(cs in norm_query for cs in crit_signals):
                intent_scores["CRITICAL_ASSETS"] = max(intent_scores.get("CRITICAL_ASSETS", 0.0), 0.95)

            # 7. Low RUL
            rul_signals = {"rul", "remaining useful life", "running out of hours", "useful hours", "life exhaustion", "exhausted remaining"}
            if any(rs in norm_query for rs in rul_signals):
                intent_scores["LOW_RUL"] = max(intent_scores.get("LOW_RUL", 0.0), 0.95)

            # 8. Overdue Maintenance
            overdue_signals = {"overdue", "past due", "missed service", "delinquent", "exceeded the service window", "missed their scheduled"}
            if any(os in norm_query for os in overdue_signals):
                intent_scores["OVERDUE_MAINTENANCE"] = max(intent_scores.get("OVERDUE_MAINTENANCE", 0.0), 0.95)

            # 9. Maintenance Required
            maint_req_signals = {"require maintenance", "need maintenance", "servicing backlog", "wrench turned", "need servicing", "repairs list", "turn a wrench"}
            if any(mrs in norm_query for mrs in maint_req_signals):
                intent_scores["MAINTENANCE_REQUIRED"] = max(intent_scores.get("MAINTENANCE_REQUIRED", 0.0), 0.95)

            # 10. Fleet Status & Readiness (only if not a trend query and not grounded/unready)
            is_trend = any(ts in norm_query for ts in ["trend", "changing", "deteriorat", "improving", "trajectory"])
            ready_tokens = {"ready", "deployable", "fmc", "readiness", "operational"}
            has_positive_readiness = (
                (bool(q_tokens.intersection(ready_tokens)) and "unready" not in q_tokens and "not ready" not in norm_query)
                or any(ph in norm_query for ph in ["good to go", "fit for flight", "cleared for duty", "combat ready", "operational picture", "combat readiness", "entire force", "total operational capability", "or rate"])
            )
            if not has_grounded and not is_trend and has_positive_readiness:
                intent_scores["FLEET_STATUS"] = max(intent_scores.get("FLEET_STATUS", 0.0), 0.95)

        # 4. Determine Top Intent and Confidence
        best_intent = "UNKNOWN"
        best_score = 0.0

        for intent, score in intent_scores.items():
            if score > best_score:
                best_score = score
                best_intent = intent

        # Threshold calibration: queries with very low similarity and no domain concept matches are UNKNOWN
        # (e.g. "What is the weather in Tokyo?", "Can you write a poem about jets?")
        MIN_CONFIDENCE_THRESHOLD = 0.28
        if best_score < MIN_CONFIDENCE_THRESHOLD:
            return "UNKNOWN", 0.0, asset_code

        # Calibrate confidence score to human-readable range [0.85, 0.98]
        calibrated_conf = min(0.98, max(0.85, round(best_score, 2)))
        return best_intent, calibrated_conf, asset_code


# Singleton instance
semantic_understanding_engine = SemanticUnderstandingEngine()
