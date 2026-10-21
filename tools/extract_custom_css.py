import io, json, os, sqlite3, sys

DB = (r"C:\Users\imperiex\AppData\Roaming\Mozilla\Firefox\Profiles"
      r"\8syx6anw.default-release\storage\default\https+++www.band.us\ls\data.sqlite")
OUT = r"C:\Users\imperiex\AppData\Roaming\spicetify\band client tamper\tools\recovered_customCss.css"


def snappy_uncompress(buf):
    """Decode raw (framing-free) Snappy data."""
    shift = 0
    length = 0
    i = 0
    while True:
        b = buf[i]
        i += 1
        length |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7

    out = bytearray()
    n = len(buf)
    while i < n and len(out) < length:
        tag = buf[i]
        i += 1
        kind = tag & 0x03

        if kind == 0:  # literal
            ln = tag >> 2
            if ln < 60:
                ln += 1
            else:
                extra = ln - 59  # 1..4 bytes
                ln = int.from_bytes(buf[i:i + extra], "little") + 1
                i += extra
            out += buf[i:i + ln]
            i += ln

        elif kind == 1:  # copy with 1-byte offset
            ln = 4 + ((tag >> 2) & 0x07)
            off = ((tag >> 5) << 8) | buf[i]
            i += 1
            start = len(out) - off
            for k in range(ln):
                out.append(out[start + k])

        elif kind == 2:  # copy with 2-byte offset
            ln = (tag >> 2) + 1
            off = int.from_bytes(buf[i:i + 2], "little")
            i += 2
            start = len(out) - off
            for k in range(ln):
                out.append(out[start + k])

        else:  # copy with 4-byte offset
            ln = (tag >> 2) + 1
            off = int.from_bytes(buf[i:i + 4], "little")
            i += 4
            start = len(out) - off
            for k in range(ln):
                out.append(out[start + k])

    return bytes(out), length


def main():
    con = sqlite3.connect(DB)
    row = con.execute(
        "select value, utf16_length, conversion_type, compression_type "
        "from data where key = 'btt:customCss'"
    ).fetchone()
    if not row:
        sys.exit("cle btt:customCss introuvable")

    blob, u16, conv, comp = row
    print("blob=%d utf16_length=%s conv=%s comp=%s" % (len(blob), u16, conv, comp))

    raw, declared = snappy_uncompress(blob)
    print("decompresse: %d octets (annonce %d)" % (len(raw), declared))

    text = raw.decode("utf-8")
    print("--- 200 premiers caracteres (repr) ---")
    print(repr(text[:200]))

    # BTTStore JSON.stringify's every value -> the payload is a JSON string.
    try:
        css = json.loads(text)
        print("JSON parse OK -> type %s, len %d" % (type(css).__name__, len(css)))
    except Exception as e:
        print("JSON parse echoue (%s) -> ecriture du texte brut" % e)
        css = text

    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(css)
    print("ecrit: %s (%d octets)" % (OUT, os.path.getsize(OUT)))


main()
