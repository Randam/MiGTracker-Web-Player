import struct

def dump_all_sf2_presets(sf2_path):
    with open(sf2_path, "rb") as f:
        data = f.read()

    pdta_pos = data.find(b"pdta")
    phdr_pos = data.find(b"phdr", pdta_pos)
    chunk_size = struct.unpack("<I", data[phdr_pos+4:phdr_pos+8])[0]
    preset_headers = data[phdr_pos+8 : phdr_pos+8+chunk_size]

    num_presets = len(preset_headers) // 38
    print(f"Total Presets in '{sf2_path}': {num_presets}\n")

    presets = []
    for i in range(num_presets):
        entry = preset_headers[i*38 : (i+1)*38]
        name = entry[:20].decode("latin1", errors="ignore").rstrip("\x00")
        preset_num = struct.unpack("<H", entry[20:22])[0]
        bank_num = struct.unpack("<H", entry[22:24])[0]
        if name != "EOP":
            presets.append((bank_num, preset_num, name))

    presets.sort(key=lambda x: (x[0], x[1]))

    print("=== BANK 0 PRESETS ===")
    for bank, prog, name in presets:
        if bank == 0:
            print(f"  Bank {bank:3d} | Preset {prog:3d} (1-indexed {prog+1:3d}) => \"{name}\"")

    print("\n=== NON-ZERO BANK PRESETS ===")
    for bank, prog, name in presets:
        if bank != 0:
            print(f"  Bank {bank:3d} | Preset {prog:3d} (1-indexed {prog+1:3d}) => \"{name}\"")

dump_all_sf2_presets("./assets/AV_8MB.sf2")
