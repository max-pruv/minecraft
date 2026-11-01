"""Extrait les matières des scans fournis, sans embarquer leurs maillages.

Usage : python scripts/preparer-nature.py /chemin/des/sources
Pillow et numpy sont nécessaires. Coordonnées des découpes dans un aperçu
de 1500 px. La décomposition périodique enlève la couture, pas le grain.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter

source = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / 'vendor/nature'
destination.mkdir(exist_ok=True)
N = 512

def extrait(fichier, boite):
    image = Image.open(source / fichier).convert('RGB')
    e = image.width / 1500
    return image.crop(tuple(round(v * e) for v in boite)).resize((N, N), Image.Resampling.LANCZOS)

def periodique(image):
    a = np.asarray(image, dtype=float) / 255
    v = np.zeros_like(a)
    v[0] = a[-1] - a[0]
    v[-1] = a[0] - a[-1]
    v[:, 0] += a[:, -1] - a[:, 0]
    v[:, -1] += a[:, 0] - a[:, -1]
    y, x = np.mgrid[:N, :N]
    denom = 2 * np.cos(2 * np.pi * x / N) + 2 * np.cos(2 * np.pi * y / N) - 4
    denom[0, 0] = 1
    f = np.fft.fft2(v, axes=(0, 1)) / denom[:, :, None]
    f[0, 0] = 0
    return np.clip(a - np.fft.ifft2(f, axes=(0, 1)).real, 0, 1)

champ = 'field_and_garden/textures/material_0_baseColor.jpeg'
alpes = 'alplandschaft_rossmatt_glarus_gl/textures/material0_baseColor.jpeg'
alpes_riviere = 'alplandschaft_rossmatt_glarus_gl/textures/material1_baseColor.jpeg'
route = 'mountain_road/textures/20260124_008_RC_LOD0_u0_v0_baseColor.png'
prairie = periodique(extrait(champ, (820, 560, 990, 730))) * np.array([.82,.88,.78])
alpage = periodique(extrait(alpes_riviere, (1070, 1000, 1180, 1110)))
terre = periodique(extrait(champ, (560, 130, 740, 310)))
eboulis = periodique(extrait(alpes_riviere, (865, 195, 930, 260)))
# Le scan de la route contient des îlots UV et de la végétation vus du ciel :
# seule sa palette minérale est reprise, pour ne jamais peindre de petits
# arbres ni les triangles de sa reconstruction sur une falaise du jeu.
palette = np.mean(np.asarray(extrait(route, (200,210,280,290))), axis=(0,1)) / 255
roche = np.mean(eboulis,axis=2)[:, :, None] * (.8 + palette*.4)
gris = np.mean(terre, axis=2)[:, :, None]
sec = np.mean(prairie, axis=2)[:, :, None] * np.array([1.38, 1.16, .72])
sable = .58 + (gris - gris.mean()) * .36
neige = .84 + (gris - gris.mean()) * .2
matieres = [prairie, alpage, sec, terre, eboulis, roche,
            sable * np.array([1.18, 1.06, .84]), neige * np.array([.96, .985, 1.02])]
atlas = Image.new('RGBA', (N * 4, N * 2))
for i, a in enumerate(matieres):
    a = np.clip(a, 0, 1)
    # Un relief de détail dérivé de la luminance ; ce n'est pas une normale
    # photogrammétrique mesurée. L'éclairage est calculé dans le shader.
    lum = a @ np.array([.2126, .7152, .0722])
    flou = np.asarray(Image.fromarray(np.uint8(lum * 255)).filter(ImageFilter.GaussianBlur(5))) / 255
    hauteur = np.clip(.5 + (lum - flou) * 1.6, .05, .95)
    pixels = Image.fromarray(np.uint8(np.dstack([a, hauteur]) * 255))
    coeur = np.asarray(pixels.resize((N-16,N-16),Image.Resampling.LANCZOS))
    # Gouttière périodique de huit pixels : la marge du shader ne coupe pas
    # la matière ; elle retrouve le début/fin de la même image.
    tuile = Image.fromarray(np.pad(coeur,((8,8),(8,8),(0,0)),mode='wrap'))
    atlas.paste(tuile, ((i % 4) * N, (i // 4) * N))
atlas.save(destination / 'sols-v1.webp', quality=92, method=6, exact=True)
print(destination / 'sols-v1.webp')
