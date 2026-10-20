#!/usr/bin/env python3
"""Asset preparation pipeline for the Unbanded "reactions" plugin.

Replaces the 18 live image-reaction API calls with local banks of 10 distinct
GIFs per reaction, served from the GitHub repo through jsDelivr.

Phases
------
  discover  sample the Otakugifs API to inventory distinct clips per command
  build     download -> convert (webp->gif) -> compress -> dedupe -> write
  manifest  regenerate assets/manifest.json from the built files

Why a build step exists
-----------------------
cdn.otakugifs.xyz serves no ``Access-Control-Allow-Origin`` header, so the
Band page cannot fetch those bytes with ``fetch() -> blob()``.  api.otakugifs.xyz
does send CORS headers but only returns one random URL per call, so it cannot
serve a stable bank either.  We therefore resolve and compress the clips
*offline*, commit them to the repo, and let the userscript pull them from
jsDelivr (which does send ``Access-Control-Allow-Origin: *``).

Usage
-----
  python tools/prepare-assets.py discover
  python tools/prepare-assets.py build
  python tools/prepare-assets.py manifest
"""
import hashlib
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
REACT_DIR = os.path.join(ASSETS, "reactions")
MANIFEST = os.path.join(ASSETS, "manifest.json")
CACHE = os.path.join(ROOT, ".tmp", "cache")
POOLS = os.path.join(ROOT, ".tmp", "pools.json")

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
}

API = "https://api.otakugifs.xyz/gif?reaction=%s&format=%s"

# The 18 image commands of src/plugins/reactions.js.  /pat is NOT here: it is
# generated locally by src/petpet-gif.js and must stay untouched.
COMMANDS = [
    "hug", "cuddle", "slap", "tickle", "kiss", "poke", "bonk", "dance",
    "wave", "blush", "smile", "smug", "cry", "nom", "yeet", "wink",
    "laugh", "happy",
]

# Otakugifs has no "bonk" or "yeet" category, and "tickle" alone is thin.
# Each command lists its sources in priority order: the nominal category
# first, then the closest semantic matches.  The CLI command name is
# untouched -- only the source imagery changes.
SOURCE_FALLBACKS = {
    "bonk": ["punch", "smack", "bite", "mad", "angrystare", "facepalm"],
    "yeet": ["yay", "celebrate", "cheers", "clap", "shout", "thumbsup"],
    "tickle": ["tickle", "pinch", "nuzzle", "love", "airkiss", "lick"],
}

PER_COMMAND = 10          # distinct clips per command
MAX_WIDTH = 220           # px, longest side of the stored GIF
COLORS = 128              # palette size
STRIDE = 2                # keep every Nth source frame
FRAME_MS = 100            # frame duration after stride
MIN_HAMMING = 6           # dHash bits; <= this means "visually the same"
DISCOVER_TRIES = int(os.environ.get("DISCOVER_TRIES", "150"))


def sources_for(cmd):
    """Source categories for a command, in priority order."""
    if cmd in SOURCE_FALLBACKS:
        return [cmd] + SOURCE_FALLBACKS[cmd]
    return [cmd]


def log(msg):
    print(msg, flush=True)



# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------
def fetch(url, timeout=45, retries=4):
    """GET with serial retry.  The CDN answers HTTP 428 when hit in parallel."""
    delay = 1.0
    last = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (428, 429, 502, 503, 504):
                time.sleep(delay)
                delay = min(delay * 2, 12.0)
                continue
            raise
        except Exception as e:  # network hiccup
            last = e
            time.sleep(delay)
            delay = min(delay * 2, 12.0)
    raise last if last else RuntimeError("fetch failed: " + url)


def clip_id(url):
    """Stable identity of a clip: the basename without extension.

    Otakugifs serves the same clip under the same id for every format
    (gifs/<id>.gif, webps/<id>.webp), so the id is what we dedupe on.
    """
    return url.rsplit("/", 1)[-1].rsplit(".", 1)[0]


def api_sample(reaction, fmt, tries):
    """Sample the API; return the list of clip URLs it exposes."""
    out, seen = [], set()
    for _ in range(tries):
        try:
            raw = fetch(API % (reaction, fmt), timeout=20, retries=3)
            url = json.loads(raw).get("url") or ""
            if url and url not in seen:
                seen.add(url)
                out.append(url)
        except Exception:
            pass
        time.sleep(0.03)
    return out


def pool_urls(pools, src, fmt):
    """URL list for a source category, tolerating both pool layouts."""
    d = pools.get(src, {})
    if not isinstance(d, dict):
        return []
    v = d.get(fmt) or []
    if isinstance(v, dict):          # {clip_id: url}
        return list(v.values())
    return list(v)                    # [url, ...]


# --------------------------------------------------------------------------
# Phase 1: discover
# --------------------------------------------------------------------------
def phase_discover():
    jobs = []
    for cmd in COMMANDS:
        for src in sources_for(cmd):
            jobs.append((src, "gif"))
            jobs.append((src, "webp"))

    pools = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(api_sample, src, fmt, DISCOVER_TRIES): (src, fmt)
                for src, fmt in jobs}
        for fut, key in futs.items():
            src, fmt = key
            pools.setdefault(src, {})[fmt] = fut.result()

    lines, short = [], []
    for cmd in COMMANDS:
        best, best_n = None, 0
        for src in sources_for(cmd):
            g = pool_urls(pools, src, "gif")
            w = pool_urls(pools, src, "webp")
            union = len(set(g) | set(w))
            lines.append("  %-8s <- %-12s gif=%3d webp=%3d union=%3d" % (
                cmd, src, len(g), len(w), union))
            if union > best_n:
                best, best_n = src, union
        lines.append("%-8s BEST src=%-12s distinct=%d %s" % (
            cmd, best, best_n, "<<SHORT" if best_n < PER_COMMAND else "OK"))
        if best_n < PER_COMMAND:
            short.append(cmd)

    os.makedirs(os.path.dirname(POOLS), exist_ok=True)
    json.dump(pools, open(POOLS, "w"), indent=1)

    log("\n".join(lines))
    log("\nshort commands: %s" % (short or "none"))
    log("wrote %s" % POOLS)
    return 0 if not short else 1



# --------------------------------------------------------------------------
# Phase 2: build
# --------------------------------------------------------------------------
def to_gif(raw):
    """Normalise any source clip (gif/webp) into a compressed PIL GIF."""
    from PIL import Image

    im = Image.open(io.BytesIO(raw))
    n = getattr(im, "n_frames", 1)
    frames = []
    for i in range(n):
        im.seek(i)
        f = im.convert("RGB")
        if f.width > MAX_WIDTH:
            f = f.resize(
                (MAX_WIDTH, max(1, int(f.height * MAX_WIDTH / f.width))),
                Image.LANCZOS)
        frames.append(f)
    if not frames:
        raise ValueError("no frames")

    keep = frames[::STRIDE] or frames[:1]
    quant = [f.quantize(colors=COLORS, method=Image.MEDIANCUT, dither=Image.NONE)
             for f in keep]
    bio = io.BytesIO()
    quant[0].save(bio, "GIF", save_all=True, append_images=quant[1:],
                   duration=FRAME_MS, loop=0, optimize=True, disposal=2)
    return bio.getvalue(), len(keep), n


def dhash(gif_bytes, size=8):
    """Difference hash of the first frame: a 64-bit perceptual fingerprint.

    A raw pixel hash only catches byte-identical clips.  Two renditions of the
    same drawing (gif vs webp, different palette) differ byte-wise but are
    visually the same, so we hash *structure* instead: the sign of the
    horizontal gradient of a 9x8 grayscale thumbnail.
    """
    from PIL import Image
    im = Image.open(io.BytesIO(gif_bytes))
    im.seek(0)
    g = im.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for row in range(size):
        base = row * (size + 1)
        for col in range(size):
            bits <<= 1
            if px[base + col] > px[base + col + 1]:
                bits |= 1
    return bits


def hamming(a, b):
    return bin(a ^ b).count("1")


def frame_signature(gif_bytes):
    """Perceptual fingerprint used to reject near-duplicate clips."""
    return dhash(gif_bytes)


def cache_path(url):
    return os.path.join(CACHE, clip_id(url) + ".bin")


def load_cached(url):
    p = cache_path(url)
    if os.path.exists(p):
        with open(p, "rb") as fh:
            return fh.read()
    return None


def store_cached(url, raw):
    os.makedirs(CACHE, exist_ok=True)
    with open(cache_path(url), "wb") as fh:
        fh.write(raw)


def build_candidates(pools):
    """Per command, the ordered list of candidate clip URLs to consider.

    Order matters: the nominal source category comes first, then the
    fallbacks, and within a category the gif format is preferred (already
    GIF, no re-encode) before webp.  Otakugifs keeps separate gif and webp
    pools, so both are valid - and different - sources of drawings.
    """
    candidates = {}
    for cmd in COMMANDS:
        seen, order = set(), []
        for src in sources_for(cmd):
            for fmt in ("gif", "webp"):
                for url in pool_urls(pools, src, fmt):
                    if url not in seen:
                        seen.add(url)
                        order.append(url)
        candidates[cmd] = order
    return candidates


def phase_build():
    if not os.path.exists(POOLS):
        raise SystemExit("run the discover phase first")
    pools = json.load(open(POOLS))
    candidates = build_candidates(pools)

    # 1. Download every distinct clip once (serial: the CDN throttles).
    all_urls, seen = [], set()
    for cmd in COMMANDS:
        for url in candidates[cmd]:
            if url not in seen:
                seen.add(url)
                all_urls.append(url)

    log("clips to fetch: %d" % len(all_urls))
    raw_cache = {}
    for done, url in enumerate(all_urls, 1):
        raw = load_cached(url)
        if raw is None:
            try:
                raw = fetch(url)
                store_cached(url, raw)
            except Exception as e:
                log("  FAIL %s (%s)" % (clip_id(url), e))
                continue
        raw_cache[url] = raw
        if done % 25 == 0:
            log("  %d/%d" % (done, len(all_urls)))
    log("fetched %d/%d" % (len(raw_cache), len(all_urls)))

    # 2. Convert + compress each clip once, and record its signature.
    gifs, sigs = {}, {}
    for url, raw in raw_cache.items():
        try:
            gif, kept, total = to_gif(raw)
        except Exception as e:
            log("  CONV FAIL %s (%s)" % (clip_id(url), e))
            continue
        gifs[url] = gif
        try:
            sigs[url] = frame_signature(gif)
        except Exception:
            sigs[url] = hashlib.sha1(gif).hexdigest()

    # 3. Pick PER_COMMAND distinct clips per command.
    manifest = {"version": 1, "commands": {}}
    total_bytes = 0
    for cmd in COMMANDS:
        out_dir = os.path.join(REACT_DIR, cmd)
        os.makedirs(out_dir, exist_ok=True)
        for old in os.listdir(out_dir):
            if old.endswith(".gif"):
                os.remove(os.path.join(out_dir, old))

        chosen, entries = [], []
        for url in candidates[cmd]:
            if len(chosen) >= PER_COMMAND:
                break
            gif = gifs.get(url)
            if not gif:
                continue
            sig = sigs.get(url)
            # reject a clip that is perceptually the same as one already taken
            if any(hamming(sig, s) <= MIN_HAMMING for _, _, s in chosen):
                continue
            chosen.append((url, gif, sig))

        for idx, (url, gif, _sig) in enumerate(chosen, 1):
            name = "%02d.gif" % idx
            with open(os.path.join(out_dir, name), "wb") as fh:
                fh.write(gif)
            total_bytes += len(gif)
            entries.append({
                "file": "reactions/%s/%s" % (cmd, name),
                "bytes": len(gif),
                "clip": clip_id(url),
            })

        status = "OK" if len(chosen) >= PER_COMMAND else "SHORT(%d)" % len(chosen)
        log("  %-8s %2d clips %-10s %6.1f KB" % (
            cmd, len(chosen), status,
            sum(e["bytes"] for e in entries) / 1024.0))
        manifest["commands"][cmd] = entries

    json.dump(manifest, open(MANIFEST, "w"), indent=1)
    log("total assets: %.2f MB" % (total_bytes / 1048576.0))
    log("wrote %s" % MANIFEST)
    return 0


# --------------------------------------------------------------------------
# Phase 3: manifest
# --------------------------------------------------------------------------
def phase_manifest():
    """Rebuild assets/manifest.json from the files actually on disk."""
    manifest = {"version": 1, "commands": {}}
    total = 0
    for cmd in COMMANDS:
        d = os.path.join(REACT_DIR, cmd)
        entries = []
        for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if not name.endswith(".gif"):
                continue
            p = os.path.join(d, name)
            size = os.path.getsize(p)
            total += size
            entries.append({"file": "reactions/%s/%s" % (cmd, name),
                            "bytes": size})
        manifest["commands"][cmd] = entries
        log("  %-8s %2d files %6.1f KB" % (
            cmd, len(entries), sum(e["bytes"] for e in entries) / 1024.0))
    json.dump(manifest, open(MANIFEST, "w"), indent=1)
    log("total: %.2f MB" % (total / 1048576.0))
    log("wrote %s" % MANIFEST)
    return 0


def main(argv):
    phase = argv[1] if len(argv) > 1 else "build"
    if phase == "discover":
        return phase_discover()
    if phase == "build":
        return phase_build()
    if phase == "manifest":
        return phase_manifest()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
