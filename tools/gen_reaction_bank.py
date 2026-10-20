#!/usr/bin/env python3
"""Génère src/assets/reactions/manifest.json à partir des GIFs existants."""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "src", "assets", "reactions", "manifest.json")

CMDS = [
    "hug", "cuddle", "slap", "tickle", "kiss", "poke", "bonk", "dance",
    "wave", "blush", "smile", "smug", "cry", "nom", "yeet", "wink",
    "laugh", "happy",
]

COUNT = 10


def main():
    entries = []
    for cmd in CMDS:
        out_dir = os.path.join(ROOT, "src", "assets", "reactions", cmd)
        files = []
        for i in range(1, COUNT + 1):
            name = "%02d.gif" % i
            if os.path.exists(os.path.join(out_dir, name)):
                files.append(name)
        entries.append({"cmd": cmd, "files": files})
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(entries, fh, indent=2)
    total = sum(len(e["files"]) for e in entries)
    print("wrote", MANIFEST, len(entries), "commands", total, "files")


if __name__ == "__main__":
    main()
