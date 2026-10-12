# Agentown

### A living city of tools and workspaces

Agentown is an interactive, browser-based 3D city where buildings become useful
workspaces. Explore independently editable sectors, visit Document Studio, and
process files locally while the city comes alive with traffic, pedestrians, metro
trains, a village, rivers and mountains.

The long-term vision is to assign tools and AI agents to buildings throughout the
city. **Document Studio and its seven document tools are implemented today**;
additional building features and AI-agent integrations are planned. The current
fictional landscape is named **Nirmal** in the application interface.

## Highlights

- **101 buildings** with entrance gates and eleven city architectural styles.
- **58 named sectors**, with hover labels and an editable file for every sector.
- **Seven document tools** for PDF, Word, images and Markdown, processed locally.
- A searchable sidebar with collapsible building-feature menus.
- Animated traffic with red/amber/green signals, pedestrians and elevated metro.
- Live India-time lighting, camera tours, orbit/pan controls and scene photographs.
- Adaptive rendering targeting 60 FPS, with a Light profile for older hardware.
- Included libraries and procedural assets for offline operation.

## Quick start

```bash
git clone https://github.com/Sujitsarkar16/Agentown.git
cd Agentown
```

Open `index.html` in a recent Chrome, Edge, Firefox or Safari browser. There is no
application dependency installation or build step. Keep `js/`, `css/`,
`components/` and `vendor/` beside the HTML file.

Alternatively, serve the folder locally:

```bash
python -m http.server 8000
```

Then open **http://localhost:8000/**. The application uses local bundled assets;
document files stay on your device. Python is only needed for this optional server
and the HTML consistency tool.

## Controls

Use the searchable left navigation to explore every destination, open document tools, and change scene controls. Collapse it with the chevron and reopen with **Explore & tools**.

Hover over any block between roads to see its sector code. City blocks are named
**Sector-31A** through **Sector-38F**; village blocks use **Sector-41A** through
**Sector-43C**, and the enclosed farm-link block is **Sector-44A**. Numbers identify
rows and letters identify columns. Codes remain stable across reloads. Hovering
over a building also shows its block's code; roads have no sector tooltip.

Building tools are grouped in collapsible menus under **Building features**.
Expand **Document Studio** to access its seven tools or visit the office. Searching
for a tool automatically expands the matching building; clearing search restores
the previous expanded state. This building-based menu can accommodate future
features and agents.

Select **Orbit** or **Pan move** to choose what dragging does. Right-drag, middle-drag or Shift-drag also pans; scroll or pinch zooms. Two-finger dragging pans on touchscreens. Double-click focuses on terrain. Press **P** for pan and **O** for orbit; arrow keys follow the selected mode. **+ / -** zoom, **Space** pauses traffic, **T** toggles the tour, **H** hides the interface, and **Escape** closes the workspace or restores controls.

Lighting defaults to live India Standard Time (`Asia/Kolkata`, UTC +05:30), independent of browser timezone, traffic speed, and pause. The clock updates every second; daylight, sunset and night blend with the current IST hour. This fictional city's solar arc is approximate. Day, golden-hour and night buttons preview lighting; **Live IST** restores automatic lighting.

## Document Studio — your first product office

Choose a tool in the left navigation: the camera travels to the signed **Document Studio** office and opens its workspace. You can also click the office itself. Choose files or drag them into the upload area, adjust the options, run the tool, then download the result. Multiple-file tools let you reorder and remove files.

| Tool | Supported result |
| --- | --- |
| Image to PDF | JPG, PNG and WebP images, one per portrait or landscape A4 page |
| Word to PDF | DOCX content, tables and embedded images rendered into A4 pages |
| PDF to Word | Editable extracted text, or page images preserving visual appearance |
| Split PDF | Selected pages and ranges in your chosen order, or individual PDFs in a ZIP |
| Merge PDFs | Original pages combined in the selected file order |
| Compress PDF | Lossless structural optimisation, or balanced/strong image-based compression |
| Markdown to PDF | Markdown/text with headings, formatting, tables, lists and code |

Files are processed locally in the browser with no account or server upload. Word means `.docx`; legacy `.doc` is not supported. Word and Markdown PDFs are rendered visual pages, and complex Word layouts reflow. PDF-to-Word text is reflowed; scanned pages remain images (no OCR). Image-based compression flattens selectable text; if processing would enlarge a PDF, the original is offered instead. Markdown external images are replaced with labels. Password-protected PDFs require an unlocked copy. Browser processing accepts files up to 100 MB each; very long rendered documents need splitting.

## What is included

101 buildings with eleven city architectural styles: stepped, rounded, twin-wing and terraced offices, brick lofts, balcony residences, tiled townhouses and courtyard homes. Sector-35B includes an additional four-floor brick-loft office with an entrance gate. Repeated housing clusters and riverbank towers are thinned out, with garden plots replacing retired city buildings. Three residential societies have shared gardens and play spaces; two city schools and a village school have colourful campuses; two police stations have public forecourts. Eight playgrounds include slides, swings and seesaws, with sports courts and a village cricket green. The Document Studio is a distinct product office with rooftop paper sculpture and clickable entry.

The village includes 13 colourful houses and six thatched huts, a pond, farms, grazing zebu cattle and banyan, mango and banana groves. Greener mountain foothills have flower meadows, colourful lodges and a viewing deck below snowy ranges, with mist, cloud caps, conifers, boulders, trails and waterfalls. Structured offline textures add paving joints, roof tiles, brickwork, plaster, wood grain and grass. There are 260 vehicles, pedestrians, metro trains, parks and a river. The landscape is original and fictional.

Every recorded building has a framed double entrance gate with handles, a canopy
and compact threshold steps. City entrances use stone and metal; village homes
and mountain huts use wood details. Entrances align with each building's actual
front wall, including round towers, courtyard homes and rotated huts. They share
the static instance buffers and require no per-frame animation work.

Cars, buses and auto-rickshaws use left-hand lanes, signal queues, collision checks, slower cornering and lower village speeds. Village lanes are rutted mud tracks with potholes and puddles, so traffic crawls there. Pedestrians walk on pavements. This is an illustrative simulation, not a calibrated transport or population model.

City junctions have three-lamp red/amber/green traffic lights synchronized with
the vehicle signal cycle, including an all-red interval between directions. The
lights use shared instanced geometry and emissive materials to remain lightweight.

## Performance and structure

Rendering targets 60 FPS and automatically adjusts internal resolution and shadow
quality when a device cannot keep up. **Scene settings** shows the measured render
cadence and resolution. Select **Light** (the first detail button) on older PCs;
**Balanced** is the default, and **High** allows sharper resolution and shadows.
All three profiles retain the city layout, textures and simulation population.

## Folder structure (every source file < 1000 lines)

`index.html` is a thin shell assembled from `components/` partials
(`head`, `dock`, `settings-panel`, `legacy`, `loading`, `scripts`).
Styles are split into `css/base.css`, `css/dock.css`, `css/panel.css`,
`css/overlays.css`. City systems are split by district and responsibility:

- `js/core/` — `config` (state/constants), `assets` (materials/textures),
  `batching` (GPU instancing), `sectors` (addresses, registry and isolated build lifecycle)
- `js/terrain/` — `vegetation`, `terrain` (roads/junctions), `atmosphere` (sky/stars)
- `js/city/` — `buildings`, `heritage`, `parks`, `community` (societies, schools, police and product office)
- `js/village/village.js` — houses, school, farms
- `js/sectors/` — 58 independently editable block modules named by their sector code;
  see [`js/sectors/README.md`](js/sectors/README.md) for development instructions
- `js/waterfront/river.js` — river shader, promenade, bridges
- `js/transit/` — `metro`, `traffic` (lanes/vehicles), `people` (pedestrians/ambient)
- `js/app/` — `lighting`, `camera`, `controls`, `documents` (local file engine), `products` (navigation/workspace), `loop`
- `tools/build-html.py` — rebuild and exact drift check between `index.html` and `components/`
- `tools/build-document-vendor.cjs` — optional offline library bundler; dependency versions in `tools/document-vendor-package.json`
- `tools/verify-scene.cjs` — browser integration and document-output checks

Classic scripts load in dependency order so local HTML works without module
CORS restrictions. `vendor/` holds offline Three.js and GSAP.

## Sector-based development

Edit the file matching a block's hover code to develop that block:
`js/sectors/Sector-33D.js` owns Document Studio,
`js/sectors/Sector-34D.js` owns the civic square, and
`js/sectors/Sector-42B.js` owns the village school and pond. Each module provides a
`build` callback, title, feature metadata and private state; village blocks can
also have a `decorate` callback. Shared helpers supply reusable architecture,
roads, traffic and rendering. Sector-specific random seeds and explicit style
choices keep procedural edits independent of neighbouring modules. The registry
builds each sector once into the existing static batches. All 58 module files are
loaded locally in dependency order.

Physics runs at a fixed 30 Hz with interpolated vehicle transforms and a bounded
catch-up budget. Traffic reuses its spatial grid, neighbor buffers and route poses
to reduce garbage collection. Cars and pedestrians upload only visible instances;
disabled pedestrians submit no geometry. Static painted materials share instance
colours, foliage is spatially culled with distance-based geometry, and the wide
overview uses consolidated lightweight vegetation. Terrain patches preserve the
original surface while allowing off-screen geometry to be culled. Fountain spray
is animated on the GPU. Each train is merged into a few meshes.

Frame scheduling caps rendering at 60 FPS on high-refresh displays. Pixel budgets
limit GPU load on large/high-DPI screens; sustained slow frames reduce resolution
and then shadows, with gradual recovery when headroom returns. Balanced shadows
refresh at 10 Hz, High at 20 Hz. Static world transforms are reused. Light mode
removes costly backdrop blurs. A stationary paused scene renders only when needed,
a hidden tab cancels the scene loop, and document conversion temporarily pauses
simulation to give file processing more headroom. Screenshot rendering does not
require preserving every framebuffer.

Use the light-quality icon if your machine has limited graphics capacity. Smoothness depends on the device, browser, screen resolution and graphics acceleration.

## Verification

Chromium browser checks cover offline WebGL boot, finite geometry, ten camera views, footprint overlaps and road clearance, mouse/keyboard pan, IST timezone/date rollover, the live clock while paused, lighting presets and a 60-second maximum-density simulation. Product checks exercise office navigation and building clicks, search, uploads, actual PDF downloads, all seven converters, page ordering, split ZIPs, DOCX text/images, input errors and mobile layout. Headless software WebGL uses a bounded test frame cadence; device frame rate is not measured.

Run `python tools/build-html.py --check` for HTML drift. For integration checks, install Playwright and Chromium outside the static site, set `PLAYWRIGHT_PATH` to its installed module path if needed, and run `node tools/verify-scene.cjs`. Optional `SCREENSHOT_DIR` saves previews. The document bundle is already included; rebuilding it requires the versions in `tools/document-vendor-package.json` and `DOCUMENT_NODE_MODULES` pointing to their installed `node_modules` folder.

Run `node tools/benchmark-scene.cjs` with the same Playwright setup for CPU workload
timings, triangle/draw counts, collision checks and rendering regressions. It also
checks shadows, moving world transforms, terrain picking, pedestrian toggles,
paused-idle rendering, adaptive quality recovery and 60 FPS scheduling against
synthetic 60/120/144 Hz display clocks. This verifies frame scheduling, not hardware
frame rate. In the local software-WebGL comparison, the 60-second maximum-density
traffic workload fell from approximately 800 ms to 316 ms (60% less CPU time), and
main-pass triangles fell by 41–82% across five views. Device FPS still depends on
the GPU, CPU, browser and viewport.

## Optional web server

If your browser blocks local scripts, run `python3 -m http.server 8000` from this folder and open `http://localhost:8000/`. There are no external API calls, network assets, analytics or runtime debug logs from the application.

## Libraries

Three.js r160: MIT license, Copyright 2010-2023 Three.js Authors. GSAP 3.12.5: GreenSock standard license, preserved in the vendor file. Document libraries include pdf-lib, PDF.js, Mammoth, docx, html2canvas, Marked, DOMPurify, fflate and buffer; notices are in `vendor/DOCUMENT-LICENSES.txt` and the bundled source. Original procedural scene and assets.

## License

The repository includes the [Apache License 2.0](LICENSE). Bundled third-party
libraries retain their own licenses; see [LICENSES.txt](LICENSES.txt),
[vendor/DOCUMENT-LICENSES.txt](vendor/DOCUMENT-LICENSES.txt), and the notices in the
vendor files.
