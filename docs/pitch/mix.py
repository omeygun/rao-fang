"""Trim the recording, lay each narration clip 0.6 s after its scene starts, encode H.264 + AAC."""
import json, subprocess

t = json.load(open("timeline.json"))
ins, filt = [], []
for i, s in enumerate(t["scenes"]):
    ins += ["-i", f"vo/{s['id']}.mp3"]
    ms = int((s["at"] + 0.6) * 1000)
    filt.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
mix = "".join(f"[a{i}]" for i in range(len(t["scenes"]))) + f"amix=inputs={len(t['scenes'])}:normalize=0,apad[aout]"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(t["lead"]), "-i", "rec/raw.webm", *ins,
                "-filter_complex", ";".join(filt) + ";" + mix, "-map", "0:v", "-map", "[aout]", "-t", str(t["total"]),
                "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
                "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "rao-fang-pitch.mp4"], check=True)
