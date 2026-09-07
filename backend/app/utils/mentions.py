"""Parse @mentions from caption/comment text."""
import re

MENTION_PATTERN = re.compile(r"@([a-zA-Z0-9._]{3,30})")


def extract_mentions(text: str) -> list[str]:
    if not text:
        return []
    seen: set[str] = set()
    result: list[str] = []
    for match in MENTION_PATTERN.finditer(text):
        username = match.group(1).lower()
        if username not in seen:
            seen.add(username)
            result.append(username)
    return result
