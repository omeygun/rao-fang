"""Label schema (spec §5). Mirror of app/src/config/aspects.ts — keep in sync."""

ASPECTS = [
    "walk_trail",
    "coffee_picking",
    "processing_roasting",
    "tasting",
    "guide_communication",
    "host_hospitality",
    "food",
    "price_value",
    "scenery",
    "logistics_directions",
    "group_size_timing",
    "purchase_interest",
    "other",
]
SENTIMENTS = ["positive", "negative", "mixed"]
LANGS = ["en", "zh", "ko", "th"]

ASPECT_DESCRIPTIONS = {
    "walk_trail": "the walk/hike through the farm, the trail, steepness, distance",
    "coffee_picking": "picking coffee cherries by hand",
    "processing_roasting": "processing (washing, drying, hulling) and roasting the coffee",
    "tasting": "the coffee tasting / cupping / drinking the coffee",
    "guide_communication": "explanations, language, how well the host/guide communicated",
    "host_hospitality": "warmth and hospitality of the host family",
    "food": "food or snacks served",
    "price_value": "price, value for money",
    "scenery": "views, landscape, nature",
    "logistics_directions": "getting there, directions, transport, pickup, parking",
    "group_size_timing": "group size, duration, schedule, start time, pacing",
    "purchase_interest": "wants to buy coffee beans or other farm products (or asks where/how to buy)",
    "other": "anything else relevant that fits none of the above",
}


def validate_row(r: dict) -> list[str]:
    """Return a list of problems with a labeled row (empty if valid)."""
    errs = []
    if not isinstance(r.get("text"), str) or not r["text"].strip():
        errs.append("empty text")
    if r.get("lang") not in LANGS:
        errs.append(f"bad lang {r.get('lang')}")
    seen = set()
    for a in r.get("aspects", []):
        if a.get("aspect") not in ASPECTS:
            errs.append(f"bad aspect {a.get('aspect')}")
        if a.get("sentiment") not in SENTIMENTS:
            errs.append(f"bad sentiment {a.get('sentiment')}")
        if a.get("aspect") in seen:
            errs.append(f"duplicate aspect {a.get('aspect')}")
        seen.add(a.get("aspect"))
    if not isinstance(r.get("is_suggestion"), bool):
        errs.append("is_suggestion not bool")
    return errs
