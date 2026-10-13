import os
import json
import base64
import time
from pathlib import Path
from typing import Dict, Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langchain_google_genai import ChatGoogleGenerativeAI

from inference.model_runner import LubricantModelRunner
from graph.state import LubricantState


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is not set. "
        "Please add it to your .env file."
    )


# ============================================================
# CLASS MAPPING
# ============================================================

CLASS_STATUS = {
    "c1": "Fresh",
    "c2": "Semi-degraded",
    "c3": "Fully-degraded",
}


# ============================================================
# FIXED MODEL WEIGHTS
# ============================================================

FIXED_MODEL_WEIGHTS = {
    "efficientnet": 0.55,
    "color": 0.15,
    "texture": 0.30,
}


# ============================================================
# LOAD MODELS ONCE
# ============================================================

# ============================================================
# LOAD MODELS ONCE
# ============================================================

model_runner = LubricantModelRunner()


# ============================================================
# GEMINI
# ============================================================

# ============================================================
# GEMINI MODELS
# ============================================================

# Fast visual gate.
# The gate only needs to determine:
# lubricant vs non-lubricant.
gate_llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=GOOGLE_API_KEY,
    thinking_level="minimal",
    request_timeout=12,
    max_retries=1,
)

# Fast, evidence-based reasoning model with quota resilience.
decision_llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=GOOGLE_API_KEY,
    thinking_level="minimal",
    request_timeout=12,
    max_retries=1,
)


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class LubricantGate(BaseModel):

    is_lubricant: bool = Field(
        description="Whether the image contains lubricant."
    )

    confidence: float = Field(
        description="Confidence between 0 and 1."
    )

    reasoning: str = Field(
        description="Short visual reasoning."
    )


class FinalDecision(BaseModel):

    final_class: str = Field(
        description="Final class: c1, c2, or c3."
    )

    status: str = Field(
        description="Fresh, Semi-degraded, or Fully-degraded."
    )

    confidence: float = Field(
        description="Confidence between 0 and 1."
    )

    reasoning: str = Field(
        description="Detailed decision reasoning."
    )

    analysis_report: str = Field(
        description="Professional lubricant analysis report."
    )


# ============================================================
# IMAGE -> DATA URL
# ============================================================

def image_to_data_url(image_path: str) -> str:

    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    mime_type = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(
        path.suffix.lower(),
        "image/jpeg"
    )

    with open(path, "rb") as f:

        encoded = base64.b64encode(
            f.read()
        ).decode("utf-8")

    return f"data:{mime_type};base64,{encoded}"


# ============================================================
# IMAGE -> COMPRESSED DATA URL FOR GEMINI VISION GATE
# ============================================================

def image_to_gemini_data_url(
    image_path: str,
    max_dim: int = 480,
    quality: int = 75
) -> str:
    """
    Creates an in-memory downsampled and compressed JPEG representation
    specifically for Gemini Vision Gate API requests to drastically reduce
    payload size and inference latency.

    Does NOT modify or overwrite the original image file on disk.
    """
    import io
    from PIL import Image

    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    orig_file_size = path.stat().st_size

    try:
        with Image.open(path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            orig_w, orig_h = img.size

            if max(orig_w, orig_h) > max_dim:
                if orig_w >= orig_h:
                    new_w = max_dim
                    new_h = int(round((orig_h * max_dim) / orig_w))
                else:
                    new_h = max_dim
                    new_w = int(round((orig_w * max_dim) / orig_h))

                resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            else:
                resized_img = img
                new_w, new_h = orig_w, orig_h

            buffer = io.BytesIO()
            resized_img.save(buffer, format="JPEG", quality=quality, optimize=True)
            bytes_data = buffer.getvalue()
            new_file_size = len(bytes_data)

            print()
            print(f"Original image : {orig_w}x{orig_h} ({orig_file_size / 1024:.1f} KB)")
            print(f"Gemini image   : {new_w}x{new_h} ({new_file_size / 1024:.1f} KB)")

            encoded = base64.b64encode(bytes_data).decode("utf-8")
            return f"data:image/jpeg;base64,{encoded}"

    except Exception as e:
        print(f"[WARNING] Gemini image compression failed ({e}), using default data URL.")
        return image_to_data_url(image_path)


# ============================================================
# NORMALIZE PROBABILITIES
# ============================================================

def normalize_probabilities(
    probabilities: Dict[str, Any]
) -> Dict[str, float]:

    normalized = {}

    for key, value in probabilities.items():

        key = str(key).lower()

        try:
            normalized[key] = float(value)
        except Exception:
            normalized[key] = 0.0

    return {
        "c1": normalized.get("c1", 0.0),
        "c2": normalized.get("c2", 0.0),
        "c3": normalized.get("c3", 0.0),
    }


# ============================================================
# NORMALIZE MODEL RESULT
# ============================================================

def normalize_model_result(
    result: Any
) -> Dict[str, Any]:

    if hasattr(result, "model_dump"):

        data = result.model_dump()

    elif isinstance(result, dict):

        data = result

    elif hasattr(result, "__dict__"):

        data = vars(result)

    else:

        raise TypeError(
            f"Unsupported model result type: {type(result)}"
        )

    prediction = str(
        data.get("prediction", "")
    ).lower()

    probabilities = normalize_probabilities(
        data.get("probabilities", {})
    )

    status = CLASS_STATUS.get(
        prediction,
        str(
            data.get(
                "status",
                prediction
            )
        )
    )

    res = {
        "prediction": prediction,
        "status": status,
        "probabilities": probabilities,
    }
    if "model_name" in data:
        res["model_name"] = data["model_name"]
    if "features" in data:
        res["features"] = data["features"]

    return res


# ============================================================
# NODE 1
# VISION LLM LUBRICANT GATE
# ============================================================

def lubricant_gate_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NODE 1: LUBRICANT VISION GATE")
    print("=" * 70)

    start_time = time.perf_counter()

    image_path = state["image_path"]

    try:

        image_data_url = image_to_gemini_data_url(
            image_path
        )

        prompt = """
You are the visual inspection gate for an industrial
lubricant condition analysis system.

Examine the provided image.

Determine whether the image contains lubricant, oil,
grease, or another suitable lubricant sample.

Return:

1. is_lubricant
2. confidence
3. reasoning

Rules:

- is_lubricant must be true or false.
- confidence must be between 0 and 1.
- Do not classify Fresh/Semi/Fully here.
- This node only verifies whether the image contains
  a suitable lubricant sample.
- Do not invent information.
"""

        structured_llm = gate_llm.with_structured_output(LubricantGate)

        response = structured_llm.invoke(
            [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                        },
                        {
                            "type": "image_url",
                            "image_url": image_data_url,
                        },
                    ],
                }
            ]
        )

        result = response.model_dump()

        confidence = max(
            0.0,
            min(
                1.0,
                float(result["confidence"])
            )
        )

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            f"Lubricant       : "
            f"{result['is_lubricant']}"
        )

        print(
            f"Gate confidence : "
            f"{confidence:.3f}"
        )

        print(
            f"Gate latency    : "
            f"{elapsed:.3f} sec"
        )

        print(
            f"Reason          : "
            f"{result['reasoning']}"
        )

        return {

            "is_lubricant": bool(
                result["is_lubricant"]
            ),

            "gate_confidence": confidence,

            "gate_reasoning": result[
                "reasoning"
            ],

            "gate_latency": elapsed,
        }

    except Exception as e:

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            f"Gate ERROR: {e}"
        )
        print("[GATE FALLBACK] External verification API unavailable. Bypassing gate directly to ML analysis models.")

        return {

            "is_lubricant": True,

            "gate_confidence": 0.85,

            "gate_reasoning":
                "Visual gate check bypassed to local ML analysis due to API availability.",

            "gate_latency": elapsed,

            "error": str(e),
        }


# ============================================================
# NODE 2A
# EFFICIENTNET
# ============================================================

def efficientnet_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NODE 2A: EFFICIENTNET-B3")
    print("=" * 70)

    start_time = time.perf_counter()

    image_path = state["image_path"]

    try:

        # IMPORTANT:
        # Existing verified EfficientNet preprocessing
        # is used without modification.

        result = model_runner.efficientnet.predict(
            image_path
        )

        evidence = normalize_model_result(
            result
        )

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            json.dumps(
                evidence,
                indent=4
            )
        )

        print(
            f"EfficientNet latency: "
            f"{elapsed:.3f} sec"
        )

        return {

            "efficientnet_evidence":
                evidence,

            "efficientnet_latency":
                elapsed,
        }

    except Exception as e:

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            f"EfficientNet ERROR: {e}"
        )

        return {

            "efficientnet_evidence": {

                "prediction": "",

                "status": "",

                "probabilities": {
                    "c1": 0.0,
                    "c2": 0.0,
                    "c3": 0.0,
                },

                "error": str(e),
            },

            "efficientnet_latency":
                elapsed,
        }


# ============================================================
# NODE 2B
# COLOR ANALYSIS
# ============================================================

def color_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NODE 2B: COLOR ANALYSIS")
    print("=" * 70)

    start_time = time.perf_counter()

    image_path = state["image_path"]

    try:

        if hasattr(
            model_runner,
            "predict_color"
        ):

            result = model_runner.predict_color(
                image_path
            )

        else:

            all_results = model_runner.predict_all(
                image_path
            )

            result = all_results["color"]

        evidence = normalize_model_result(
            result
        )

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            json.dumps(
                evidence,
                indent=4
            )
        )

        print(
            f"Color latency: "
            f"{elapsed:.3f} sec"
        )

        return {

            "color_evidence":
                evidence,

            "color_latency":
                elapsed,
        }

    except Exception as e:

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            f"Color ERROR: {e}"
        )

        return {

            "color_evidence": {

                "prediction": "",

                "status": "",

                "probabilities": {
                    "c1": 0.0,
                    "c2": 0.0,
                    "c3": 0.0,
                },

                "error": str(e),
            },

            "color_latency":
                elapsed,
        }


# ============================================================
# NODE 2C
# TEXTURE ANALYSIS
# ============================================================

def texture_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NODE 2C: TEXTURE ANALYSIS")
    print("=" * 70)

    start_time = time.perf_counter()

    image_path = state["image_path"]

    try:

        if hasattr(
            model_runner,
            "predict_texture"
        ):

            result = model_runner.predict_texture(
                image_path
            )

        else:

            all_results = model_runner.predict_all(
                image_path
            )

            result = all_results["texture"]

        evidence = normalize_model_result(
            result
        )

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            json.dumps(
                evidence,
                indent=4
            )
        )

        print(
            f"Texture latency: "
            f"{elapsed:.3f} sec"
        )

        return {

            "texture_evidence":
                evidence,

            "texture_latency":
                elapsed,
        }

    except Exception as e:

        elapsed = (
            time.perf_counter()
            - start_time
        )

        print(
            f"Texture ERROR: {e}"
        )

        return {

            "texture_evidence": {

                "prediction": "",

                "status": "",

                "probabilities": {
                    "c1": 0.0,
                    "c2": 0.0,
                    "c3": 0.0,
                },

                "error": str(e),
            },

            "texture_latency":
                elapsed,
        }


# ============================================================
# NODE 3
# COMBINE MODEL EVIDENCE
# ============================================================

def combine_model_evidence_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NODE 3: COMBINE MODEL EVIDENCE")
    print("=" * 70)

    efficientnet = state.get(
        "efficientnet_evidence",
        {}
    )

    color = state.get(
        "color_evidence",
        {}
    )

    texture = state.get(
        "texture_evidence",
        {}
    )

    predictions = []

    for evidence in [
        efficientnet,
        color,
        texture,
    ]:

        prediction = str(
            evidence.get(
                "prediction",
                ""
            )
        ).lower()

        if prediction in {
            "c1",
            "c2",
            "c3",
        }:

            predictions.append(
                prediction
            )

    agreement = {}

    if predictions:

        counts = {
            "c1": predictions.count("c1"),
            "c2": predictions.count("c2"),
            "c3": predictions.count("c3"),
        }

        majority_class = max(
            counts,
            key=counts.get
        )

        agreement = {

            "majority_class":
                majority_class,

            "models_supporting":
                counts[majority_class],

            "total_models":
                len(predictions),
        }

    # --------------------------------------------------------
    # Since the three model nodes execute in parallel,
    # the model stage latency is approximately the slowest
    # of the three.
    # --------------------------------------------------------

    efficientnet_time = state.get(
        "efficientnet_latency",
        0.0
    )

    color_time = state.get(
        "color_latency",
        0.0
    )

    texture_time = state.get(
        "texture_latency",
        0.0
    )

    model_stage_latency = max(
        efficientnet_time,
        color_time,
        texture_time,
    )

    model_evidence = {

        "efficientnet":
            efficientnet,

        "color":
            color,

        "texture":
            texture,

        "agreement":
            agreement,

        "fixed_weights":
            FIXED_MODEL_WEIGHTS,
    }

    print(
        json.dumps(
            model_evidence,
            indent=4
        )
    )

    print(
        f"\nParallel ML stage latency: "
        f"{model_stage_latency:.3f} sec"
    )

    return {

        "model_evidence":
            model_evidence,

        "model_stage_latency":
            model_stage_latency,
    }


# ============================================================
# DETERMINISTIC EVIDENCE FUSION FALLBACK
# ============================================================

def compute_deterministic_decision(model_evidence: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fast, reliable deterministic evidence fusion based on fixed weights:
    - EfficientNet-B3 : 0.55
    - Color Analysis  : 0.15
    - Texture Analysis: 0.30
    """
    eff = model_evidence.get("efficientnet", {})
    col = model_evidence.get("color", {})
    tex = model_evidence.get("texture", {})

    eff_probs = eff.get("probabilities", {}) if isinstance(eff.get("probabilities"), dict) else {}
    col_probs = col.get("probabilities", {}) if isinstance(col.get("probabilities"), dict) else {}
    tex_probs = tex.get("probabilities", {}) if isinstance(tex.get("probabilities"), dict) else {}

    classes = ["c1", "c2", "c3"]
    scores = {}
    for c in classes:
        p_eff = float(eff_probs.get(c, 0.0))
        p_col = float(col_probs.get(c, 0.0))
        p_tex = float(tex_probs.get(c, 0.0))
        scores[c] = 0.55 * p_eff + 0.15 * p_col + 0.30 * p_tex

    final_class = max(scores, key=scores.get)
    confidence = round(scores[final_class], 4)

    # Classification Safety Override Rule
    if final_class in {"c1", "c2"} and confidence < 0.55:
        print(f"[SAFETY OVERRIDE] Class '{final_class}' with low confidence ({confidence:.3f} < 0.55) overridden to 'c3'.")
        final_class = "c3"

    status = CLASS_STATUS.get(final_class, "Fully-degraded")

    eff_pred = str(eff.get("prediction", "N/A")).upper()
    col_pred = str(col.get("prediction", "N/A")).upper()
    tex_pred = str(tex.get("prediction", "N/A")).upper()

    reasoning = (
        f"Consensus derived from multi-modal evidence fusion (weights: EfficientNet 55%, Color 15%, Texture 30%). "
        f"EfficientNet predicted {eff_pred}, Color predicted {col_pred}, and Texture predicted {tex_pred}. "
        f"Weighted aggregate score for class {final_class.upper()} is {confidence * 100:.1f}%, designating the condition as {status}."
    )

    analysis_report = (
        f"LOOB VISION INDUSTRIAL CONDITION ANALYSIS REPORT\n\n"
        f"Assessed Grade: {final_class.upper()} ({status})\n"
        f"Combined Confidence: {confidence * 100:.1f}%\n\n"
        f"Model Evidence Breakdown:\n"
        f"• EfficientNet-B3 (55% weight): Class {eff_pred} (Primary visual classifier)\n"
        f"• Two-Stage Color Pipeline (15% weight): Class {col_pred} (Chromatic/luminance analysis)\n"
        f"• Texture Random Forest (30% weight): Class {tex_pred} (GLCM spatial matrix)\n\n"
        f"Technical Findings:\n{reasoning}\n\n"
        f"Operational Guidance: This screening assessment is optimized for rapid non-invasive monitoring. "
        f"Routine laboratory oil analysis is advised for detailed elemental spectroscopy."
    )

    return {
        "final_class": final_class,
        "status": status,
        "confidence": confidence,
        "reasoning": reasoning,
        "analysis_report": analysis_report,
    }


# ============================================================
# NODE 4
# FINAL DECISION LLM
# ============================================================

def decision_llm_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NODE 4: FINAL DECISION LLM")
    print("=" * 70)

    start_time = time.perf_counter()

    model_evidence = state.get(
        "model_evidence",
        {}
    )

    evidence_json = json.dumps(
        model_evidence,
        indent=4
    )

    weights_json = json.dumps(
        FIXED_MODEL_WEIGHTS,
        indent=4
    )

    prompt = f"""
You are the final decision-making AI for Loob Vision,
an industrial lubricant condition analysis system.

The image has already passed the lubricant verification
gate.

Use evidence from all three machine-learning models.

========================================================
MODEL EVIDENCE
========================================================

{evidence_json}


========================================================
FIXED MODEL WEIGHTS
========================================================

{weights_json}

These weights are FIXED.

EfficientNet-B3 = 0.55
Color Analysis  = 0.15
Texture Analysis = 0.30

Do NOT change the weights.

========================================================
DECISION RULES
========================================================

1. EfficientNet-B3 is the primary condition classifier.

2. EfficientNet receives 55% evidence weight.

3. Color Analysis receives 15% evidence weight.

4. Texture Analysis receives 30% evidence weight.

5. Consider the complete probability distributions.

6. Consider model confidence.

7. Consider agreement between models.

8. Consider disagreement between models.

9. Do NOT use simple majority voting.

10. Do NOT invent measurements.

11. The final class must be exactly:

c1
c2
c3

========================================================
CLASS MAPPING
========================================================

c1 = Fresh

c2 = Semi-degraded

c3 = Fully-degraded

========================================================
OUTPUT
========================================================

Return:

final_class
status
confidence
reasoning
analysis_report

Confidence must be between 0 and 1.

The status must correspond to the final class.

The analysis report must be professional and suitable
for an industrial lubricant monitoring application.

Do not claim that this system replaces laboratory
chemical lubricant analysis.
"""

    try:

        structured_llm = decision_llm.with_structured_output(FinalDecision)

        response = structured_llm.invoke(
            [
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )

        decision = response.model_dump()

        final_class = str(
            decision.get(
                "final_class",
                ""
            )
        ).lower()

        if final_class not in {
            "c1",
            "c2",
            "c3",
        }:

            raise ValueError(
                f"Invalid final class: "
                f"{final_class}"
            )

        status = CLASS_STATUS[
            final_class
        ]

        confidence = max(
            0.0,
            min(
                1.0,
                float(
                    decision.get(
                        "confidence",
                        0.0
                    )
                )
            )
        )

        # ----------------------------------------------------
        # CLASSIFICATION SAFETY OVERRIDE RULE
        # ----------------------------------------------------
        # 1. c1 + confidence >= 0.55 -> c1
        #    c1 + confidence <  0.55 -> c3
        # 2. c2 + confidence >= 0.55 -> c2
        #    c2 + confidence <  0.55 -> c3
        # 3. c3 + any confidence       -> c3
        # ----------------------------------------------------

        if final_class in {"c1", "c2"} and confidence < 0.55:
            print(
                f"[SAFETY OVERRIDE] Class '{final_class}' with low confidence ({confidence:.3f} < 0.55) "
                f"overridden to 'c3' (Fully-degraded)."
            )
            final_class = "c3"
            status = CLASS_STATUS["c3"]

        decision_latency = (
            time.perf_counter()
            - start_time
        )

        # ----------------------------------------------------
        # FORCE FIXED WEIGHTS
        # ----------------------------------------------------

        model_weights = {
            "efficientnet": 0.55,
            "color": 0.15,
            "texture": 0.30,
        }

        reasoning = decision.get(
            "reasoning",
            ""
        )

        analysis_report = decision.get(
            "analysis_report",
            ""
        )

        print(
            f"\nFinal class : {final_class}"
        )

        print(
            f"Status      : {status}"
        )

        print(
            f"Confidence  : "
            f"{confidence:.3f}"
        )

        print(
            f"Decision LLM latency: "
            f"{decision_latency:.3f} sec"
        )

        print(
            "\nModel weights:"
        )

        print(
            json.dumps(
                model_weights,
                indent=4
            )
        )

        return {

            "final_class":
                final_class,

            "status":
                status,

            "confidence":
                confidence,

            "model_weights":
                model_weights,

            "reasoning":
                reasoning,

            "analysis_report":
                analysis_report,

            "decision_latency":
                decision_latency,
        }

    except Exception as e:

        decision_latency = (
            time.perf_counter()
            - start_time
        )

        print(
            f"Decision LLM encountered issue ({e}). Applying instant deterministic evidence fusion."
        )

        fallback = compute_deterministic_decision(model_evidence)

        return {

            "final_class": fallback["final_class"],

            "status": fallback["status"],

            "confidence": fallback["confidence"],

            "model_weights":
                FIXED_MODEL_WEIGHTS,

            "reasoning": fallback["reasoning"],

            "analysis_report": fallback["analysis_report"],

            "decision_latency":
                decision_latency,

            "error": str(e),
        }


# ============================================================
# NODE 5
# NON-LUBRICANT REJECTION
# ============================================================

def reject_non_lubricant_node(
    state: LubricantState
) -> Dict[str, Any]:

    print("\n")
    print("=" * 70)
    print("NON-LUBRICANT IMAGE")
    print("=" * 70)

    report = (
        "LOOB VISION ANALYSIS REPORT\n\n"
        "Result: NON-LUBRICANT IMAGE\n\n"
        "The vision verification stage determined that "
        "the submitted image does not contain a suitable "
        "lubricant sample for condition classification.\n\n"
        "The EfficientNet-B3, Color Analysis, and Texture "
        "Analysis models were therefore not used for the "
        "final lubricant condition decision.\n\n"
        "Recommendation: Capture a clear image containing "
        "the lubricant sample and submit it again.\n\n"
        "Disclaimer: This automated visual screening system "
        "is intended for rapid lubricant-condition monitoring "
        "and does not replace laboratory chemical analysis."
    )

    return {

        "final_class":
            "non-lubricant",

        "status":
            "Non-lubricant",

        "confidence":
            state.get(
                "gate_confidence",
                0.0
            ),

        "model_weights": {
            "efficientnet": 0.0,
            "color": 0.0,
            "texture": 0.0,
        },

        "reasoning":
            state.get(
                "gate_reasoning",
                "Image rejected by lubricant gate."
            ),

        "analysis_report":
            report,
    }
