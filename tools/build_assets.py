#!/usr/bin/env python3
"""Génère des GIFs animés locaux pour le plugin reactions (banque d'images).

Fallback hors-ligne : la banque principale est récupérée via
tools/fetch_reaction_gifs.py (nekos.best, 10 GIFs réels par commande).

Chaque commande a 10 GIFs de 64x64 avec une animation simple (2 frames
décalées) et un motif de couleur différent. Les GIFs sont écrits dans
src/assets/reactions/{cmd}/%02d.gif.
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REACT_DIR = os.path.join(ROOT, "src", "assets", "reactions")

CMDS = [
    "hug", "cuddle", "slap", "tickle", "kiss", "poke", "bonk", "dance",
    "wave", "blush", "smile", "smug", "cry", "nom", "yeet", "wink",
    "laugh", "happy",
]

# Couleurs de base pour chaque commande (R, G, B)
COLORS = {
    "hug": (255, 200, 100),
    "cuddle": (150, 200, 255),
    "slap": (255, 150, 150),
    "tickle": (255, 220, 150),
    "kiss": (255, 120, 180),
    "poke": (150, 220, 150),
    "bonk": (220, 200, 255),
    "dance": (150, 255, 150),
    "wave": (255, 255, 150),
    "blush": (255, 180, 180),
    "smile": (150, 220, 255),
    "smug": (255, 180, 100),
    "cry": (150, 200, 255),
    "nom": (255, 200, 100),
    "yeet": (150, 255, 150),
    "wink": (255, 220, 220),
    "laugh": (255, 180, 100),
    "happy": (150, 220, 255),
}

WIDTH = 64
HEIGHT = 64


def make_frame(color, offset_x=0, offset_y=0):
    """Crée un cadre du GIF avec un motif simple (cercle + barre)."""
    img = Image.new("RGB", (WIDTH, HEIGHT), color)
    draw = ImageDraw.Draw(img)
    cx = WIDTH // 2
    cy = HEIGHT // 2
    r = 18
    draw.ellipse([cx - r + offset_x, cy - r + offset_y,
                  cx + r + offset_x, cy + r + offset_y], fill=(255, 255, 255))
    bar_h = 6
    draw.rectangle([cx - 8 + offset_x, cy + r + 4 + offset_y,
                    cx + 8 + offset_x, cy + r + 4 + bar_h + offset_y],
                   fill=(0, 0, 0))
    return img


def build():
    for cmd in CMDS:
        out_dir = os.path.join(REACT_DIR, cmd)
        os.makedirs(out_dir, exist_ok=True)
        base = COLORS[cmd]
        for i in range(10):
            # Deux frames pour l'animation : décalage horizontal/vertical
            frame1 = make_frame(
                base, offset_x=(i % 3) - 1, offset_y=(i % 2) - 1)
            frame2 = make_frame(
                base, offset_x=(i % 3) + 1, offset_y=(i % 2) + 1)
            frames = [frame1, frame2]
            # Éjecter les doublons pour garder les GIFs animés
            if frames[0].tobytes() == frames[1].tobytes():
                frames = [frame1]
            path = os.path.join(out_dir, "%02d.gif" % (i + 1))
            frames[0].save(
                path,
                save_all=True,
                append_images=frames[1:],
                duration=120,
                loop=0,
                optimize=True,
            )
    print("built", REACT_DIR)


if __name__ == "__main__":
    build()
