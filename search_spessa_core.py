with open("./mtp-player/lib/spessasynth_core.js", "r", encoding="utf-8") as f:
    core_code = f.read()

import re

matches = re.findall(r".{0,40}(?:processMessage|midiMessage|noteOn).{0,40}", core_code)
print(f"Found {len(matches)} matches in core_code:")
for m in matches[:10]:
    print(" ", m.strip())
