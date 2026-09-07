import re

# Same character class the frontend (MultilineText.tsx) uses to linkify
# hashtags in already-saved captions — keep the two in sync. \w in Python's
# re with UNICODE (default in Py3) covers letters/digits/underscore across
# scripts, which is close enough to the frontend's \p{L}\p{N}_ class for our
# purposes (both accept Korean, Latin, digits, underscore).
_HASHTAG_PATTERN = re.compile(r"#(\w+)", re.UNICODE)

MAX_HASHTAGS_PER_POST = 30
MAX_HASHTAG_LENGTH = 100


def extract_hashtags(text: str | None) -> list[str]:
    """Pull #hashtags out of a caption, lowercased and de-duplicated in the
    order they first appear, capped so a caption can't spam thousands of
    tags into the table."""
    if not text:
        return []
    seen: dict[str, None] = {}
    for match in _HASHTAG_PATTERN.finditer(text):
        tag = match.group(1).lower()[:MAX_HASHTAG_LENGTH]
        if tag and tag not in seen:
            seen[tag] = None
        if len(seen) >= MAX_HASHTAGS_PER_POST:
            break
    return list(seen.keys())
