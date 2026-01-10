from PIL import Image
from pathlib import Path

def process(src_path: Path, dst_path: Path, threshold=6, gain=18, pad=24):
    im = Image.open(src_path).convert('RGBA')
    r, g, b, a = im.split()

    # Use max channel to better catch faint strokes on black
    rgb = Image.merge('RGB', (r, g, b))
    w, h = rgb.size
    px = rgb.load()

    alpha = Image.new('L', (w, h), 0)
    apx = alpha.load()

    for y in range(h):
        for x in range(w):
            pr, pg, pb = px[x, y]
            m = pr
            if pg > m:
                m = pg
            if pb > m:
                m = pb
            v = (m - threshold) * gain
            if v <= 0:
                apx[x, y] = 0
            elif v >= 255:
                apx[x, y] = 255
            else:
                apx[x, y] = int(v)

    bbox = alpha.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - pad)
        y0 = max(0, y0 - pad)
        x1 = min(w, x1 + pad)
        y1 = min(h, y1 + pad)
        alpha = alpha.crop((x0, y0, x1, y1))

    out = Image.new('RGBA', alpha.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    out.save(dst_path)
    print(f"Wrote {dst_path} ({out.size[0]}x{out.size[1]})")

assets = Path('assets')
process(assets / 'signature-david.png', assets / 'signature-david-white.png')
process(assets / 'signature-farax.png', assets / 'signature-farax-white.png')