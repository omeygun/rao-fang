"""File names per video. DECK=pitch (default) | demo | tech."""
import os

DECK = os.environ.get("DECK", "pitch")
P = "" if DECK == "pitch" else DECK + "."
NARRATION, DURATIONS, TIMELINE = f"{P}narration.json", f"{P}durations.json", f"{P}timeline.json"
VO = "vo" if DECK == "pitch" else f"vo-{DECK}"
OUT = "rao-fang-pitch.mp4" if DECK == "pitch" else f"rao-fang-{DECK}.mp4"
GAP = {"pitch": 2.0, "intro": 0.6}.get(DECK, 1.2)  # silence after each narration clip, seconds
SPEED = 1.0 if DECK == "pitch" else 1.08   # ElevenLabs speaking rate
