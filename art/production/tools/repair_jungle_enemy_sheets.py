"""Rebuild the La Jungla enemy atlases (v1 -> v2) without redrawing any pose.

v1 was sliced on a fixed 256 px grid, so three poses overflowed into their
neighbour cell: Garbanzo's spear tip, the back half of Sapo Pota's vomiting
body, a toe of the defeated Sapo and a sliver of the fallen Arbol's canopy.
This script moves each stray fragment back to the pose it belongs to (their
seam columns meet the pose again once v1's transparent gutter is closed),
then re-centres every pose on one horizontal pivot inside wider cells so the
body never jumps sideways when the clip changes. Vertical placement is kept
exactly: every baseline stays where v1 put it.

Requires Pillow, numpy and scipy:
    python3 art/production/tools/repair_jungle_enemy_sheets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[3]
CHARACTERS = ROOT / 'public' / 'assets' / 'characters'
SOURCES = ROOT / 'art' / 'production' / 'sources'
SOURCE_CELL = 256
MARGIN = 4  # transparent padding every v2 pose keeps from its cell edge

# (row, column) of a v1 cell -> horizontal pivot in that cell's coordinates.
# The pivot is the centre of the body mass that stands on the ground (egg
# body for Garbanzo, trunk and roots for Arbol, seated body for Sapo).
SHEETS = {
    'garbanzo-loco': {
        'cell_width': 352,
        'pivots': {
            (0, 0): 142, (0, 1): 146, (0, 2): 136, (0, 3): 132,
            (1, 0): 126, (1, 1): 143, (1, 2): 132, (1, 3): 136,
        },
        # The spear tip of `attack` (r1c0) was sliced into `hurt` (r1c1).
        'fragments': [{'from': (1, 1), 'x': (4, 43), 'to': (1, 0), 'dx': 248}],
    },
    'arbol-pocho': {
        'cell_width': 288,
        # Roots stay planted: punches and the hurt sway are aligned by the
        # roots, and the fallen tree keeps its root end where the trunk stood.
        'pivots': {
            (0, 0): 136, (0, 1): 127, (0, 2): 118, (0, 3): 89,
            (1, 0): 160, (1, 1): 134, (1, 2): 103, (1, 3): 146,
        },
        # The leftmost canopy sliver of `defeat` (r1c3) sat inside `hurt`.
        'fragments': [{'from': (1, 2), 'x': (200, 220), 'to': (1, 3), 'dx': -186}],
    },
    'sapo-pota': {
        'cell_width': 400,
        # Eyes stay put while the Sapo rises and sinks; the attack, hurt and
        # defeat poses keep the seated body over the same patch of water.
        'pivots': {
            (0, 0): 145, (0, 1): 131, (0, 2): 128, (0, 3): 132,
            (1, 0): 222, (1, 1): 166, (1, 2): 128, (1, 3): 126,
        },
        # The back of the vomiting body (r1c0) sat inside `hurt` (r1c1); a toe
        # of `defeat` (r1c3) sat inside `submerge` (r1c2).
        'fragments': [
            {'from': (1, 1), 'x': (4, 61), 'to': (1, 0), 'dx': 248},
            {'from': (1, 2), 'x': (246, 251), 'to': (1, 3), 'dx': -248},
        ],
    },
}


def cell_of(atlas, row, column):
    y = row * SOURCE_CELL
    x = column * SOURCE_CELL
    return atlas[y:y + SOURCE_CELL, x:x + SOURCE_CELL].copy()


def fragment_mask(cell, x_range):
    """Every connected component lying entirely inside the x range."""
    mask = cell[..., 3] > 0
    labels, count = ndimage.label(mask, structure=np.ones((3, 3)))
    selected = np.zeros_like(mask)
    for index, box in enumerate(ndimage.find_objects(labels), start=1):
        if box[1].start >= x_range[0] and box[1].stop - 1 <= x_range[1]:
            selected |= labels == index
    if not selected.any():
        raise ValueError(f'no fragment inside x={x_range}')
    return selected


def rebuild(name, spec):
    source = SOURCES / f'enemy-{name}-sheet-v1.png'
    atlas = np.array(Image.open(source).convert('RGBA'))
    rows = atlas.shape[0] // SOURCE_CELL
    columns = atlas.shape[1] // SOURCE_CELL
    poses = {}
    for row in range(rows):
        for column in range(columns):
            cell = cell_of(atlas, row, column)
            # Pose canvas three cells wide: index SOURCE_CELL is the v1 x = 0.
            canvas = np.zeros((SOURCE_CELL, SOURCE_CELL * 3, 4), np.uint8)
            canvas[:, SOURCE_CELL:SOURCE_CELL * 2] = cell
            poses[(row, column)] = canvas

    for fragment in spec['fragments']:
        donor = poses[fragment['from']]
        donor_cell = donor[:, SOURCE_CELL:SOURCE_CELL * 2]
        mask = fragment_mask(donor_cell, fragment['x'])
        pixels = donor_cell.copy()
        donor_cell[mask] = 0
        # `dx` places the fragment so its seam column meets the pose again;
        # the silhouettes continue within 0-3 px on every seam.
        ys, xs = np.nonzero(mask)
        poses[fragment['to']][ys, xs + SOURCE_CELL + fragment['dx']] = pixels[ys, xs]

    cell_width = spec['cell_width']
    out = np.zeros((rows * SOURCE_CELL, columns * cell_width, 4), np.uint8)
    for (row, column), canvas in poses.items():
        pivot = spec['pivots'][(row, column)] + SOURCE_CELL
        left = pivot - cell_width // 2
        piece = canvas[:, left:left + cell_width]
        opaque = np.nonzero(canvas[..., 3])[1]
        assert opaque.min() >= left + MARGIN and opaque.max() < left + cell_width - MARGIN, (
            f'{name} r{row}c{column} does not fit a {cell_width}px cell around its pivot'
        )
        out[row * SOURCE_CELL:(row + 1) * SOURCE_CELL,
            column * cell_width:(column + 1) * cell_width] = piece

    out[..., 3] = np.where(out[..., 3] > 0, 255, 0)
    out[out[..., 3] == 0] = 0
    target = CHARACTERS / f'enemy-{name}-sheet-v2.png'
    Image.fromarray(out, 'RGBA').save(target, optimize=True)
    print(f'{target.relative_to(ROOT)}: {out.shape[1]}x{out.shape[0]}')


if __name__ == '__main__':
    for sheet_name, sheet_spec in SHEETS.items():
        rebuild(sheet_name, sheet_spec)
