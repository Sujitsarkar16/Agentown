"""Rebuild index.html from components/ partials (optional helper).

The runtime loads index.html directly — no build step is required.
Use this script after editing a file in components/ to regenerate the
matching section inside index.html, or simply as a drift check:

    python tools/build-html.py --check
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PARTIALS = [
    "components/head.html",
    "components/experience.html",
    "components/document-studio.html",
    "components/dock.html",
    "components/settings-panel.html",
    "components/legacy.html",
    "components/loading.html",
    "components/scripts.html",
]

if __name__ == "__main__":
    import sys

    missing = [p for p in PARTIALS if not (ROOT / p).exists()]
    if missing:
        print("Missing partials:", missing)
        sys.exit(1)
    def partial(name):
        return (ROOT / f"components/{name}.html").read_text(encoding="utf-8").strip()

    expected = '\n'.join([
        '<!doctype html>', '<html lang="en">', '<head>', partial('head'),
        '</head>', '<body>',
        '<canvas id="world" tabindex="0" aria-label="Interactive 3D Indian city, village and mountains. Select Orbit or Pan move, drag to explore, scroll or pinch to zoom."></canvas>',
        partial('experience'), partial('document-studio'), partial('dock'), partial('settings-panel'),
        partial('legacy'), partial('loading'),
        '<noscript><div style="position:fixed;inset:0;z-index:20;background:#e8eee4;display:grid;place-items:center">Enable JavaScript to explore Nirmal.</div></noscript>',
        partial('scripts'), '</body>', '</html>', '',
    ])
    if '--check' not in sys.argv:
        (ROOT / "index.html").write_text(expected, encoding="utf-8")
        print("Rebuilt index.html from components/ partials.")
    elif (ROOT / "index.html").read_text(encoding="utf-8") == expected:
        print("index.html is in sync with components/ partials.")
    else:
        print("DRIFT: run python tools/build-html.py to rebuild index.html")
        sys.exit(1)
