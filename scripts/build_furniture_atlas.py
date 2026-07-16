"""Build the production furniture atlas and QA contact sheet.

Requires Pillow 12 or newer. Generated coordinates are committed so this script
is an asset-maintenance tool, not part of the Vite production build.
"""

from __future__ import annotations

import colorsys
import json
import re
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ATLAS = ROOT / "public/assets/game/roombapac-furniture-v2.png"
GENERATED_TS = ROOT / "src/game/furnitureAtlas.generated.ts"
CONTACT_SHEET = ROOT / "docs/qa/furniture-v2-contact-sheet.png"
SPRITE_SOURCE = ROOT / "src/game/furnitureSprites.ts"
ART_DIR = ROOT / "art/furniture-v2"

REFERENCE_CELL = 96
ATLAS_EDGE = 4096
GUTTER = 4
FRAME_MARGIN = 5
COMPONENT_ALPHA_THRESHOLD = 48


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


def opaque_components(image: Image.Image) -> list[tuple[int, tuple[int, int, int, int]]]:
    width, height = image.size
    alpha = image.getchannel("A").tobytes()
    visited = bytearray(width * height)
    components: list[tuple[int, tuple[int, int, int, int]]] = []
    for start, value in enumerate(alpha):
        if value < COMPONENT_ALPHA_THRESHOLD or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        area = 0
        left = right = start % width
        top = bottom = start // width
        while queue:
            index = queue.popleft()
            x, y = index % width, index // width
            area += 1
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            if x and not visited[index - 1] and alpha[index - 1] >= COMPONENT_ALPHA_THRESHOLD:
                visited[index - 1] = 1
                queue.append(index - 1)
            if x + 1 < width and not visited[index + 1] and alpha[index + 1] >= COMPONENT_ALPHA_THRESHOLD:
                visited[index + 1] = 1
                queue.append(index + 1)
            if y and not visited[index - width] and alpha[index - width] >= COMPONENT_ALPHA_THRESHOLD:
                visited[index - width] = 1
                queue.append(index - width)
            if y + 1 < height and not visited[index + width] and alpha[index + width] >= COMPONENT_ALPHA_THRESHOLD:
                visited[index + width] = 1
                queue.append(index + width)
        if area >= 256:
            components.append((area, (left, top, right + 1, bottom + 1)))
    return components


def board_frames(name: str, corner_layout: bool = False) -> list[Image.Image]:
    board = Image.open(ART_DIR / name).convert("RGBA")
    half_width, half_height = board.width / 2, board.height / 2
    by_quadrant: list[list[tuple[int, tuple[int, int, int, int]]]] = [[], [], [], []]
    for component in opaque_components(board):
        _, (left, top, right, bottom) = component
        center_x, center_y = (left + right) / 2, (top + bottom) / 2
        quadrant = int(center_x >= half_width) + int(center_y >= half_height) * 2
        by_quadrant[quadrant].append(component)

    frames: list[Image.Image] = []
    for quadrant, components in enumerate(by_quadrant):
        if not components:
            raise RuntimeError(f"{name} has no sprite component in quadrant {quadrant}")
        _, (left, top, right, bottom) = max(components, key=lambda component: component[0])
        padding = 4
        box = (
            max(0, left - padding),
            max(0, top - padding),
            min(board.width, right + padding),
            min(board.height, bottom + padding),
        )
        frames.append(alpha_crop(board.crop(box)))
    # Corner boards are arranged spatially TL, TR, BL, BR. Convert that to
    # clockwise quarter turns TL, TR, BR, BL without rotating any pixels.
    return [frames[0], frames[1], frames[3], frames[2]] if corner_layout else frames


MASTER_FRAMES = {
    "armchair": board_frames("armchair-directions.png"),
    "appliance-1": board_frames("appliance-1-directions.png"),
    "appliance-2": board_frames("appliance-2-directions.png"),
    "boundary": board_frames("boundary-directions.png"),
    "cabinet-1": board_frames("cabinet-1-directions.png"),
    "corner": board_frames("corner-directions.png", corner_layout=True),
    "dresser-2": board_frames("dresser-2-directions.png"),
    "dresser-3": board_frames("dresser-3-directions.png"),
    "dresser-4": board_frames("dresser-4-directions.png"),
    "fireplace": board_frames("fireplace-directions.png"),
    "junction": board_frames("junction-directions.png"),
    "kitchen-corner": board_frames("kitchen-corner-directions.png", corner_layout=True),
    "library-alcove": board_frames("library-alcove-directions.png"),
    "library-corner": board_frames("library-corner-directions.png", corner_layout=True),
    "library-room": board_frames("library-room-directions.png"),
    "kitchen-room": board_frames("kitchen-room-directions.png"),
    "bedroom-room": board_frames("bedroom-room-directions.png"),
    "study-room": board_frames("study-room-directions.png"),
    "plant-stand": board_frames("plant-stand-directions.png"),
    "rug": board_frames("rug-directions.png"),
    "sofa-2": board_frames("sofa-2-directions.png"),
    "sofa-3": board_frames("sofa-3-directions.png"),
    "sofa-alcove": board_frames("sofa-alcove-directions.png"),
    "table": board_frames("table-directions.png"),
}


def master_for(sprite: SpriteSource) -> str:
    longest = max(sprite.footprint)
    if sprite.family == "chair":
        return "armchair"
    if sprite.family == "sofa":
        return "armchair" if longest == 1 else f"sofa-{min(longest, 3)}"
    if sprite.family == "cabinet":
        return "cabinet-1" if longest == 1 else f"dresser-{longest}"
    if sprite.family == "table":
        return "table"
    if sprite.family == "appliance":
        return f"appliance-{longest}"
    if sprite.family == "plant":
        return "plant-stand"
    if sprite.family == "rug":
        return "rug"
    if sprite.family == "fireplace":
        return "fireplace"
    if sprite.family == "corner":
        if sprite.id.startswith(("green-", "blue-")):
            return "corner"
        if "library" in sprite.id:
            return "library-corner"
        return "kitchen-corner"
    if sprite.family == "junction":
        return "kitchen-corner" if sprite.id == "kitchen-t-junction" else "corner" if sprite.id == "blue-t-junction" else "junction"
    if sprite.family == "alcove":
        return "library-alcove" if sprite.id == "library-alcove" else "sofa-alcove"
    if sprite.family == "room":
        return sprite.id
    raise RuntimeError(f"No authored directional master for {sprite.id}")


def authored_frames(sprite: SpriteSource) -> list[Image.Image]:
    frames = MASTER_FRAMES[master_for(sprite)]
    if sprite.id.endswith("-mirror"):
        # Mirrored catalog masks begin in the top-right corner. Select the
        # separately authored matching views in clockwise order.
        return [frames[1], frames[2], frames[3], frames[0]]
    return frames


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
    if "brown" in sprite_id or "wooden" in sprite_id:
        return 0.075
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


def sprite_frames(sprite: SpriteSource) -> list[Image.Image]:
    sources = [tint(frame, sprite.id) for frame in authored_frames(sprite)]
    return [
        fit_frame(source, oriented_size(sprite.footprint, rotation), True)
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
    opaque_bounds = frame.image.getchannel("A").getbbox()
    if opaque_bounds is None:
        raise RuntimeError(f"Frame {frame.key} has no visible pixels")
    return {
        "rect": frame.rect,
        "anchor": [width // 2, height // 2],
        "referenceSize": [width, height],
        "opaqueBounds": list(opaque_bounds),
        "authored": True,
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
    packed_frames: list[PackedFrame] = []
    sprite_sets: dict[str, list[PackedFrame]] = {}
    for sprite in catalog():
        frames = [
            PackedFrame(f"sprite:{sprite.id}:{rotation}", image)
            for rotation, image in enumerate(sprite_frames(sprite))
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
