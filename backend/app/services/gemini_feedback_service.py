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


# IELTS Examiner Prompt Template - Vietnamese Response
IELTS_EXAMINER_PROMPT = """Bạn là một giám khảo IELTS Speaking được chứng nhận với hơn 15 năm kinh nghiệm. Phân tích câu trả lời speaking sau và cung cấp phản hồi chi tiết, mang tính xây dựng BẰNG TIẾNG VIỆT.

## Bối cảnh bài thi IELTS Speaking
- **Phần thi**: {part}
- **Câu hỏi/Chủ đề**: {question}
- **Câu trả lời của thí sinh**: 
"{transcription}"

## Nhiệm vụ của bạn
Đánh giá câu trả lời này theo tiêu chí Band Descriptors chính thức của IELTS Speaking. Cung cấp điểm số và phản hồi chi tiết BẰNG TIẾNG VIỆT.

## Tham khảo tiêu chí chấm điểm IELTS:

### Độ trôi chảy và Mạch lạc (Fluency and Coherence - FC)
- Band 9: Nói trôi chảy chỉ có rất ít lần lặp lại hoặc tự sửa; ngập ngừng chỉ liên quan đến nội dung
- Band 7: Nói dài mà không cần cố gắng đáng kể; có thể có ngập ngừng liên quan đến ngôn ngữ
- Band 5: Có thể nói dài nhưng cần cố gắng đáng kể; có sự lặp lại và tự sửa

### Vốn từ vựng (Lexical Resource - LR)
- Band 9: Sử dụng từ vựng linh hoạt và chính xác; dùng thành ngữ tự nhiên
- Band 7: Sử dụng từ vựng linh hoạt; dùng từ ít phổ biến và thành ngữ
- Band 5: Có thể nói về chủ đề quen thuộc nhưng linh hoạt hạn chế

### Phạm vi và Độ chính xác ngữ pháp (Grammatical Range and Accuracy - GRA)
- Band 9: Sử dụng đa dạng cấu trúc một cách tự nhiên và phù hợp
- Band 7: Sử dụng các cấu trúc phức tạp với một số linh hoạt
- Band 5: Tạo câu cơ bản với độ chính xác hợp lý

### Phát âm (Pronunciation - P)
- Band 9: Sử dụng đầy đủ các đặc điểm phát âm với độ chính xác và tinh tế
- Band 7: Thể hiện tất cả các đặc điểm tích cực của Band 6 và một số của Band 8
- Band 5: Thể hiện tất cả các đặc điểm tích cực của Band 4 nhưng không phải tất cả của Band 6

## Định dạng phản hồi
Cung cấp đánh giá của bạn theo định dạng JSON sau (CHỈ JSON, không có text nào khác):

```json
{{
    "fluency_score": <điểm từ 1.0 đến 9.0 theo bước 0.5>,
    "vocabulary_score": <điểm từ 1.0 đến 9.0 theo bước 0.5>,
    "grammar_score": <điểm từ 1.0 đến 9.0 theo bước 0.5>,
    "pronunciation_score": <điểm từ 1.0 đến 9.0 theo bước 0.5>,
    "overall_band": <điểm trung bình, làm tròn đến 0.5 gần nhất>,
    "feedback": "<2-3 đoạn văn nhận xét tổng thể bằng tiếng Việt, bao gồm cả 4 tiêu chí>",
    "strengths": [
        "<điểm mạnh cụ thể 1 với ví dụ từ câu trả lời - viết bằng tiếng Việt>",
        "<điểm mạnh cụ thể 2 với ví dụ từ câu trả lời - viết bằng tiếng Việt>",
        "<điểm mạnh cụ thể 3 với ví dụ từ câu trả lời - viết bằng tiếng Việt>"
    ],
    "improvements": [
        "<điểm cần cải thiện 1 với lời khuyên cụ thể - viết bằng tiếng Việt>",
        "<điểm cần cải thiện 2 với lời khuyên cụ thể - viết bằng tiếng Việt>",
        "<điểm cần cải thiện 3 với lời khuyên cụ thể - viết bằng tiếng Việt>"
    ],
    "sample_corrections": [
        {{
            "original": "<cụm từ sai hoặc có thể cải thiện từ câu trả lời>",
            "corrected": "<phiên bản đã sửa>",
            "explanation": "<giải thích ngắn gọn bằng tiếng Việt>"
        }}
    ]
}}
```

## Hướng dẫn quan trọng:
1. Khuyến khích nhưng trung thực - IELTS là kỳ thi quan trọng và thí sinh cần phản hồi chính xác
2. Sử dụng ví dụ cụ thể từ câu trả lời của thí sinh để hỗ trợ điểm số
3. Với Part 1, mong đợi câu trả lời ngắn (2-4 câu); Part 2, độc thoại 1-2 phút; Part 3, trả lời theo phong cách thảo luận
4. Đây là bản ghi chuyển đổi từ giọng nói, nên các lỗi nhỏ trong chuyển đổi không nên ảnh hưởng nhiều đến điểm phát âm
5. Nếu câu trả lời quá ngắn hoặc lạc đề, phản ánh điều này trong điểm độ trôi chảy
6. Cung cấp lời khuyên thực tế, có thể thực hiện được
7. TẤT CẢ phản hồi, nhận xét, điểm mạnh, điểm cần cải thiện và giải thích PHẢI VIẾT BẰNG TIẾNG VIỆT
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
            feedback="Không phát hiện được câu trả lời hoặc câu trả lời quá ngắn để đánh giá. Hãy thử nói rõ ràng hơn và với tốc độ bình thường. Với Part 1, hãy trả lời 2-4 câu. Với Part 2, nói trong 1-2 phút. Với Part 3, cung cấp câu trả lời chi tiết với ví dụ.",
            strengths=[],
            improvements=[
                "Cung cấp câu trả lời dài hơn",
                "Nói rõ ràng vào microphone",
                "Trả lời trực tiếp vào câu hỏi"
            ],
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
    """Format IELTSFeedback into a readable text format for storage (Vietnamese)"""
    sections = []
    
    # Tổng thể (Overall)
    sections.append(f"## 📊 Tổng thể\n")
    sections.append(f"**Điểm Band tổng: {feedback.overall_band}**\n")
    sections.append("### Điểm theo tiêu chí")
    sections.append(f"- **Độ trôi chảy và Mạch lạc (FC)**: {feedback.fluency_score}")
    sections.append(f"- **Vốn từ vựng (LR)**: {feedback.vocabulary_score}")
    sections.append(f"- **Ngữ pháp (GRA)**: {feedback.grammar_score}")
    sections.append(f"- **Phát âm (P)**: {feedback.pronunciation_score}")
    sections.append("")
    
    # Main feedback - Tổng thể
    sections.append("### Nhận xét chi tiết")
    sections.append(feedback.feedback)
    sections.append("")
    
    # Điểm mạnh (Strengths)
    if feedback.strengths:
        sections.append("## ✅ Điểm mạnh")
        for strength in feedback.strengths:
            sections.append(f"- {strength}")
        sections.append("")
    
    # Những điểm cần cải thiện (Areas to improve)
    if feedback.improvements:
        sections.append("## 🎯 Những điểm cần cải thiện")
        for improvement in feedback.improvements:
            sections.append(f"- {improvement}")
        sections.append("")
    
    # Bản ghi - Sample corrections (Transcript corrections)
    if feedback.sample_corrections:
        sections.append("## 📝 Bản ghi sửa lỗi")
        for correction in feedback.sample_corrections:
            if isinstance(correction, dict):
                sections.append(f"- ❌ \"{correction.get('original', '')}\"")
                sections.append(f"  ✓ \"{correction.get('corrected', '')}\"")
                sections.append(f"  💡 {correction.get('explanation', '')}")
                sections.append("")
    
    # Cải thiện (Improvement suggestions)
    sections.append("## 💡 Gợi ý cải thiện")
    if feedback.improvements:
        sections.append("Dựa trên phân tích trên, bạn nên tập trung vào:")
        for i, improvement in enumerate(feedback.improvements, 1):
            sections.append(f"{i}. {improvement}")
    else:
        sections.append("Tiếp tục luyện tập và duy trì phong độ hiện tại!")
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

