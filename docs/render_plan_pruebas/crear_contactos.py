from pathlib import Path

from PIL import Image, ImageDraw


BASE = Path(__file__).resolve().parent
groups = [
    ("contacto-01.png", [1, 2, 3]),
    ("contacto-02.png", [4, 5]),
    ("contacto-03.png", [6, 7]),
    ("contacto-04.png", [8, 9]),
    ("contacto-05.png", [10, 11]),
    ("contacto-06.png", [12, 13]),
]

for name, page_numbers in groups:
    panels = []
    for page_number in page_numbers:
        image = Image.open(BASE / f"page-{page_number:02d}.png").convert("RGB")
        max_width = 1320
        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        panel = Image.new("RGB", (image.width, image.height + 34), "white")
        panel.paste(image, (0, 34))
        ImageDraw.Draw(panel).text((14, 10), f"Pagina {page_number}", fill="black")
        panels.append(panel)

    width = max(panel.width for panel in panels)
    height = sum(panel.height for panel in panels) + 18 * (len(panels) - 1)
    contact = Image.new("RGB", (width, height), "#D7DDD9")
    y = 0
    for panel in panels:
        x = (width - panel.width) // 2
        contact.paste(panel, (x, y))
        y += panel.height + 18
    contact.save(BASE / name, quality=92)
