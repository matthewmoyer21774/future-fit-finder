"""
CV/Resume parsers for multiple file formats.

PURPOSE:
    Extract raw text from uploaded CV/resume files so it can be fed into
    the profiling pipeline (profiler.py → classifier.py → recommender.py).

SUPPORTED FORMATS:
    - PDF  → pypdf (PdfReader)
    - DOCX → python-docx (Document)
    - TXT  → raw UTF-8 decode
    - LinkedIn URL → trafilatura web scraping

LAZY IMPORTS:
    Library imports (pypdf, docx, trafilatura) are placed *inside* each
    function rather than at module level.  This is intentional:
      1. It avoids ImportError if a library is not installed (e.g. trafilatura
         is only needed if the user provides a LinkedIn URL).
      2. It speeds up module import time — only the parser actually used
         pays the import cost.
      3. It makes dependency requirements more explicit per function.

DATA FLOW:
    main.py  →  parse_file(filename, file_bytes)  →  returns raw text string
"""

import io


def parse_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF file using pypdf.

    Iterates over every page in the PDF and concatenates the extracted text.
    pypdf uses a layout-aware text extraction algorithm that handles most
    single-column and multi-column PDFs well.

    See: https://pypdf.readthedocs.io/en/stable/

    Args:
        file_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        Concatenated text from all pages, separated by newlines.
    """
    from pypdf import PdfReader

    # Wrap bytes in a BytesIO stream so PdfReader can treat it like a file
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)
    return "\n".join(text_parts)


def parse_docx(file_bytes: bytes) -> str:
    """
    Extract text from a DOCX (Microsoft Word) file using python-docx.

    Iterates over all paragraphs in the document body.  Note that this
    does not extract text from headers, footers, or text boxes — which
    is acceptable for CV parsing where the main content is in paragraphs.

    See: https://python-docx.readthedocs.io/en/latest/

    Args:
        file_bytes: Raw bytes of the uploaded DOCX file.

    Returns:
        Concatenated paragraph text, separated by newlines.
    """
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    text_parts = []
    for para in doc.paragraphs:
        # Skip empty paragraphs to keep the output clean
        if para.text.strip():
            text_parts.append(para.text)
    return "\n".join(text_parts)


def parse_txt(file_bytes: bytes) -> str:
    """
    Extract text from a plain text file.

    Uses UTF-8 decoding with error ignoring to handle files that may contain
    non-UTF-8 characters (e.g. Windows-1252 encoded files).

    Args:
        file_bytes: Raw bytes of the uploaded text file.

    Returns:
        The decoded string content.
    """
    return file_bytes.decode("utf-8", errors="ignore")


def parse_linkedin_url(url: str) -> str:
    """
    Extract text content from a LinkedIn profile URL using trafilatura.

    Trafilatura is a web scraping library that extracts the main content
    from web pages while stripping navigation, ads, and boilerplate.
    It works reasonably well on public LinkedIn profiles, though LinkedIn
    may block automated requests — in which case an empty string is returned.

    See: https://trafilatura.readthedocs.io/en/latest/

    Args:
        url: Full LinkedIn profile URL (e.g. https://linkedin.com/in/username).

    Returns:
        Extracted text content, or empty string if scraping fails.
    """
    import trafilatura

    downloaded = trafilatura.fetch_url(url)
    if downloaded:
        text = trafilatura.extract(downloaded)
        return text or ""
    return ""


def parse_file(filename: str, file_bytes: bytes) -> str:
    """
    Route a file to the correct parser based on its extension.

    This is the main entry point used by main.py.  It inspects the file
    extension and delegates to the appropriate specialised parser.

    Supported extensions:
        .pdf        → parse_pdf()
        .docx, .doc → parse_docx()
        .txt, .text, .csv → parse_txt()
        (anything else)   → parse_txt() as fallback

    Args:
        filename:   Original filename (used to determine extension).
        file_bytes: Raw bytes of the uploaded file.

    Returns:
        Extracted raw text from the file.
    """
    # Extract the file extension (lowercase), default to empty if no dot
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        return parse_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return parse_docx(file_bytes)
    elif ext in ("txt", "text", "csv"):
        return parse_txt(file_bytes)
    else:
        # Try as plain text fallback — handles unknown formats gracefully
        return parse_txt(file_bytes)
