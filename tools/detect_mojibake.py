"""Detect double-encoded (mojibake) lines in source files.

A line is mojibake if it can be "repaired" by encoding it as latin-1 and
decoding the result as UTF-8 (the classic double-encoding round trip).
"""
import io
import os

ROOT = r"C:\Users\imperiex\AppData\Roaming\spicetify\band client tamper"


def collect_targets():
    """All .js sources (src/**) plus the built userscript."""
    out = []
    src = os.path.join(ROOT, "src")
    for base, _dirs, files in os.walk(src):
        for f in files:
            if f.endswith(".js"):
                rel = os.path.relpath(os.path.join(base, f), ROOT)
                out.append(rel.replace("\\", "/"))
    built = os.path.join(ROOT, "unbanded.user.js")
    if os.path.exists(built):
        out.append("unbanded.user.js")
    return sorted(out)


def is_mojibake(line):
    """True if line looks like UTF-8 bytes that were decoded as latin-1."""
    if not any(ord(c) > 0x7F for c in line):
        return False
    try:
        repaired = line.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return False
    # Repaired text must be "better": fewer suspicious Latin-1 box chars.
    def score(s):
        return sum(1 for c in s if 0x80 <= ord(c) <= 0xBF or ord(c) in (0xD4, 0xC7, 0xF6, 0x94))
    return score(repaired) < score(line)


def main():
    total = 0
    for rel in collect_targets():
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        try:
            raw = io.open(path, "rb").read()
        except OSError as e:
            print("SKIP", rel, e)
            continue
        bom = raw[:3] == b"\xef\xbb\xbf"
        crlf = raw.count(b"\r\n")
        lf = raw.count(b"\n")
        text = raw.decode("utf-8-sig")
        lines = text.split("\r\n") if "\r\n" in text else text.split("\n")
        print("=" * 70)
        print("FILE:", rel)
        print("  BOM=%s  CRLF=%d  LF-only=%d  bytes=%d" % (bom, crlf, lf - crlf, len(raw)))
        n = 0
        for i, line in enumerate(lines, 1):
            if is_mojibake(line):
                n += 1
                fixed = line.encode("latin-1").decode("utf-8")
                print("  L%-4d MOJI" % i)
                print("       now: %s" % line.strip()[:100])
                print("       fix: %s" % fixed.strip()[:100])
        print("  total mojibake lines:", n)
        total += n
    print("=" * 70)
    print("TOTAL MOJIBAKE LINES (all files):", total)
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
