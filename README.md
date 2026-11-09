# World Ratio

**An interactive atlas of financial events, institutions and economies.**

World Ratio is a static, GitHub Pages-compatible website that connects financial history with geography and time.

## What's included

- Homepage, project information and developer contact
- Interactive Leaflet world map with dark CARTO basemap
- Year selector covering **1995–2026**
- Event markers filtered by year and category
- Search for a city, town or country (on-demand OpenStreetMap Nominatim lookup)
- Map click reverse-geocoding (on-demand)
- Curated financial event cards with source links
- Financial institution markers with founding-year filtering
- Curated turning-point studies with timelines and human-impact context
- Python scripts to format and validate JSON datasets

## Important data note

The timeline covers 1995–2026, but the included dataset is a **small, curated starter sample**, not a comprehensive record of every country's financial history. An empty year or location means that this version has no verified record for that selection. It does not mean nothing happened.

The event records include source links. The validation script checks required fields, date consistency, duplicate IDs and URL format; it does **not** independently verify the truth or current availability of source content. A human editor should open and review every source before adding or updating a record.

## Run locally

Because the site loads JSON files with `fetch()`, do not open `index.html` directly using a `file://` URL. Start a local static web server from the project directory.

### Option A: Python

```bash
python -m http.server 8000
```

Open <http://localhost:8000>.

### Option B: VS Code

Install the Live Server extension, right-click `index.html`, and choose **Open with Live Server**.

## Publish on GitHub Pages

1. Create a new GitHub repository, for example `world-ratio`.
2. Upload the contents of this project folder to the repository root and push them to the `main` branch.
3. Open **Settings → Pages**.
4. Under **Build and deployment → Source**, select **GitHub Actions**.
5. The included workflow at `.github/workflows/pages.yml` deploys the static site when you push to `main` (or run it manually from the Actions tab).
6. Wait for the Pages deployment to complete.
7. Open the published URL shown in the Pages settings.

The project uses relative asset and data paths, so it can be hosted from a repository subpath as well as a root domain.

## Add a financial event

Add a new object to `data/events.json`. Follow this shape:

```json
{
  "id": "unique-event-id",
  "date": "2024-04-01",
  "year": 2024,
  "title": "A concise event title",
  "category": "crisis",
  "city": "City",
  "region": "State or region",
  "country": "Country",
  "countryCode": "ISO-3",
  "lat": 0.0,
  "lng": 0.0,
  "entity": "Company, institution or government",
  "scope": "local, national or global",
  "summary": "What happened? Keep this concise.",
  "why": "Why did it matter financially?",
  "impact": "What were the local and wider consequences? Qualify claims.",
  "sources": [
    {
      "label": "Publisher or institution — document title",
      "url": "https://example.org/source"
    }
  ],
  "turningPoint": null
}
```

Supported event categories: `crisis`, `policy`, `global`.

Use a stable unique ID. The `date` must be ISO format (`YYYY-MM-DD`) and its year must match `year`. Coordinates should represent the event location or the relevant institution's location. If the impact is national or global, say so explicitly rather than implying that the effects were limited to the pinned city.

### Source and research standards

- Prefer primary sources: central banks, regulators, government records, court filings, annual reports and official institutional histories.
- Use established newspapers and financial publications for independent reporting and local context.
- Link directly to the article, report or document, not merely to a publisher homepage.
- Record the publication date in the source label where practical.
- Do not copy full newspaper articles into the database.
- Do not invent figures, dates, causal links or local impacts.
- For claims about deaths, unemployment or other human consequences, cite specific credible evidence and distinguish correlation from causation.
- Check image licences before adding images. Do not hotlink copyrighted newspaper photography without permission.

## Add a financial institution

Add a record to `data/institutions.json`:

```json
{
  "id": "institution-id",
  "name": "Institution name",
  "type": "Central bank",
  "founded": 1900,
  "city": "City",
  "region": "Region",
  "country": "Country",
  "lat": 0.0,
  "lng": 0.0,
  "description": "Short, sourced institutional history.",
  "url": "https://institution.example",
  "source": "https://institution.example/history"
}
```

The institution appears on the map for selected years on or after its founding year. Use the location represented by the marker carefully: headquarters, founding location and branch location are not necessarily the same.

## Add a turning point

Add an object to `data/turning-points.json`. It should include:
- `id`, `year`, `date`, `title`, `region`, `category`
- `lede`, `overview`, `humanImpact`
- `timeline`: array of `{date, title, text}`
- `countries`: array of country names
- `sources`: array of `{label, url}`

To link a map event to a turning point, set its `turningPoint` field to the matching turning-point ID.

## Run data checks

From the project root:

```bash
python scripts/validate_data.py
python scripts/prepare_data.py
python scripts/validate_data.py
```

The validator checks structure, required fields, duplicate IDs, ISO dates, year/date consistency and HTTPS source URL formatting. It does not crawl or fact-check linked pages.

## Map and external services

### Leaflet
The map interface uses Leaflet, loaded from the unpkg CDN.

### Map tiles
The dark basemap uses CARTO's dark tiles based on OpenStreetMap data. Visible attribution is included in the map. Review CARTO's current terms before high-volume or commercial use.

### Geocoding
Location search and map-click reverse geocoding use the public Nominatim service on demand. Requests are throttled in the client. Nominatim is a community service with a usage policy and no guaranteed availability. For a larger public deployment, use a geocoding provider with a suitable service agreement or operate your own service. Do not bulk-geocode or scrape.

### Fonts
General text uses Times New Roman. The brand uses the `Splatink` font if a licensed font file is supplied. Place it at:

`assets/fonts/Splatink.woff2`

The CSS already contains the `@font-face` declaration hook. If the font file is not present, the brand falls back to Times New Roman. Only use a font file you have permission to distribute.

## Known v1 limitations

- The historical dataset is deliberately small.
- Search can locate places globally, but event coverage is limited to the records in the local JSON database.
- Clicking an arbitrary point identifies the nearest place through reverse geocoding; it does not create a financial fact. If there is no verified record, the site says so.
- Institution records are starter examples, not a complete directory.
- Images are not bundled in this first version; add only images with appropriate reuse rights and attribution.
- This is an educational historical reference, not investment advice.

## Suggested next steps

1. Add verified country- and city-level event records systematically.
2. Expand the turning-point timelines with local evidence.
3. Add institution milestones and finance colleges.
4. Add an editorial review workflow before publishing new records.
5. Consider a dedicated tile/geocoding provider if traffic grows.

## Credits

- Developer: Niharika Jain — njainn0810@gmail.com
- Mapping library: Leaflet
- Map data: OpenStreetMap contributors
- Map tiles: CARTO
