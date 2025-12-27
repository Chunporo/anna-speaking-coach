"""
Application constants
"""
from decimal import Decimal

# IELTS Parts
IELTS_PARTS = [1, 2, 3]

# Default Scores
DEFAULT_FLUENCY_SCORE = Decimal("5.0")
DEFAULT_VOCABULARY_SCORE = Decimal("5.0")
DEFAULT_GRAMMAR_SCORE = Decimal("5.0")
DEFAULT_PRONUNCIATION_SCORE = Decimal("5.0")
DEFAULT_OVERALL_BAND = Decimal("5.0")

# Transcription Methods
TRANSCRIPTION_METHOD_GOOGLE = "google"
TRANSCRIPTION_METHOD_WHISPER = "whisper"
TRANSCRIPTION_METHOD_ERROR = "error"
TRANSCRIPTION_METHOD_UNKNOWN = "unknown"

# Transcription Method Display Names
TRANSCRIPTION_DISPLAY_GOOGLE = "Google Cloud Speech-to-Text"
TRANSCRIPTION_DISPLAY_WHISPER = "Whisper (Local)"

# Error Messages
ERROR_QUESTION_NOT_FOUND = "Question not found"
ERROR_SESSION_NOT_FOUND = "Không tìm thấy phiên luyện tập"
ERROR_TRANSCRIPTION_FAILED = "Transcription error: {error}. Please check that 'mamba activate whisper' works and Whisper is installed."

# Feedback Messages
FEEDBACK_UNAVAILABLE = """⚠️ **Dịch vụ AI không khả dụng**

Dịch vụ phản hồi AI hiện không khả dụng. Vui lòng đảm bảo:
1. Biến môi trường GEMINI_API_KEY đã được cấu hình
2. Package google-generativeai đã được cài đặt

Bản ghi của bạn đã được lưu. Bạn có thể thử lại sau để nhận phản hồi IELTS chi tiết."""

FEEDBACK_ERROR_TEMPLATE = """⚠️ **Lỗi tạo phản hồi**

Đã xảy ra lỗi khi tạo phản hồi: {error}

Bản ghi của bạn đã được lưu. Vui lòng thử lại sau."""
