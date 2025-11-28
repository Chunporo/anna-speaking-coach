"""
Gemini-based IELTS Speaking Feedback Service
Provides professional IELTS examiner-style evaluation and feedback
"""
import os
import json
import logging
import re
from typing import Optional
from dataclasses import dataclass
from decimal import Decimal

logger = logging.getLogger(__name__)

# Try to import google generative AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Gemini feedback will be unavailable.")


@dataclass
class IELTSFeedback:
    """IELTS Speaking feedback result"""
    fluency_score: Decimal
    vocabulary_score: Decimal
    grammar_score: Decimal
    pronunciation_score: Decimal
    overall_band: Decimal
    feedback: str
    strengths: list
    improvements: list
    sample_corrections: list


# IELTS Examiner Prompt Template
IELTS_EXAMINER_PROMPT = """You are a certified IELTS Speaking Examiner with 15+ years of experience. Analyze the following speaking response and provide detailed, constructive feedback.

## IELTS Speaking Test Context
- **Part**: {part}
- **Question/Topic**: {question}
- **Candidate's Response**: 
"{transcription}"

## Your Task
Evaluate this response according to the official IELTS Speaking Band Descriptors. Provide scores and detailed feedback.

## IELTS Band Descriptors Reference:

### Fluency and Coherence (FC)
- Band 9: Speaks fluently with only rare repetition or self-correction; hesitation is content-related
- Band 7: Speaks at length without noticeable effort; may demonstrate language-related hesitation at times
- Band 5: Can talk at length but with noticeable effort; some repetition and self-correction

### Lexical Resource (LR) 
- Band 9: Uses vocabulary with full flexibility and precision; uses idiomatic language naturally
- Band 7: Uses vocabulary resource flexibly; uses less common and idiomatic vocabulary
- Band 5: Manages to talk about familiar topics but limited flexibility

### Grammatical Range and Accuracy (GRA)
- Band 9: Uses a full range of structures naturally and appropriately
- Band 7: Uses a range of complex structures with some flexibility
- Band 5: Produces basic sentence forms with reasonable accuracy

### Pronunciation (P)
- Band 9: Uses a full range of pronunciation features with precision and subtlety
- Band 7: Shows all positive features of Band 6 and some, but not all, positive features of Band 8
- Band 5: Shows all positive features of Band 4 but not all positive features of Band 6

## Response Format
Provide your evaluation in the following JSON format ONLY (no additional text before or after):

```json
{{
    "fluency_score": <score from 1.0 to 9.0 in 0.5 increments>,
    "vocabulary_score": <score from 1.0 to 9.0 in 0.5 increments>,
    "grammar_score": <score from 1.0 to 9.0 in 0.5 increments>,
    "pronunciation_score": <score from 1.0 to 9.0 in 0.5 increments>,
    "overall_band": <calculated average, rounded to nearest 0.5>,
    "feedback": "<2-3 paragraph comprehensive feedback covering all four criteria>",
    "strengths": [
        "<specific strength 1 with example from response>",
        "<specific strength 2 with example from response>",
        "<specific strength 3 with example from response>"
    ],
    "improvements": [
        "<specific area to improve 1 with actionable advice>",
        "<specific area to improve 2 with actionable advice>",
        "<specific area to improve 3 with actionable advice>"
    ],
    "sample_corrections": [
        {{
            "original": "<incorrect or improvable phrase from response>",
            "corrected": "<improved version>",
            "explanation": "<brief explanation>"
        }}
    ]
}}
```

## Important Guidelines:
1. Be encouraging but honest - IELTS is a high-stakes exam and candidates need accurate feedback
2. Use specific examples from the candidate's response to support your scores
3. For Part 1, expect shorter answers (2-4 sentences); for Part 2, expect 1-2 minute monologues; for Part 3, expect discussion-style responses
4. Consider that this is a transcription, so minor transcription artifacts should not heavily penalize pronunciation
5. If the response is too short or off-topic, reflect this in the fluency score
6. Provide practical, actionable advice for improvement
"""


def get_gemini_client():
    """Initialize and return Gemini client"""
    if not GEMINI_AVAILABLE:
        return None
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set in environment")
        return None
    
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-2.5-flash')


def parse_gemini_response(response_text: str) -> dict:
    """Parse Gemini response to extract JSON"""
    # Try to find JSON in the response
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to parse the entire response as JSON
        json_str = response_text.strip()
        # Remove any markdown code block markers
        if json_str.startswith('```'):
            json_str = re.sub(r'^```\w*\n?', '', json_str)
            json_str = re.sub(r'\n?```$', '', json_str)
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        logger.debug(f"Response text: {response_text}")
        raise ValueError(f"Could not parse feedback response: {e}")


def get_part_description(part: int) -> str:
    """Get description for IELTS part"""
    descriptions = {
        1: "Part 1 (Introduction and Interview) - Short, direct questions about familiar topics",
        2: "Part 2 (Long Turn) - 1-2 minute monologue on a given topic",
        3: "Part 3 (Discussion) - Abstract discussion questions related to Part 2 topic"
    }
    return descriptions.get(part, f"Part {part}")


async def get_ielts_feedback(
    transcription: str,
    question: str,
    part: int = 1
) -> Optional[IELTSFeedback]:
    """
    Get IELTS examiner-style feedback for a speaking response
    
    Args:
        transcription: The transcribed text of the candidate's response
        question: The question or topic that was asked
        part: IELTS Speaking part (1, 2, or 3)
        
    Returns:
        IELTSFeedback object with scores and detailed feedback, or None if unavailable
    """
    model = get_gemini_client()
    if not model:
        logger.warning("Gemini client not available, returning None")
        return None
    
    # Handle empty or very short transcriptions
    if not transcription or len(transcription.strip()) < 10:
        return IELTSFeedback(
            fluency_score=Decimal("0.0"),
            vocabulary_score=Decimal("0.0"),
            grammar_score=Decimal("0.0"),
            pronunciation_score=Decimal("0.0"),
            overall_band=Decimal("0.0"),
            feedback="No response was detected or the response was too short to evaluate. Please try speaking more clearly and at a normal pace. For Part 1, aim for 2-4 sentences. For Part 2, speak for 1-2 minutes. For Part 3, provide detailed responses with examples.",
            strengths=[],
            improvements=["Provide a longer response", "Speak clearly into the microphone", "Address the question directly"],
            sample_corrections=[]
        )
    
    # Format the prompt
    part_description = get_part_description(part)
    prompt = IELTS_EXAMINER_PROMPT.format(
        part=part_description,
        question=question,
        transcription=transcription
    )
    
    try:
        # Generate response using Gemini
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Parse the JSON response
        feedback_data = parse_gemini_response(response_text)
        
        # Create IELTSFeedback object
        return IELTSFeedback(
            fluency_score=Decimal(str(feedback_data.get("fluency_score", 5.0))),
            vocabulary_score=Decimal(str(feedback_data.get("vocabulary_score", 5.0))),
            grammar_score=Decimal(str(feedback_data.get("grammar_score", 5.0))),
            pronunciation_score=Decimal(str(feedback_data.get("pronunciation_score", 5.0))),
            overall_band=Decimal(str(feedback_data.get("overall_band", 5.0))),
            feedback=feedback_data.get("feedback", ""),
            strengths=feedback_data.get("strengths", []),
            improvements=feedback_data.get("improvements", []),
            sample_corrections=feedback_data.get("sample_corrections", [])
        )
        
    except Exception as e:
        logger.error(f"Error getting Gemini feedback: {e}")
        return None


def format_feedback_text(feedback: IELTSFeedback) -> str:
    """Format IELTSFeedback into a readable text format for storage"""
    sections = []
    
    # Overall band
    sections.append(f"📊 **Overall Band Score: {feedback.overall_band}**\n")
    
    # Individual scores
    sections.append("### Scores by Criterion")
    sections.append(f"- **Fluency and Coherence**: {feedback.fluency_score}")
    sections.append(f"- **Lexical Resource**: {feedback.vocabulary_score}")
    sections.append(f"- **Grammatical Range and Accuracy**: {feedback.grammar_score}")
    sections.append(f"- **Pronunciation**: {feedback.pronunciation_score}")
    sections.append("")
    
    # Main feedback
    sections.append("### Detailed Feedback")
    sections.append(feedback.feedback)
    sections.append("")
    
    # Strengths
    if feedback.strengths:
        sections.append("### ✅ Strengths")
        for strength in feedback.strengths:
            sections.append(f"- {strength}")
        sections.append("")
    
    # Areas for improvement
    if feedback.improvements:
        sections.append("### 🎯 Areas for Improvement")
        for improvement in feedback.improvements:
            sections.append(f"- {improvement}")
        sections.append("")
    
    # Sample corrections
    if feedback.sample_corrections:
        sections.append("### 📝 Language Corrections")
        for correction in feedback.sample_corrections:
            if isinstance(correction, dict):
                sections.append(f"- ❌ \"{correction.get('original', '')}\"")
                sections.append(f"  ✓ \"{correction.get('corrected', '')}\"")
                sections.append(f"  💡 {correction.get('explanation', '')}")
                sections.append("")
    
    return "\n".join(sections)


# Synchronous wrapper for non-async contexts
def get_ielts_feedback_sync(
    transcription: str,
    question: str,
    part: int = 1
) -> Optional[IELTSFeedback]:
    """Synchronous version of get_ielts_feedback"""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, we can't use run_until_complete
            # In this case, the caller should use the async version
            logger.warning("Cannot run sync feedback in async context, use async version")
            return None
        return loop.run_until_complete(get_ielts_feedback(transcription, question, part))
    except RuntimeError:
        # No event loop, create a new one
        return asyncio.run(get_ielts_feedback(transcription, question, part))

