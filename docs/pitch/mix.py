"""Find scene starts in video time from the marker strip, lay each narration clip 0.6 s after its scene starts,
crop the strip away, encode H.264 + AAC."""
import json, re, subprocess

t = json.load(open("timeline.json"))
info = subprocess.run(["ffmpeg", "-i", "rec/raw.webm", "-vf", "crop=256:12:0:1082,showinfo", "-f", "null", "-"],
                      capture_output=True, text=True).stderr
frames = []
for m in re.finditer(r"pts_time:([\d.]+).*?mean:\[(\d+) (\d+) (\d+)\]", info):
    ts, y, u, v = float(m[1]), *map(int, m.group(2, 3, 4))
    frames.append((ts, "r" if v > 200 and u < 130 else "b" if u > 200 and v < 160 else "g" if u < 100 and v < 100 else "?"))
starts, cur = [], "g"
for i in range(len(frames) - 2):
    c = frames[i][1]
    if c in "rb" and c != cur and frames[i + 1][1] == c == frames[i + 2][1]:  # colour held 3 frames = new scene
        starts.append(frames[i][0]); cur = c
n = len(t["scenes"])
assert len(starts) == n, f"found {len(starts)} scene markers, expected {n}"
lead, end = starts[0], starts[0] + (t["total"] - t["scenes"][-1]["at"]) + (starts[-1] - starts[0])
print("scene starts (video s):", " ".join(f"{s - lead:.1f}" for s in starts))
ins, filt = [], []
for i, s in enumerate(t["scenes"]):
    ins += ["-i", f"vo/{s['id']}.mp3"]
    ms = int((starts[i] - lead + 0.6) * 1000)
    filt.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
mix = "".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0,apad[aout]"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{lead:.3f}", "-i", "rec/raw.webm", *ins,
                "-filter_complex", "[0:v]crop=1920:1080:0:0[v];" + ";".join(filt) + ";" + mix, "-map", "[v]", "-map", "[aout]",
                "-t", f"{end - lead:.3f}", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
                "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "rao-fang-pitch.mp4"], check=True)
