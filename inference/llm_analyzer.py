import json
import os
from typing import Dict, Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# LLM OUTPUT SCHEMA
# ============================================================

class ModelWeights(BaseModel):

    efficientnet: float = Field(
        description="Evidence weight assigned to EfficientNet-B3"
    )

    color: float = Field(
        description="Evidence weight assigned to Color Analysis"
    )

    texture: float = Field(
        description="Evidence weight assigned to Texture Analysis"
    )


class LLMAnalysis(BaseModel):

    is_lubricant: bool = Field(
        description="Whether the input image is considered a lubricant image"
    )

    final_class: str = Field(
        description="Final class: c1, c2, or c3"
    )

    status: str = Field(
        description="Fresh, Semi-degraded, or Fully-degraded"
    )

    confidence: float = Field(
        description="Final confidence between 0 and 1"
    )

    model_weights: ModelWeights

    reasoning: str = Field(
        description="Explanation of how the model evidence was evaluated"
    )

    analysis_report: str = Field(
        description="Professional lubricant condition analysis report"
    )


# ============================================================
# LLM ANALYZER
# ============================================================

class LubricantLLMAnalyzer:

    def __init__(
        self,
        model_name: str = "gemini-3.5-flash-lite"
    ):

        api_key = os.getenv(
            "GOOGLE_API_KEY"
        )

        if not api_key:

            raise ValueError(
                "GOOGLE_API_KEY was not found. "
                "Add it to the .env file."
            )

        # ----------------------------------------------------
        # Gemini
        # ----------------------------------------------------

        self.llm = ChatGoogleGenerativeAI(

            model=model_name,

            temperature=0,

            google_api_key=api_key
        )

        # ----------------------------------------------------
        # Structured output
        # ----------------------------------------------------

        self.structured_llm = (
            self.llm.with_structured_output(
                LLMAnalysis
            )
        )

    # ========================================================
    # ANALYZE MODEL EVIDENCE
    # ========================================================

    def analyze(
        self,
        model_evidence: Dict[str, Any]
    ) -> Dict[str, Any]:

        # ----------------------------------------------------
        # Convert evidence to JSON
        # ----------------------------------------------------

        evidence_json = json.dumps(
            model_evidence,
            indent=2
        )

        # ----------------------------------------------------
        # System instructions
        # ----------------------------------------------------

        system_prompt = """
You are the senior AI decision engine for Loob Vision,
an automated lubricant-condition analysis system.

The system uses three specialized machine-learning models:

1. EfficientNet-B3
   - Primary lubricant-condition classification model.
   - Analyzes the visual condition of the lubricant.

2. Color Analysis Model
   - Provides color-based evidence related to lubricant degradation.

3. Texture Analysis Model
   - Provides texture and surface-pattern evidence.

Your task is to analyze the supplied machine-learning evidence
and produce the final lubricant-condition assessment.

IMPORTANT RULES:

1. Do NOT use simple majority voting.

2. Consider the complete probability distribution from every model.

3. Consider model confidence.

4. Consider agreement between models.

5. Consider disagreement between models.

6. EfficientNet-B3 is the PRIMARY condition-classification
   model and should generally receive greater consideration,
   but DO NOT use a permanently fixed numerical weight.

7. Dynamically determine the evidence weight of each model
   according to the quality and confidence of its evidence.

8. The three model weights must sum to exactly 1.0.

9. Do not invent measurements, visual observations,
   laboratory results, or information that is not contained
   in the supplied evidence.

10. If all models strongly agree, confidence may be high.

11. If models strongly disagree, reduce confidence and explain
    the disagreement.

12. Final class must be exactly one of:
    c1
    c2
    c3

13. Class meanings:

    c1 = Fresh
    c2 = Semi-degraded
    c3 = Fully-degraded

14. Status must exactly correspond to the final class:

    c1 = Fresh
    c2 = Semi-degraded
    c3 = Fully-degraded

15. Confidence must be between 0 and 1.

16. The final report should be professional and suitable for
    an industrial lubricant-condition monitoring system.

17. Do not claim that the result is equivalent to a laboratory
    chemical analysis.

18. The analysis_report should clearly communicate:
    - final lubricant condition
    - supporting model evidence
    - degree of confidence
    - any important uncertainty

19. If the supplied evidence indicates that the image is not
    a lubricant image, set is_lubricant to false and do not
    pretend that a lubricant condition classification is reliable.

Return ONLY the fields defined by the structured output schema.
"""

        # ----------------------------------------------------
        # User prompt
        # ----------------------------------------------------

        user_prompt = f"""
Analyze the following Loob Vision machine-learning evidence.

MODEL EVIDENCE:

{evidence_json}

Determine:

- whether the image represents lubricant
- final class
- final status
- confidence
- dynamic model evidence weights
- reasoning
- professional analysis report
"""

        # ----------------------------------------------------
        # Invoke structured LLM
        # ----------------------------------------------------

        result = self.structured_llm.invoke(
            [
                (
                    "system",
                    system_prompt
                ),
                (
                    "human",
                    user_prompt
                )
            ]
        )

        # ----------------------------------------------------
        # Convert Pydantic object to dictionary
        # ----------------------------------------------------

        if hasattr(
            result,
            "model_dump"
        ):

            return result.model_dump()

        return dict(result)


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    from inference.model_runner import (
        LubricantModelRunner
    )

    print("=" * 70)
    print("LOOB VISION AI - LLM ANALYSIS TEST")
    print("=" * 70)

    # --------------------------------------------------------
    # Test image
    # --------------------------------------------------------

    test_image = (
        r"D:\Loov_Vision_Ai\tests\test_image.png"
    )

    # --------------------------------------------------------
    # Run ML models
    # --------------------------------------------------------

    print("\nLoading ML models...")

    runner = LubricantModelRunner()

    print("\nRunning ML models...")

    evidence = runner.predict_all(
        test_image
    )

    print("\nML evidence generated successfully.")

    # --------------------------------------------------------
    # Run LLM
    # --------------------------------------------------------

    print("\nSending evidence to Gemini...")

    analyzer = LubricantLLMAnalyzer()

    analysis = analyzer.analyze(
        evidence
    )

    # --------------------------------------------------------
    # Display final result
    # --------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("FINAL LLM ANALYSIS")
    print("=" * 70)

    print(
        json.dumps(
            analysis,
            indent=4
        )
    )