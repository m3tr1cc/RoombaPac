"""Build the production furniture atlas and QA contact sheet.

Requires Pillow 12 or newer. Generated coordinates are committed so this script
is an asset-maintenance tool, not part of the Vite production build.
"""

from __future__ import annotations

import colorsys
import json
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ATLAS = ROOT / "art/furniture-v2/legacy-furniture-atlas.png"
OUTPUT_ATLAS = ROOT / "public/assets/game/roombapac-furniture-v2.png"
GENERATED_TS = ROOT / "src/game/furnitureAtlas.generated.ts"
CONTACT_SHEET = ROOT / "docs/qa/furniture-v2-contact-sheet.png"
SPRITE_SOURCE = ROOT / "src/game/furnitureSprites.ts"
ART_DIR = ROOT / "art/furniture-v2"

REFERENCE_CELL = 96
ATLAS_EDGE = 4096
GUTTER = 4
FRAME_MARGIN = 6


@dataclass(frozen=True)
class SpriteSource:
    id: str
    rect: tuple[int, int, int, int]
    footprint: tuple[int, int]
    family: str


@dataclass
class PackedFrame:
    key: str
    image: Image.Image
    rect: list[int] | None = None


def catalog() -> list[SpriteSource]:
    text = SPRITE_SOURCE.read_text(encoding="utf-8")
    pattern = re.compile(
        r"sprite\('([^']+)', \[(\d+), (\d+), (\d+), (\d+)\], "
        r"\[(\d+), (\d+)\], '([^']+)'"
    )
    sprites = [
        SpriteSource(
            match.group(1),
            tuple(int(match.group(index)) for index in range(2, 6)),
            (int(match.group(6)), int(match.group(7))),
            match.group(8),
        )
        for match in pattern.finditer(text)
    ]
    if len(sprites) != 75:
        raise RuntimeError(f"Expected 75 furniture definitions, found {len(sprites)}")
    return sprites


def alpha_crop(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError("Generated source contains no opaque pixels")
    return image.crop(bounds)


def board_frames(name: str) -> list[Image.Image]:
    board = Image.open(ART_DIR / name).convert("RGBA")
    half_width, half_height = board.width // 2, board.height // 2
    boxes = [
        (0, 0, half_width, half_height),
        (half_width, 0, board.width, half_height),
        (0, half_height, half_width, board.height),
        (half_width, half_height, board.width, board.height),
    ]
    return [alpha_crop(board.crop(box)) for box in boxes]


MASTER_FRAMES = {
    "armchair": board_frames("armchair-directions.png"),
    "appliance": board_frames("appliance-directions.png"),
    "boundary": board_frames("boundary-directions.png"),
    "corner": board_frames("corner-directions.png"),
    "dresser": board_frames("dresser-directions.png"),
    "sofa": board_frames("sofa-directions.png"),
    "table": board_frames("table-directions.png"),
}
# The corner board is laid out spatially (top-left, top-right, bottom-left,
# bottom-right); quarter turns need the two lower quadrants in reverse order.
MASTER_FRAMES["corner"] = [
    MASTER_FRAMES["corner"][0],
    MASTER_FRAMES["corner"][1],
    MASTER_FRAMES["corner"][3],
    MASTER_FRAMES["corner"][2],
]


def master_for(sprite: SpriteSource) -> str | None:
    longest = max(sprite.footprint)
    if sprite.family == "chair":
        return "armchair"
    if sprite.family == "sofa" and longest >= 2:
        return "sofa"
    if sprite.family == "cabinet" and longest >= 2:
        return "dresser"
    if sprite.family == "table" and longest >= 2:
        return "table"
    if sprite.family == "appliance" and longest >= 2:
        return "appliance"
    if sprite.family == "corner" and sprite.id.startswith(("green-", "blue-")):
        return "corner"
    return None


def target_hue(sprite_id: str) -> float | None:
    if "red" in sprite_id:
        return 0.99
    if "blue" in sprite_id:
        return 0.61
    if "orange" in sprite_id:
        return 0.075
    if "beige" in sprite_id or "stone" in sprite_id or "white" in sprite_id:
        return 0.11
    if "green" in sprite_id or "garden" in sprite_id:
        return 0.25
    return None


def tint(image: Image.Image, sprite_id: str) -> Image.Image:
    hue = target_hue(sprite_id)
    if hue is None:
        return image.copy()
    tinted = image.copy()
    pixels = tinted.load()
    for y in range(tinted.height):
        for x in range(tinted.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            source_hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
            # Recolor upholstery/paint while retaining walnut, metal, plants, and highlights.
            is_green_material = 0.14 <= source_hue <= 0.48 and saturation >= 0.22
            if not is_green_material:
                continue
            target_saturation = saturation if hue not in (0.11,) else saturation * 0.28
            out = colorsys.hsv_to_rgb(hue, target_saturation, value)
            pixels[x, y] = tuple(round(channel * 255) for channel in out) + (alpha,)
    return tinted


def oriented_size(footprint: tuple[int, int], rotation: int) -> tuple[int, int]:
    width, height = footprint
    if rotation % 2:
        width, height = height, width
    return width * REFERENCE_CELL, height * REFERENCE_CELL


def fit_frame(image: Image.Image, size: tuple[int, int], generated: bool) -> Image.Image:
    target_width, target_height = size
    available_width = max(1, target_width - FRAME_MARGIN * 2)
    available_height = max(1, target_height - FRAME_MARGIN * 2)
    scale = min(available_width / image.width, available_height / image.height)
    width = max(1, round(image.width * scale))
    height = max(1, round(image.height * scale))
    if generated and scale < 1:
        resample = Image.Resampling.LANCZOS
    else:
        resample = Image.Resampling.NEAREST
    resized = image.resize((width, height), resample)
    frame = Image.new("RGBA", size)
    frame.alpha_composite(resized, ((target_width - width) // 2, (target_height - height) // 2))
    return frame


def legacy_orientations(source: Image.Image) -> list[Image.Image]:
    return [
        source.copy(),
        source.transpose(Image.Transpose.ROTATE_270),
        source.transpose(Image.Transpose.ROTATE_180),
        source.transpose(Image.Transpose.ROTATE_90),
    ]


def sprite_frames(source_atlas: Image.Image, sprite: SpriteSource) -> list[Image.Image]:
    master_name = master_for(sprite)
    if master_name:
        sources = [tint(frame, sprite.id) for frame in MASTER_FRAMES[master_name]]
        generated = True
    else:
        x, y, width, height = sprite.rect
        sources = legacy_orientations(alpha_crop(source_atlas.crop((x, y, x + width, y + height))))
        generated = False
    return [
        fit_frame(source, oriented_size(sprite.footprint, rotation), generated)
        for rotation, source in enumerate(sources)
    ]


def cage_frame() -> Image.Image:
    source = alpha_crop(Image.open(ART_DIR / "pet-cage.png").convert("RGBA"))
    return fit_frame(source, (7 * REFERENCE_CELL, 5 * REFERENCE_CELL), True)


def boundary_frames(variant: int) -> list[Image.Image]:
    brightness = [0.82, 0.94, 1.05, 1.16][variant]
    color = [0.82, 0.95, 1.0, 1.08][variant]
    frames = []
    for source in MASTER_FRAMES["boundary"]:
        adjusted = ImageEnhance.Brightness(source).enhance(brightness)
        adjusted = ImageEnhance.Color(adjusted).enhance(color)
        frames.append(fit_frame(adjusted, (REFERENCE_CELL, REFERENCE_CELL), True))
    return frames


def pack(frames: list[PackedFrame]) -> Image.Image:
    atlas = Image.new("RGBA", (ATLAS_EDGE, ATLAS_EDGE))
    x = GUTTER
    y = GUTTER
    row_height = 0
    for packed in sorted(frames, key=lambda item: (-item.image.height, -item.image.width, item.key)):
        width, height = packed.image.size
        if x + width + GUTTER > ATLAS_EDGE:
            x = GUTTER
            y += row_height + GUTTER * 2
            row_height = 0
        if y + height + GUTTER > ATLAS_EDGE:
            raise RuntimeError(f"Furniture frames exceed {ATLAS_EDGE}x{ATLAS_EDGE} atlas")
        atlas.alpha_composite(packed.image, (x, y))
        packed.rect = [x, y, width, height]
        x += width + GUTTER * 2
        row_height = max(row_height, height)
    return atlas


def frame_metadata(frame: PackedFrame) -> dict[str, list[int]]:
    if frame.rect is None:
        raise RuntimeError(f"Frame {frame.key} was not packed")
    width, height = frame.image.size
    return {
        "rect": frame.rect,
        "anchor": [width // 2, height // 2],
        "referenceSize": [width, height],
    }


def write_contact_sheet(
    sprite_sets: dict[str, list[PackedFrame]],
    cage: PackedFrame,
    boundaries: list[list[PackedFrame]],
) -> None:
    columns = 5
    panel_width, panel_height = 400, 205
    entries: list[tuple[str, list[Image.Image]]] = [
        (sprite_id, [frame.image for frame in frames])
        for sprite_id, frames in sprite_sets.items()
    ]
    entries.append(("pet-cage", [cage.image]))
    entries.extend(
        (f"boundary-{variant}", [frame.image for frame in frames])
        for variant, frames in enumerate(boundaries)
    )
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * panel_width, rows * panel_height), "#18130f")
    draw = ImageDraw.Draw(sheet)
    for index, (label, images) in enumerate(entries):
        panel_x = (index % columns) * panel_width
        panel_y = (index // columns) * panel_height
        draw.rectangle(
            (panel_x + 2, panel_y + 2, panel_x + panel_width - 3, panel_y + panel_height - 3),
            fill="#292019",
            outline="#715439",
            width=2,
        )
        draw.text((panel_x + 10, panel_y + 8), label, fill="#f2ddbb")
        if len(images) == 1:
            slots = [(panel_x + 25, panel_y + 31, panel_width - 50, panel_height - 43)]
        else:
            slots = [
                (panel_x + 8, panel_y + 30, 188, 78),
                (panel_x + 204, panel_y + 30, 188, 78),
                (panel_x + 8, panel_y + 117, 188, 78),
                (panel_x + 204, panel_y + 117, 188, 78),
            ]
        for image, (slot_x, slot_y, slot_width, slot_height) in zip(images, slots, strict=True):
            preview = image.copy()
            preview.thumbnail((slot_width, slot_height), Image.Resampling.NEAREST)
            x = slot_x + (slot_width - preview.width) // 2
            y = slot_y + (slot_height - preview.height) // 2
            sheet.paste(preview, (x, y), preview)
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT_SHEET, optimize=True)


def main() -> None:
    source_atlas = Image.open(SOURCE_ATLAS).convert("RGBA")
    packed_frames: list[PackedFrame] = []
    sprite_sets: dict[str, list[PackedFrame]] = {}
    for sprite in catalog():
        frames = [
            PackedFrame(f"sprite:{sprite.id}:{rotation}", image)
            for rotation, image in enumerate(sprite_frames(source_atlas, sprite))
        ]
        sprite_sets[sprite.id] = frames
        packed_frames.extend(frames)

    cage = PackedFrame("pet-cage", cage_frame())
    packed_frames.append(cage)

    boundaries: list[list[PackedFrame]] = []
    for variant in range(4):
        frames = [
            PackedFrame(f"boundary:{variant}:{side}", image)
            for side, image in enumerate(boundary_frames(variant))
        ]
        boundaries.append(frames)
        packed_frames.extend(frames)

    atlas = pack(packed_frames)
    OUTPUT_ATLAS.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT_ATLAS, optimize=True)
    write_contact_sheet(sprite_sets, cage, boundaries)

    sprite_json = {
        sprite_id: [frame_metadata(frame) for frame in frames]
        for sprite_id, frames in sprite_sets.items()
    }
    boundary_json = [
        [frame_metadata(frame) for frame in frames]
        for frames in boundaries
    ]
    generated = (
        "// Generated by scripts/build_furniture_atlas.py. Do not edit by hand.\n"
        f"export const FURNITURE_REFERENCE_CELL = {REFERENCE_CELL} as const\n"
        f"export const FURNITURE_ATLAS_SIZE = {{ width: {ATLAS_EDGE}, height: {ATLAS_EDGE} }} as const\n"
        "export const FURNITURE_ATLAS_FRAMES = "
        + json.dumps(sprite_json, indent=2, separators=(",", ": "))
        + " as const\n"
        "export const PET_CAGE_FRAME = "
        + json.dumps(frame_metadata(cage), indent=2, separators=(",", ": "))
        + " as const\n"
        "export const BOUNDARY_ATLAS_FRAMES = "
        + json.dumps(boundary_json, indent=2, separators=(",", ": "))
        + " as const\n"
    )
    GENERATED_TS.write_text(generated, encoding="utf-8")

    alpha = atlas.getchannel("A")
    print(f"Wrote {OUTPUT_ATLAS.relative_to(ROOT)} ({atlas.width}x{atlas.height})")
    print(f"Wrote {GENERATED_TS.relative_to(ROOT)} ({len(sprite_sets)} sprite sets)")
    print(f"Wrote {CONTACT_SHEET.relative_to(ROOT)}")
    print(f"Opaque bounds: {alpha.getbbox()}")


if __name__ == "__main__":
    main()
