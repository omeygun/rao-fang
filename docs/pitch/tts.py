"""Narration: one ElevenLabs clip per scene (voice Matilda, eleven_multilingual_v2). Needs ELEVENLABS_API_KEY."""
import json, os, subprocess, urllib.request

key, voice = os.environ["ELEVENLABS_API_KEY"], "XrExE9yKIg1WjnnlVkGX"
n = json.load(open("narration.json"))
lengths = {}
for i, s in enumerate(n):
    body = {"text": s["text"], "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True}}
    if i > 0: body["previous_text"] = n[i - 1]["text"]
    if i < len(n) - 1: body["next_text"] = n[i + 1]["text"]
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
    open(f"vo/{s['id']}.mp3", "wb").write(urllib.request.urlopen(req).read())
    lengths[s["id"]] = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"vo/{s['id']}.mp3"]))
json.dump(lengths, open("vo/lengths.json", "w"))
json.dump({k: round(v + 2.0, 2) for k, v in lengths.items()}, open("durations.json", "w"))  # scene = clip + 2 s
