# Roadside diary

The interaction is **reading a notebook while following a bicycle path**, not operating a map or choosing a theme.

- Ordinary vertical scrolling advances a bicycle through an imagined mountain/shoreline sketch. There is no wheel interception, scroll snapping of the page, camera control or autoplay tour.
- Once real entries exist, the sketch stays at the top of the travel section as notebook pages pass beneath it. Its bicycle follows progress through the whole diary, not a timer. Scrolling back pedals the story back.
- Entries are always readable: month, place, a few personal lines and optional photos. No collapsed story cards, counters, flags, badges or visited-country scoreboard.
- A winding margin connects flower-shaped waypoints; dates stay beside their page on desktop. Photos use native horizontal scrolling and keyboard navigation, with captions underneath.
- Native CSS view timelines provide the scroll-linked behavior. Unsupported browsers get an intact, static scene. Reduced motion removes the riding, waypoint motion and sticky scene. No JavaScript scrollytelling loop or extra animation framework.
- Seedbed supplies flowers/waypoint artwork; Lucide supplies the bicycle, mountain and shoreline symbols. Both licenses are retained. The connecting path/layout is original.

The sketch is abstract scenery, **not geographical data or an assertion that Akshat has visited a place**. Live entries remain empty until supplied by the owner. With no entries, the entire travel section is omitted—no placeholder or illustration. Adding the first validated entry reveals it automatically on the next build. Test fixtures are clearly labeled, isolated and never exported publicly.

## Add a page

Edit `data/travels.json`; the build validates and sorts newest first. Each record needs a unique lowercase slug, a month (`YYYY-MM`) and a place. Optional fields: `region`, `note`, `terrain` (`mountain`, `coast`, `trail`, `city`) and `photos`.

Template only — replace the example values with your real, publication-approved details:

```json
[
  {
    "id": "first-page",
    "date": "2025-06",
    "place": "Your place",
    "region": "Optional region",
    "terrain": "coast",
    "note": "A few lines you want to remember.\nAnother thought, if you like.",
    "photos": [
      {
        "src": "/travels/first-page/shore.webp",
        "alt": "Describe what is visible in this photograph.",
        "caption": "Optional short caption."
      }
    ]
  }
]
```

Put approved images in `public/travels/`. Use local `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif` files with simple filenames. Do not upload originals containing private GPS/EXIF, faces or identifying details without reviewing them: **this project does not automatically sanitize photo metadata**. Exact coordinates, live location and exact days are unnecessary; month precision is deliberate. No public add/edit endpoint or browser-local fake diary is created.

Run `bun run check && bun run build && bun run test`. Approval is still required to publish/deploy. Adding local content does not itself deploy anything.
