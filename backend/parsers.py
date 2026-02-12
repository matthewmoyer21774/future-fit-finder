"""
CV/Resume parsers for multiple file formats.
Extracts raw text from PDF, DOCX, and TXT files.

HOW IT WORKS:
  This module is the FIRST step in the pipeline — it converts uploaded
  files (PDF, DOCX, TXT) or LinkedIn URLs into plain text that the rest
  of the system can process.

  Supported inputs:
    - PDF   → uses pypdf to extract text from each page
    - DOCX  → uses python-docx to extract text from each paragraph
    - TXT   → decoded directly as UTF-8
    - LinkedIn URL → uses trafilatura to scrape the public profile page

  The extracted text is passed to profiler.py for structured extraction.

FLOW:
  User uploads file → parse_file() routes to correct parser → raw text string
"""

import io


# ── PDF Parser ──────────────────────────────────────────────────────
def parse_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF file.

    Uses pypdf (pure Python, no system dependencies) to read each page
    and concatenate the extracted text. Works well for text-based PDFs;
    scanned PDFs with only images will return empty text.

    Args:
        file_bytes : raw bytes of the uploaded PDF file.

    Returns:
        All text from the PDF, pages joined by newlines.
    """
    from pypdf import PdfReader

    # Wrap bytes in a BytesIO stream so PdfReader can read it like a file
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)
    return "\n".join(text_parts)


# ── DOCX Parser ─────────────────────────────────────────────────────
def parse_docx(file_bytes: bytes) -> str:
    """
    Extract text from a DOCX (Microsoft Word) file.

    Uses python-docx to iterate over all paragraphs in the document.
    Skips empty paragraphs to keep the output clean.

    Args:
        file_bytes : raw bytes of the uploaded DOCX file.

    Returns:
        All paragraph text, joined by newlines.
    """
    from docx import Document

    # Wrap bytes in a BytesIO stream so Document can read it like a file
    doc = Document(io.BytesIO(file_bytes))
    text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():          # skip blank paragraphs
            text_parts.append(para.text)
    return "\n".join(text_parts)


# ── Plain Text Parser ──────────────────────────────────────────────
def parse_txt(file_bytes: bytes) -> str:
    """
    Extract text from a plain text file.

    Simply decodes the bytes as UTF-8. The errors="ignore" flag skips
    any non-UTF-8 bytes rather than crashing.

    Args:
        file_bytes : raw bytes of the uploaded text file.

    Returns:
        The decoded string.
    """
    return file_bytes.decode("utf-8", errors="ignore")


# ── LinkedIn URL Scraper ────────────────────────────────────────────
def parse_linkedin_url(url: str) -> str:
    """
    Scrape text from a public LinkedIn profile URL.

    Uses trafilatura, a web scraping library that extracts the main
    content from a page while stripping navigation, ads, etc.

    NOTE: Only works for PUBLIC profiles. LinkedIn aggressively blocks
    scraping, so this may return empty for private profiles or if
    LinkedIn's anti-bot protections kick in.

    Args:
        url : the LinkedIn profile URL (e.g. https://linkedin.com/in/someone)

    Returns:
        Extracted text from the profile page, or empty string on failure.
    """
    import trafilatura

    downloaded = trafilatura.fetch_url(url)
    if downloaded:
        text = trafilatura.extract(downloaded)
        return text or ""
    return ""


# ── Main Router ─────────────────────────────────────────────────────
def parse_file(filename: str, file_bytes: bytes) -> str:
    """
    Route an uploaded file to the correct parser based on file extension.

    This is the main entry point called by main.py. It looks at the
    filename extension and calls the appropriate parser function.

    Supported extensions:
      .pdf          → parse_pdf()
      .docx / .doc  → parse_docx()
      .txt / .text / .csv → parse_txt()
      anything else → falls back to plain text parsing

    Args:
        filename   : original filename (e.g. "resume.pdf")
        file_bytes : raw bytes of the uploaded file

    Returns:
        Extracted text as a string.
    """
    # Extract the file extension (everything after the last dot)
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        return parse_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return parse_docx(file_bytes)
    elif ext in ("txt", "text", "csv"):
        return parse_txt(file_bytes)
    else:
        # Unknown extension — try parsing as plain text as a last resort
        return parse_txt(file_bytes)
