import httpx
import io
import pdfplumber
from docx import Document


async def parse_resume_from_url(file_url: str, file_type: str) -> str:
    """
    Downloads a resume from Cloudinary URL and extracts plain text.
    Supports PDF, DOCX, and TXT.
    """
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(file_url)
        response.raise_for_status()
        content = response.content

    if "pdf" in file_type.lower():
        return extract_pdf_text(content)
    elif "wordprocessingml" in file_type.lower() or "docx" in file_type.lower():
        return extract_docx_text(content)
    elif "text" in file_type.lower():
        return content.decode("utf-8", errors="ignore")
    else:
        return ""


def extract_pdf_text(content: bytes) -> str:
    text_parts = []
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        print(f"PDF parse error: {e}")
    return "\n".join(text_parts).strip()


def extract_docx_text(content: bytes) -> str:
    text_parts = []
    try:
        doc = Document(io.BytesIO(content))
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text.strip())
    except Exception as e:
        print(f"DOCX parse error: {e}")
    return "\n".join(text_parts).strip()
