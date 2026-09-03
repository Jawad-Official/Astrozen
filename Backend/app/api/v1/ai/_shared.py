"""Helpers shared across the app.api.v1.ai submodules.

Split out of the former monolithic ai_projects.py so each route module can
import just what it needs without re-declaring these.
"""
import ast
import json
import logging
from typing import Any, Union

logger = logging.getLogger(__name__)


def _strip_unsafe_images(html: str) -> str:
    """Remove <img> src values that would make html2docx fetch an external
    URL server-side. html2docx's image loader (urllib.request.urlopen) has
    no scheme/host restriction, so an attacker-controlled markdown ->
    HTML image tag becomes a blind SSRF primitive (internal network
    recon, cloud metadata endpoints, or `file://` local reads) reachable
    just by uploading a document and later downloading it as .docx.
    Only `data:` URIs (embedded, not fetched) are left in place - this
    app's generated/uploaded documents have no legitimate need to
    reference an arbitrary external image URL.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if not src.startswith("data:"):
            img.decompose()
    return str(soup)


class AssetParseError(Exception):
    """Raised when a ProjectAsset's stored content is neither valid JSON nor
    a legacy Python-literal string that ast.literal_eval can recover."""


def _parse_asset_json(content: str, *, asset_id: Any) -> Union[list, dict]:
    """Parse a ProjectAsset's stored content (kanban/blueprint data).

    Content is normally JSON. Some rows predate a fix where it was written
    with Python's str() instead of json.dumps(), producing a Python-repr
    string (single-quoted, True/False/None) that isn't valid JSON - for
    those, ast.literal_eval is used as an explicit, logged compatibility
    fallback. Raises AssetParseError if neither succeeds, so callers can
    surface an explicit error state instead of silently treating malformed
    content as empty.
    """
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        pass

    try:
        value = ast.literal_eval(content)
    except (ValueError, SyntaxError, TypeError) as exc:
        logger.exception(
            "Asset %s content is neither valid JSON nor a parseable Python literal",
            asset_id,
        )
        raise AssetParseError(f"Could not parse asset {asset_id}") from exc

    logger.warning(
        "Asset %s content parsed via legacy ast.literal_eval fallback, not JSON",
        asset_id,
    )
    return value
