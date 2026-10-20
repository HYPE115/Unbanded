#!/usr/bin/env python3
"""Télécharge les GIFs de réaction depuis nekos.best (build-time uniquement).

Pour chaque commande :
  1. vide src/assets/reactions/<cmd>/ (les anciens GIFs Pillow sont perdus) ;
  2. interroge https://nekos.best/api/v2/<cmd>?amount=10 (max 20) ;
  3. télécharge 10 GIFs uniques et vérifie l'en-tête GIF87a/GIF89a ;
  4. les enregistre en 01.gif … 10.gif.

Contraintes API (docs.nekos.best) :
  - User-Agent obligatoire au format "AppName (contact)" — le format
    Mozilla/5.0 est explicitement refusé (provoque un challenge Cloudflare) ;
  - rate limit 200 requêtes/minute par catégorie (on reste très en dessous) ;
  - le téléchargement binaire passe par les mêmes URL que la réponse JSON.

Usage :
  python tools/fetch_reaction_gifs.py
  python tools/gen_reaction_bank.py   # régénère le manifest.json
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://nekos.best/api/v2"
UA = "UnbandedAssets (https://github.com/HYPE115/Unbanded)"

CMDS = [
    "hug", "cuddle", "slap", "tickle", "kiss", "poke", "bonk", "dance",
    "wave", "blush", "smile", "smug", "cry", "nom", "yeet", "wink",
    "laugh", "happy",
]

COUNT = 10
WORKERS = 8
GIF_MAGIC = (b"GIF87a", b"GIF89a")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "src", "assets", "reactions")


def http_get(url, as_json=False, retries=3):
    """GET avec le User-Agent exigé par nekos.best.

    En cas de 429 (rate limit), on respecte Retry-After (ou 30 s) avant de
    réessayer au lieu de marteler l'API.
    """
    data = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            break
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < retries:
                raw = exc.headers.get("Retry-After") if exc.headers else None
                try:
                    wait = int(raw) if raw else 30
                except (TypeError, ValueError):
                    wait = 30
                if wait > 120:
                    # Penalisation longue : inutile de bloquer, on échoue
                    # proprement pour relancer plus tard.
                    raise RuntimeError(
                        "rate limit actif (Retry-After %ds) — "
                        "relance plus tard" % wait)
                print("  429 rate-limited — pause %ds" % wait)
                time.sleep(wait)
                continue
            raise
    return json.loads(data) if as_json else data


def list_gif_urls(cmd, attempts=3):
    """Récolte jusqu'à COUNT URLs uniques de GIFs pour la catégorie."""
    urls = []
    seen = set()
    for _ in range(attempts):
        payload = http_get("%s/%s?amount=%d" % (API, cmd, COUNT), as_json=True)
        results = payload.get("results") or []
        for item in results:
            url = item.get("url") or ""
            if url and url not in seen:
                seen.add(url)
                urls.append(url)
        if len(urls) >= COUNT or not results:
            break
        time.sleep(0.3)
    return urls[:COUNT]


def download(url, dest):
    """Télécharge un GIF et vérifie qu'il s'agit bien d'un GIF."""
    data = http_get(url)
    if not data.startswith(GIF_MAGIC):
        raise ValueError("pas un GIF: %s" % url)
    with open(dest, "wb") as fh:
        fh.write(data)
    return len(data)


def fetch_cmd(cmd, problems):
    """Vide le dossier de la commande puis y écrit COUNT GIFs neufs."""
    out_dir = os.path.join(BANK, cmd)
    os.makedirs(out_dir, exist_ok=True)

    removed = 0
    for name in os.listdir(out_dir):
        path = os.path.join(out_dir, name)
        if os.path.isfile(path):
            os.remove(path)
            removed += 1

    written = {}  # index (1..COUNT) -> octets
    for _ in range(3):  # jusqu'à 3 passes si des téléchargements échouent
        if len(written) >= COUNT:
            break
        urls = list_gif_urls(cmd)
        todo = [(n, urls[n - 1]) for n in range(1, len(urls) + 1)
                if n not in written]
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {}
            for n, url in todo:
                dest = os.path.join(out_dir, "%02d.gif" % n)
                futures[pool.submit(download, url, dest)] = n
            for fut, n in futures.items():
                try:
                    written[n] = fut.result()
                except Exception as exc:  # noqa: BLE001 — loggué puis re-tenté
                    problems.append("%s/%02d: %s" % (cmd, n, exc))

    if len(written) < COUNT:
        problems.append("%s: %d/%d GIFs seulement"
                        % (cmd, len(written), COUNT))
    kb = sum(written.values()) / 1024.0
    print("%-7s removed %2d  ->  %2d gifs  %7.0f KB" % (
        cmd, removed, len(written), kb))
    return sum(written.values())


def main():
    if not os.path.isdir(BANK):
        print("missing bank dir: %s" % BANK)
        return 1
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    unknown = [a for a in args if a not in CMDS]
    if unknown:
        print("unknown command(s): %s" % ", ".join(unknown))
        return 2
    cmds = args or CMDS
    problems = []
    total = 0
    for i, cmd in enumerate(cmds):
        if i:
            # Limite globale ~200 req/min : 4 s entre catégories garde
            # une passe complète (~180 req) sous le seuil.
            time.sleep(4.0)
        total += fetch_cmd(cmd, problems)
    print("total: %.2f MB / %d files" % (total / 1048576.0,
                                         len(cmds) * COUNT))
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print("  " + p)
        return 1
    print("OK — now run: python tools/gen_reaction_bank.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
