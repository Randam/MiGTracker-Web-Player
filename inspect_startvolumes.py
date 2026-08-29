import os

song_dir = "./songs"
files = ["AVALON10.MTP", "AVALON11.MTP", "AVALON19.MTP", "AVALON21.MTP"]

for filename in files:
    path = os.path.join(song_dir, filename)
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = [l.strip() for l in f if l.strip()]
    
    idx = 60 * 17 * 16
    positions = [int(lines[idx + i]) for i in range(200)]; idx += 200
    looppos = int(lines[idx]); idx += 1
    lastpos = int(lines[idx]); idx += 1
    startspeed = int(lines[idx]); idx += 1
    songname = lines[idx]; idx += 1
    
    vols = []
    for ch in range(16):
        sv = int(lines[idx]); idx += 1
        sm = int(lines[idx]); idx += 1
        vol = int(lines[idx]); idx += 1
        vols.append(vol)
    
    print(f"\nSong: \"{songname}\" ({filename})")
    print("  Initial Channel Volumes (startvolume):")
    for ch in range(15):
        print(f"    C{ch+1:02d}: startvolume={vols[ch]}")
