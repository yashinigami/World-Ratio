
const DATA = { events: [], institutions: [], turningPoints: [] };

const state = {
  year: 2008,
  category: "all",
  selectedLocation: null,
  selectedEventId: null,
  eventLayer: null,
  institutionLayer: null,
  map: null,
  lastGeocode: 0
};

const $ = (selector) => document.querySelector(selector);

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const prettyDate = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });

const categoryLabel = (category) => ({
  crisis: "Crisis / loss",
  policy: "Government / policy",
  global: "Global development",
  institution: "Financial institution"
}[category] || category);

const iconFor = (category) =>
  L.divIcon({
    className: "",
    html: `<div class="custom-marker ${category}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

async function loadData() {
  const [events, institutions, turningPoints] = await Promise.all([
    fetch("data/events.json").then(r => {
      if (!r.ok) throw new Error("events.json");
      return r.json();
    }),
    fetch("data/institutions.json").then(r => {
      if (!r.ok) throw new Error("institutions.json");
      return r.json();
    }),
    fetch("data/turning-points.json").then(r => {
      if (!r.ok) throw new Error("turning-points.json");
      return r.json();
    })
  ]);

  DATA.events = events;
  DATA.institutions = institutions;
  DATA.turningPoints = turningPoints;
}

function initMap() {
  if (!window.L) {
    $("#map").innerHTML =
      '<div class="empty-state">The map library could not load. Check your internet connection and refresh.</div>';
    return;
  }

  // Initialise the interactive world map
  const map = L.map("map", {
    worldCopyJump: true,
    scrollWheelZoom: true
  }).setView([24, 10], 2);

  state.map = map;

  // Soft rose ocean with warm paper-coloured country shapes.
  map.getContainer().style.background = "#E8B5C1";
  fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
    .then(response => {
      if (!response.ok) throw new Error("Country boundary data unavailable");
      return response.json();
    })
    .then(geojson => {
      L.geoJSON(geojson, {
        style: {
          color: "#C77D96",
          weight: 0.75,
          opacity: 0.9,
          fillColor: "#FFF5F1",
          fillOpacity: 1
        }
      }).addTo(map);
    })
    .catch(() => {
      const fallback = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(map);
      fallback.getContainer?.()?.style && (fallback.getContainer().style.filter = "sepia(.25) saturate(.75) hue-rotate(295deg)");
    });

  // Separate layers for financial events and institutions
  state.eventLayer = L.layerGroup().addTo(map);
  state.institutionLayer = L.layerGroup().addTo(map);

  renderMap();

  map.on("click", async (e) => {
    const status = $("#location-status");
    status.textContent = "Checking this location…";

    try {
      const now = Date.now();
      const wait = Math.max(0, 1100 - (now - state.lastGeocode));

      if (wait) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }

      state.lastGeocode = Date.now();

      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=10&addressdetails=1`;

      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error("Location lookup unavailable");
      }

      const place = await response.json();
      const a = place.address || {};

      const name =
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.county ||
        a.state ||
        a.country ||
        "Selected location";

      const country = a.country || "";

      selectLocation(
        name,
        country,
        e.latlng.lat,
        e.latlng.lng
      );

    } catch (err) {
      status.textContent =
        "Could not identify this point. Try searching for a city or selecting a marked event.";
    }
  });
}

function currentEvents() {
  return DATA.events.filter(e =>
    e.year === state.year &&
    (state.category === "all" || e.category === state.category)
  );
}

function renderMap() {
  if (!state.map) return;
  state.eventLayer.clearLayers();
  state.institutionLayer.clearLayers();

  const records = [];
  if ($("#events-toggle").checked) {
    currentEvents().forEach(event => {
      const places = event.epicentres?.length ? event.epicentres : [{
        city: event.city, country: event.country, lat: event.lat, lng: event.lng
      }];
      places.forEach(place => records.push({
        kind: "event", data: event, place,
        city: place.city || event.city, country: place.country || event.country
      }));
    });
  }
  if ($("#institutions-toggle").checked) {
    DATA.institutions.filter(inst => inst.founded <= state.year).forEach(inst => {
      records.push({
        kind: "institution", data: inst,
        place: { city: inst.city, country: inst.country, lat: inst.lat, lng: inst.lng },
        city: inst.city, country: inst.country
      });
    });
  }

  // One marker per city/country: events, epicentres and institutions share the same browseable dot.
  const groups = new Map();
  records.forEach(record => {
    const key = `${String(record.city).trim().toLowerCase()}|${String(record.country).trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  groups.forEach(group => {
    const lat = group.reduce((sum, r) => sum + Number(r.place.lat), 0) / group.length;
    const lng = group.reduce((sum, r) => sum + Number(r.place.lng), 0) / group.length;
    const categories = group.map(r => r.kind === "institution" ? "institution" : r.data.category);
    const markerCategory = categories.includes("crisis") ? "crisis" :
      categories.includes("policy") ? "policy" :
      categories.includes("global") ? "global" : "institution";
    const marker = L.marker([lat, lng], {
      icon: iconFor(markerCategory),
      title: `${group.length} records · ${group[0].city}, ${group[0].country}`
    }).addTo(group.some(r => r.kind === "event") ? state.eventLayer : state.institutionLayer);
    let popupIndex = 0;
    marker.bindPopup(cityBrowsePopup(group, popupIndex), {
      maxWidth: 360, minWidth: 270, className: "city-browse-leaflet"
    });
    marker.on("popupopen", () => {
      const root = marker.getPopup().getElement();
      if (!root || root.dataset.cityBrowseBound === "true") return;
      root.dataset.cityBrowseBound = "true";
      root.addEventListener("click", event => {
        const prev = event.target.closest("[data-city-prev]");
        const next = event.target.closest("[data-city-next]");
        const open = event.target.closest("[data-city-open]");
        if (prev && group.length > 1) {
          popupIndex = (popupIndex - 1 + group.length) % group.length;
          marker.setPopupContent(cityBrowsePopup(group, popupIndex));
        } else if (next && group.length > 1) {
          popupIndex = (popupIndex + 1) % group.length;
          marker.setPopupContent(cityBrowsePopup(group, popupIndex));
        } else if (open) {
          const selected = group[popupIndex];
          if (selected.kind === "event") openEvent(selected.data.id);
          else showInstitution(selected.data.id);
        }
      });
    });
  });

  $("#selected-year").textContent = state.year;
  $("#results-title").textContent = `Events in ${state.year}`;
  renderEventList();
}

function cityBrowsePopup(group, index = 0) {
  const record = group[index];
  const isEvent = record.kind === "event";
  const title = isEvent ? record.data.title : record.data.name;
  const meta = isEvent
    ? `${record.data.year} · ${categoryLabel(record.data.category)}`
    : `Institution · Established ${record.data.founded}`;
  const place = `${group[0].city}, ${group[0].country}`;
  return `<div class="city-browse-popup">
    <div class="city-browse-nav">
      <button type="button" data-city-prev aria-label="Previous record" ${group.length < 2 ? "disabled" : ""}>←</button>
      <div class="city-browse-copy">
        <div class="city-browse-place">${escapeHTML(place)} · ${index + 1} of ${group.length}</div>
        <div class="city-browse-meta">${escapeHTML(meta)}</div>
        <strong>${escapeHTML(title)}</strong>
        <button type="button" class="city-browse-details" data-city-open>View details ↗</button>
      </div>
      <button type="button" data-city-next aria-label="Next record" ${group.length < 2 ? "disabled" : ""}>→</button>
    </div>
  </div>`;
}

function renderEventList() {
  const list = $("#event-list");
  const records = currentEvents();

  if (!records.length) {
    list.innerHTML = `
      <div class="empty-state">
        No verified sample events are currently available for ${state.year}.
        The timeline covers 1995–2026, but the curated dataset is still being expanded.
        An empty year does not mean nothing happened.
      </div>`;
  } else {
    list.innerHTML = records.map(e => `
      <article class="event-card"
        tabindex="0"
        role="button"
        data-event="${escapeHTML(e.id)}">

        <div class="event-card-top">
          <span class="event-date">${prettyDate(e.date)}</span>
          <span class="event-tag">${categoryLabel(e.category)}</span>
        </div>

        <h3>${escapeHTML(e.title)}</h3>

        <div class="event-place">
          ${escapeHTML(e.city)}, ${escapeHTML(e.country)}
        </div>

        <p>
          ${escapeHTML(e.summary.slice(0, 205))}
          ${e.summary.length > 205 ? "…" : ""}
        </p>

        <span class="card-read">Read the event record ↗</span>
      </article>
    `).join("");

    list.querySelectorAll("[data-event]").forEach(card => {
      card.addEventListener("click", () =>
        openEvent(card.dataset.event)
      );

      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openEvent(card.dataset.event);
        }
      });
    });
  }

  $("#location-status").textContent = state.selectedLocation
    ? `Selected: ${state.selectedLocation.name}${state.selectedLocation.country ? ", " + state.selectedLocation.country : ""}. Records shown below match the selected year; use the map markers to open individual records.`
    : "Select a marker or search for a place to explore its records.";
}

function openEvent(id) {
  const e = DATA.events.find(x => x.id === id);
  if (!e) return;

  state.selectedEventId = id;

  const modal = $("#event-modal");
  const content = $("#modal-content");

  content.innerHTML = `
    <div class="eyebrow">
      ${categoryLabel(e.category)} · ${e.year}
    </div>

    <h2 id="modal-title">${escapeHTML(e.title)}</h2>

    <div class="modal-location">
      ${escapeHTML(prettyDate(e.date))} ·
      ${escapeHTML(e.city)}, ${escapeHTML(e.country)}
    </div>

    <div class="modal-section">
      <h3>What happened?</h3>
      <p>${escapeHTML(e.summary)}</p>
    </div>

    <div class="modal-section">
      <h3>Why it mattered</h3>
      <p>${escapeHTML(e.why)}</p>
    </div>

    <div class="modal-section">
      <h3>Local and wider impact</h3>
      <p>${escapeHTML(e.impact)}</p>
    </div>

    <div class="modal-section">
      <h3>Entities involved</h3>
      <p>${escapeHTML(e.entity)}</p>
    </div>

    <div class="modal-section">
      <h3>Sources and further reading</h3>
      <div class="modal-sources">
        ${e.sources.map(s => `
          <a href="${escapeHTML(s.url)}"
             target="_blank"
             rel="noopener noreferrer">
            ${escapeHTML(s.label)} ↗
          </a>
        `).join("")}
      </div>
    </div>

    ${e.turningPoint
      ? `<div class="modal-actions"><button id="open-turning-point">Explore this turning point</button></div>`
      : ""}
  `;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (e.turningPoint) {
    $("#open-turning-point").addEventListener("click", () => {
      closeModal();
      location.hash = "#turning-points";
      setTimeout(() => showTurningPoint(e.turningPoint), 80);
    });
  }
}

function discoverAnother(current) {
  const options = DATA.events.filter(e =>
    e.year === state.year &&
    e.id !== current.id &&
    (
      !state.selectedLocation ||
      e.country === state.selectedLocation.country ||
      e.city === state.selectedLocation.name
    )
  );

  if (options.length) {
    openEvent(
      options[Math.floor(Math.random() * options.length)].id
    );
  } else {
    $("#modal-content").insertAdjacentHTML(
      "beforeend",
      '<p class="location-status">There are no other verified records for this location and year in the current sample.</p>'
    );
  }
}

function closeModal() {
  const m = $("#event-modal");

  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showInstitution(id) {
  const i = DATA.institutions.find(x => x.id === id);
  if (!i) return;

  const modal = $("#event-modal");

  $("#modal-content").innerHTML = `
    <div class="eyebrow">
      FINANCIAL INSTITUTION · ESTABLISHED ${i.founded}
    </div>

    <h2 id="modal-title">${escapeHTML(i.name)}</h2>

    <div class="modal-location">
      ${escapeHTML(i.type)} ·
      ${escapeHTML(i.city)}, ${escapeHTML(i.country)}
    </div>

    <div class="modal-section">
      <h3>About the institution</h3>
      <p>${escapeHTML(i.description)}</p>
    </div>

    <div class="modal-section">
      <h3>References</h3>
      <div class="modal-sources">
        <a href="${escapeHTML(i.source)}"
           target="_blank"
           rel="noopener">
          Institutional history ↗
        </a>

        <a href="${escapeHTML(i.url)}"
           target="_blank"
           rel="noopener">
          Official website ↗
        </a>
      </div>
    </div>
  `;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

async function searchLocation(query) {
  const status = $("#location-status");
  status.textContent = "Searching for location…";

  try {
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - state.lastGeocode));

    if (wait) {
      await new Promise(r => setTimeout(r, wait));
    }

    state.lastGeocode = Date.now();

    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Search unavailable");
    }

    const results = await response.json();

    if (!results.length) {
      status.textContent =
        "No matching location found. Try a more specific place name.";
      return;
    }

    const p = results[0];
    const a = p.address || {};

    const name =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.county ||
      p.name ||
      query;

    const country = a.country || "";

    selectLocation(
      name,
      country,
      Number(p.lat),
      Number(p.lon)
    );

    state.map.setView(
      [Number(p.lat), Number(p.lon)],
      Math.max(7, state.map.getZoom())
    );

  } catch (e) {
    status.textContent =
      "Location search is temporarily unavailable. You can still explore the event markers.";
  }
}

function selectLocation(name, country, lat, lng) {
  state.selectedLocation = { name, country, lat, lng };

  const exactCity = DATA.events.filter(e =>
    e.year === state.year &&
    e.city.toLowerCase() === name.toLowerCase()
  );

  const national = DATA.events.filter(e =>
    e.year === state.year &&
    e.country.toLowerCase() === country.toLowerCase() &&
    e.scope === "national"
  );

  const matches = exactCity.length ? exactCity : national;

  if (matches.length) {
    const chosen = matches[
      Math.floor(Math.random() * matches.length)
    ];

    $("#location-status").textContent =
      `${name}${country ? ", " + country : ""} — showing a randomly selected ${exactCity.length ? "location-linked" : "national"} record for ${state.year}.`;

    openEvent(chosen.id);

  } else {
    $("#location-status").textContent =
      `No verified sample event is currently available for ${name}${country ? ", " + country : ""} in ${state.year}. Try another year or browse the curated markers.`;

    renderEventList();
  }
}

function renderTurningPoints() {
  const countrySelect = $("#turning-country");
  const yearSelect = $("#turning-year");
  const countries = [...new Set(DATA.turningPoints.flatMap(t => t.countries || []))].sort((a,b) => a.localeCompare(b));
  countrySelect.innerHTML = '<option value="all">All countries</option>' +
    countries.map(country => `<option value="${escapeHTML(country)}">${escapeHTML(country)}</option>`).join("");
  yearSelect.innerHTML = '<option value="all">All years</option>';
  yearSelect.disabled = true;
  renderFilteredTurningPoints();
}

function renderFilteredTurningPoints() {
  const country = $("#turning-country").value;
  const year = $("#turning-year").value;
  const filtered = DATA.turningPoints.filter(t => {
    const countryMatch = country === "all" || (t.countries || []).includes(country);
    const yearMatch = year === "all" || String(t.year) === year;
    return countryMatch && yearMatch;
  }).sort((a,b) => b.year - a.year || a.title.localeCompare(b.title));

  $("#turning-count").textContent = `${filtered.length} curated studies`;
  $("#turning-list").innerHTML = filtered.length ? filtered.map(t => `
    <article class="turning-card" data-turning="${escapeHTML(t.id)}" tabindex="0" role="button">
      <div class="event-date">${t.year} · ${escapeHTML(t.category)}</div>
      <h2>${escapeHTML(t.title)}</h2>
      <div class="event-place">${escapeHTML(t.region)}</div>
      <p>${escapeHTML(t.lede)}</p>
      <span class="card-read">Explore this turning point ↗</span>
    </article>
  `).join("") : '<div class="empty-state">No turning points match this country and year. Try another year or clear the filters.</div>';

  $("#turning-list").querySelectorAll("[data-turning]").forEach(card => {
    card.addEventListener("click", () => showTurningPoint(card.dataset.turning));
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showTurningPoint(card.dataset.turning);
      }
    });
  });
}

function showTurningPoint(id) {
  const t = DATA.turningPoints.find(x => x.id === id);
  if (!t) return;

  const detail = $("#turning-detail");
  detail.hidden = false;

  detail.innerHTML = `
    <button class="detail-back" id="back-to-turning">
      ← All turning points
    </button>

    <div class="detail-meta">
      ${t.year} · ${escapeHTML(t.category)} · ${escapeHTML(t.region)}
    </div>

    <h2>${escapeHTML(t.title)}</h2>

    <p class="detail-lede">
      ${escapeHTML(t.lede)}
    </p>

    <div class="detail-columns">
      <section>
        <h3>What happened?</h3>
        <p>${escapeHTML(t.overview)}</p>
      </section>

      <section>
        <h3>Human and economic impact</h3>
        <p>${escapeHTML(t.humanImpact)}</p>
      </section>
    </div>

    <section class="event-timeline">
      <h3>Timeline of developments</h3>

      ${t.timeline.map(item => `
        <div class="timeline-item">
          <time>${escapeHTML(prettyDate(item.date))}</time>
          <div>
            <strong>${escapeHTML(item.title)}</strong>
            <p>${escapeHTML(item.text)}</p>
          </div>
        </div>
      `).join("")}
    </section>

    <div class="modal-section">
      <h3>Countries and regions to explore</h3>
      <p>${t.countries.map(escapeHTML).join(" · ")}</p>
    </div>

    <div class="modal-section">
      <h3>Sources and further reading</h3>
      <div class="source-links">
        ${t.sources.map(s => `
          <a href="${escapeHTML(s.url)}"
             target="_blank"
             rel="noopener">
            ${escapeHTML(s.label)} ↗
          </a>
        `).join("")}
      </div>
    </div>
  `;

  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  $("#back-to-turning").addEventListener("click", () => {
    detail.hidden = true;
    $("#turning-list").scrollIntoView({ behavior: "smooth" });
  });
}

function updateYear(year) {
  state.year = Number(year);
  $("#year-slider").value = state.year;
  renderMap();
}

function route() {
  const hash = location.hash.replace("#", "") || "home";

  const validView = document.getElementById(hash)?.classList.contains("view");
  const activeView = validView ? hash : "home";
  document.querySelectorAll(".view").forEach(v => {
    const active = v.id === activeView;
    v.classList.toggle("active", active);
    v.style.removeProperty("display");
  });

  document.querySelectorAll("[data-nav]").forEach(a =>
    a.classList.toggle("active", a.dataset.nav === hash)
  );

  if (hash === "atlas" && state.map) {
    setTimeout(() => state.map.invalidateSize(), 100);
    renderMap();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindUI() {
  window.addEventListener("hashchange", route);

  $("#year-slider").addEventListener("input", e =>
    updateYear(e.target.value)
  );

  $("#previous-year").addEventListener("click", () =>
    updateYear(Math.max(1973, state.year - 1))
  );

  $("#next-year").addEventListener("click", () =>
    updateYear(Math.min(2026, state.year + 1))
  );

  $("#today-year").addEventListener("click", () =>
    updateYear(2026)
  );

  $("#category-filter").addEventListener("change", e => {
    state.category = e.target.value;
    renderMap();
  });

  $("#events-toggle").addEventListener("change", renderMap);
  $("#institutions-toggle").addEventListener("change", renderMap);
  $("#turning-country").addEventListener("change", () => {
    const country = $("#turning-country").value;
    const years = [...new Set(DATA.turningPoints
      .filter(t => country === "all" || (t.countries || []).includes(country))
      .map(t => t.year))].sort((a,b) => b-a);
    $("#turning-year").innerHTML = '<option value="all">All years</option>' +
      years.map(year => `<option value="${year}">${year}</option>`).join("");
    $("#turning-year").disabled = country === "all";
    renderFilteredTurningPoints();
  });
  $("#turning-year").addEventListener("change", renderFilteredTurningPoints);
  $("#clear-turning-filters").addEventListener("click", () => {
    $("#turning-country").value = "all";
    $("#turning-year").innerHTML = '<option value="all">All years</option>';
    $("#turning-year").value = "all";
    $("#turning-year").disabled = true;
    renderFilteredTurningPoints();
  });

  $("#location-form").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#location-search").value.trim();
    if (q) searchLocation(q);
  });

  document.querySelectorAll("[data-close-modal]").forEach(el =>
    el.addEventListener("click", closeModal)
  );

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  $("#footer-year").textContent = new Date().getFullYear();
}

(async function init() {
  bindUI();

  try {
    await loadData();
    initMap();
    renderTurningPoints();
    updateYear(2008);
    route();

  } catch (error) {
    console.error(error);

    $("#event-list").innerHTML =
      '<div class="empty-state">The data files could not be loaded. Run the site through a local web server rather than opening index.html directly. See README.md.</div>';
  }
})();


// Divy welcomes visitors on every fresh page load. Any click dismisses the welcome layer.
(function initDivyWelcome(){
  const welcome = document.getElementById("divy-welcome");
  if (!welcome) return;
  document.body.classList.add("divy-is-welcoming");
  const dismiss = () => {
    if (!welcome.isConnected) return;
    welcome.classList.add("is-leaving");
    document.body.classList.remove("divy-is-welcoming");
    welcome.remove();
  };
  welcome.addEventListener("click", event => {
    if (event.target.closest(".divy-email")) {
      event.stopPropagation();
      return;
    }
    dismiss();
  });
  const email = welcome.querySelector(".divy-email");
  if (email) email.addEventListener("click", event => event.stopPropagation());
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") dismiss();
  }, { once: true });
})();


/* Stock Market Notebook — glossary pages and term reader. */
const STOCK_TERMS = [
 {term:"Ask price",meaning:"The lowest price a seller is currently willing to accept for a security.",real:"If a share has a bid of ₹99 and an ask of ₹100, a buyer placing a market order may pay around ₹100, subject to available orders and execution.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Bear market",meaning:"A prolonged period of falling prices and broadly pessimistic market sentiment. A common convention is a fall of 20% or more from a recent peak in a broad market index.",real:"During a bear market, investors may see the value of their equity portfolios decline. The label describes market conditions; it does not tell you when prices will recover.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Bid price",meaning:"The highest price a prospective buyer is currently offering to pay for a security.",real:"A share quoted at ₹99 bid and ₹100 ask has a ₹1 spread. The bid is not necessarily the price at which you can sell a large quantity.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Blue-chip stock",meaning:"A share in a large, established company with a history of operating at scale. The phrase is informal and does not guarantee quality or safety.",real:"Investors may use the term for well-known companies, but even established businesses can lose value, face disruption or underperform.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Brokerage",meaning:"A firm or platform that facilitates the buying and selling of securities for clients. Brokerage can also refer to the fee charged for that service.",real:"When you place an equity order through a broker, the broker routes or executes it under the applicable market rules. Compare fees and services before choosing one.",url:"https://www.nseindia.com/invest/investors"},
 {term:"Bull market",meaning:"A sustained period of rising prices and generally optimistic sentiment across a market or asset class.",real:"In a bull market, a broad index may trend upwards. Individual shares can still fall, and rising prices do not mean risk has disappeared.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Capital gain",meaning:"The profit realised when an asset is sold for more than its purchase cost. A loss occurs when it is sold for less.",real:"If an investor buys a share for ₹200 and later sells it for ₹250, the ₹50 difference is a capital gain before applicable costs and taxes.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Dividend",meaning:"A distribution of part of a company's profits or reserves to eligible shareholders, usually in cash but sometimes in additional shares.",real:"If a company declares a ₹5 dividend per share and you hold 100 eligible shares on the relevant record date, the gross distribution would be ₹500 before applicable taxes.",url:"https://www.nseindia.com/invest/investors"},
 {term:"Diversification",meaning:"Spreading investments across different assets, companies, sectors or regions rather than concentrating them in one place.",real:"Holding shares in several unrelated sectors can reduce the impact of one company-specific setback. It cannot eliminate broad market losses.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Earnings per share (EPS)",meaning:"A measure of a company's profit attributable to each outstanding ordinary share, commonly calculated using profit available to ordinary shareholders divided by the weighted average shares outstanding.",real:"If profit attributable to ordinary shareholders is ₹100 crore and weighted average shares are 10 crore, EPS is ₹10. Analysts compare EPS over time and with other measures; accounting choices matter.",url:"https://www.nseindia.com/learn"},
 {term:"Equity",meaning:"Ownership interest in a company. Ordinary shares typically give shareholders a residual claim on the business and may carry voting rights.",real:"Buying a listed company's share makes you a part-owner, but your claim ranks behind creditors and other prior claims if the company is wound up.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Exchange-traded fund (ETF)",meaning:"An investment fund whose units trade on an exchange during market hours. Many ETFs track an index, basket of assets or investment strategy.",real:"An index ETF can provide exposure to many securities through one listed instrument. Its market price can differ slightly from its net asset value.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/exchange-traded-funds"},
 {term:"Index",meaning:"A calculated measure that tracks the performance of a selected group of securities using a defined methodology.",real:"The NIFTY 50 tracks a basket of 50 large, liquid companies listed on the NSE. It is a market indicator, not a stock you can buy directly.",url:"https://www.niftyindices.com/"},
 {term:"Initial public offering (IPO)",meaning:"The first offer of a company's shares to the public, through which it becomes publicly listed or raises equity from public investors.",real:"In an IPO, investors apply for shares at the offered price or within a price band. Allotment is not guaranteed, and a listing price can be above or below the offer price.",url:"https://www.sebi.gov.in/investors/investor-education.html"},
 {term:"Limit order",meaning:"An instruction to buy or sell a security only at a specified price or better. Execution is not guaranteed.",real:"A buy limit at ₹100 means you will not pay more than ₹100 per share, but the order may remain unfilled if sellers do not meet that price.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Liquidity",meaning:"How easily an asset can be bought or sold without causing a substantial change in its price. Trading activity and the bid–ask spread are useful clues.",real:"A heavily traded share with many buyers and sellers may be easier to trade than a thinly traded share, though liquidity can disappear in stressed markets.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Market capitalisation",meaning:"The market value of a company's outstanding listed shares, generally calculated as share price multiplied by the number of shares outstanding.",real:"If a company has 10 crore shares outstanding and each trades at ₹100, its market capitalisation is ₹1,000 crore. It is not the same as the company's total value or cash balance.",url:"https://www.nseindia.com/learn"},
 {term:"Market order",meaning:"An instruction to buy or sell immediately at the best available prices. The final execution price is not guaranteed.",real:"A market buy order may execute across several available sell orders, especially for a large order or a less liquid share. The price can move while it is being filled.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Mutual fund",meaning:"A pooled investment vehicle that collects money from investors and invests it according to a stated objective, managed by an asset management company.",real:"An equity mutual fund may hold shares in many companies. Investors own fund units, not the underlying shares directly, and fees and risks vary by scheme.",url:"https://www.sebi.gov.in/investors/investor-education.html"},
 {term:"Portfolio",meaning:"The collection of investments held by an individual or institution, which may include shares, bonds, funds, cash and other assets.",real:"A portfolio's overall risk depends on what it holds, how much is allocated to each position, and how those holdings behave together.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Price-to-earnings ratio (P/E)",meaning:"A valuation ratio comparing a company's share price with its earnings per share. It may use past earnings or forecast earnings.",real:"A share price of ₹200 and EPS of ₹10 gives a P/E of 20. A higher P/E can reflect growth expectations, but comparisons need context such as sector, growth and accounting quality.",url:"https://www.nseindia.com/learn"},
 {term:"Primary market",meaning:"The market in which securities are issued to investors for the first time, allowing issuers to raise capital.",real:"An IPO is a primary-market transaction: the company offers shares to investors and receives the proceeds, subject to the offer structure.",url:"https://www.sebi.gov.in/investors/investor-education.html"},
 {term:"Risk appetite",meaning:"An investor's willingness and ability to accept uncertainty and potential losses in pursuit of a financial goal.",real:"Someone saving for a near-term expense may have a lower capacity to take equity risk than someone investing for a distant goal. Personal circumstances matter.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Secondary market",meaning:"The market where investors buy and sell securities that have already been issued. Most everyday exchange trading happens here.",real:"When one investor buys an already-listed share from another investor on the NSE or BSE, that trade takes place in the secondary market; the company generally does not receive the sale proceeds.",url:"https://www.nseindia.com/invest"},
 {term:"Short selling",meaning:"Selling a security that the seller does not currently own, typically by borrowing it, with the intention of buying it back later. It carries potentially substantial risk.",real:"If a short seller sells borrowed shares at ₹100 and later buys them back at ₹80, the price difference is a gain before costs. If the price rises instead, losses can be large.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Stock exchange",meaning:"A regulated marketplace that brings together buyers and sellers of securities under defined listing, trading and disclosure rules.",real:"The National Stock Exchange of India and BSE provide electronic markets where eligible securities can be traded through registered intermediaries.",url:"https://www.nseindia.com/"},
 {term:"Stop-loss order",meaning:"An instruction designed to trigger a buy or sell order when a specified stop price is reached. The execution price may differ from the stop price.",real:"An investor holding a share may set a sell stop below the current market price. A sharp price gap can mean the eventual sale happens well below the trigger.",url:"https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work"},
 {term:"Volatility",meaning:"The degree to which an asset's price fluctuates over time. It is often estimated using the size and frequency of price changes.",real:"A share with large daily price swings is more volatile than one with smaller swings over the same period. Volatility measures movement, not whether the movement is good or bad.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Volume",meaning:"The number of shares or contracts traded during a specified period.",real:"A sudden rise in trading volume alongside a price move can indicate increased market participation, but volume alone does not explain why investors are trading.",url:"https://www.nseindia.com/market-data"},
 {term:"Yield",meaning:"Income generated by an investment over a period, often expressed as a percentage of its price or value. The exact calculation depends on the asset.",real:"Dividend yield is commonly calculated as annual dividend per share divided by the current share price. It changes when either the dividend or share price changes.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},

 {term:"Asset allocation",meaning:"The way an investment portfolio is divided among broad asset classes such as shares, bonds and cash.",real:"A portfolio with 60% in equities and 40% in bonds has a different risk and return profile from one invested entirely in shares. The right mix depends on goals, time horizon and capacity for loss.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Bond",meaning:"A debt security through which an issuer borrows money from investors and promises payments under stated terms, usually including interest and repayment of principal at maturity.",real:"A government or company may issue bonds to raise funds. Bond prices can move when interest rates, credit quality or market expectations change.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds"},
 {term:"Circuit breaker",meaning:"A market-wide or security-level mechanism that temporarily pauses or limits trading after specified price movements, according to exchange rules.",real:"If a broad index falls sharply and reaches a prescribed threshold, trading may pause to allow information to be absorbed and reduce disorderly trading.",url:"https://www.nseindia.com/"},
 {term:"Custodian",meaning:"A financial institution that safeguards clients' securities and other financial assets and may provide related administration and record-keeping services.",real:"An institutional investor may use a custodian to hold securities, process corporate actions and maintain asset records separately from the investment manager.",url:"https://www.sebi.gov.in/"},
 {term:"Demat account",meaning:"An electronic account that holds securities in dematerialised form, rather than as paper certificates. In India, it is maintained through a depository participant.",real:"When an investor buys listed shares in India, the shares are generally credited to their demat account after settlement. A trading account and demat account serve different purposes.",url:"https://www.cdslindia.com/"},
 {term:"Face value",meaning:"The nominal value assigned to a share or bond when it is issued. For a share, it is distinct from the market price.",real:"A company may have a share with a face value of ₹10 that trades at ₹250. The market price reflects what buyers and sellers are willing to pay.",url:"https://www.nseindia.com/learn"},
 {term:"Fundamental analysis",meaning:"An approach that studies a company's financial statements, business model, management, industry and economic conditions to estimate its prospects or value.",real:"An analyst may examine revenue growth, margins, debt, cash flow and competition before forming a view. The conclusions depend on assumptions and are not certain.",url:"https://www.investor.gov/introduction-investing/investing-basics/researching-investments"},
 {term:"Insider trading",meaning:"Trading in securities while in possession of material, non-public information, where prohibited by applicable securities laws and regulations.",real:"A company insider who trades using confidential results before public disclosure may breach market-abuse rules. Not every trade by an insider is automatically unlawful; the facts and rules matter.",url:"https://www.sebi.gov.in/legal/regulations.html"},
 {term:"Market correction",meaning:"A commonly used term for a decline of around 10% or more from a recent market peak. It is a market description, not a formal prediction.",real:"A broad index falling 10% from its high may be described as being in correction territory. A correction can occur within a longer bull market.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Rights issue",meaning:"An offer by a company to existing shareholders to buy additional shares, usually in proportion to their current holdings and at stated terms.",real:"A listed company may offer one new share for every five held. Shareholders may be able to subscribe, sell or let the entitlement lapse, depending on the offer rules.",url:"https://www.sebi.gov.in/investors/investor-education.html"},

 {term:"50-day moving average",meaning:"The average closing price of a security over its most recent 50 trading sessions, recalculated as each new session is added.",simple:"It smooths out daily price jumps and shows roughly where the share has been trading over the last couple of months.",real:"If the price is above its 50-day average, some traders read that as a sign of short-term strength. It is only one clue, not a guarantee.",url:"https://www.nseindia.com/market-data"},
 {term:"200-day moving average",meaning:"The average closing price over the most recent 200 trading sessions, often used to study a longer-term price trend.",simple:"Think of it as a longer view of the share's average price, covering roughly a trading year.",real:"Traders may compare the current price with its 200-day average to judge the broad trend. Different investors use different rules.",url:"https://www.nseindia.com/market-data"},
 {term:"Bollinger Bands",meaning:"A technical indicator made from a moving average and two bands placed a set number of standard deviations above and below it.",simple:"They create a moving price channel that widens when prices swing around more and narrows when prices are calmer.",real:"A share touching an outer band may attract attention, but it does not automatically mean the share must reverse.",url:"https://www.investopedia.com/terms/b/bollingerbands.asp"},
 {term:"Book value",meaning:"The value of a company's assets minus its liabilities, based on its balance sheet. Book value per share divides this amount by the relevant share count.",simple:"If a company sold its recorded assets and paid its recorded debts, book value is the amount left on paper for shareholders. Real sale values may differ.",real:"Investors compare book value per share with the market price, especially for some banks and asset-heavy businesses. Accounting values are not the same as what assets would fetch today.",url:"https://www.nseindia.com/learn"},
 {term:"CAGR",meaning:"Compound annual growth rate: the constant yearly growth rate that would take a value from its starting amount to its ending amount over a stated period.",simple:"It turns uneven growth over several years into one average yearly growth rate, as if growth happened steadily.",real:"If an investment grows from ₹1,00,000 to about ₹1,33,100 in three years, its CAGR is about 10% a year. The actual returns may have varied each year.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Debt-to-equity ratio",meaning:"A measure comparing a company's debt with shareholders' equity. The exact debt and equity definitions can vary between analysts.",simple:"It gives a rough idea of how much the company relies on borrowed money compared with owners' funds.",real:"A higher ratio can mean more financial obligations, but what counts as high depends on the industry, cash flows and type of debt.",url:"https://www.nseindia.com/learn"},
 {term:"Dividend yield",meaning:"A ratio that compares the annual dividend per share with the current market price per share, usually shown as a percentage.",simple:"It estimates how much a share pays out in dividends in a year compared with what the share costs today.",real:"If a share costs ₹200 and pays ₹8 in annual dividends, its dividend yield is 4%. A high yield can also happen because the share price has fallen.",url:"https://www.nseindia.com/invest/investors"},
 {term:"Futures",meaning:"Standardised exchange-traded contracts that require parties to buy or sell an underlying asset at a specified future date and price, subject to contract terms.",simple:"A futures contract lets traders agree today on a price for a transaction linked to something later. It can create large gains or losses.",real:"A trader may use an index future to take a view on where the index will go or to hedge a portfolio. Futures involve margin and leverage risks.",url:"https://www.nseindia.com/"},
 {term:"Indicators",meaning:"Tools that use price, volume, or other market data to help analyse trends, momentum, volatility or market participation.",simple:"Indicators are calculations placed on a price chart to help people organise what the market has been doing. They do not predict the future with certainty.",real:"Traders may combine moving averages, RSI, MACD and volume indicators. Using many indicators does not remove the risk of a wrong signal.",url:"https://www.nseindia.com/market-data"},
 {term:"MACD",meaning:"Moving Average Convergence Divergence: a momentum indicator based on the difference between two exponential moving averages, commonly shown with a signal line and histogram.",simple:"MACD compares a faster-moving price average with a slower one to show how momentum may be changing.",real:"A MACD line crossing its signal line is watched by some traders, but signals can be late or misleading in sideways markets.",url:"https://www.investopedia.com/terms/m/macd.asp"},
 {term:"Market price per share (MPS)",meaning:"The current price at which a share is quoted or traded in the market. The exact last-traded price may differ from the price available for a new order.",simple:"It is what one share is selling for in the market right now, not the value printed on the share certificate.",real:"If a share's MPS is ₹350, buying 10 shares would cost about ₹3,500 before charges, assuming execution at that price.",url:"https://www.nseindia.com/market-data"},
 {term:"Moving average",meaning:"An average of a security's prices over a chosen number of trading periods, updated as new data arrives.",simple:"It smooths out the daily ups and downs so the general direction is easier to see.",real:"A 20-day moving average reacts faster to recent price changes than a 200-day moving average. Neither tells you what the price will do next.",url:"https://www.nseindia.com/market-data"},
 {term:"OTC (over-the-counter) market",meaning:"A market where securities or financial contracts are traded directly between parties or through dealer networks rather than on a centralised exchange.",simple:"It is trading arranged through dealers or between parties instead of through a regular stock-exchange order book.",real:"Some bonds and less commonly traded securities may trade OTC. Prices can be less transparent and it may be harder to find a buyer or seller.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Options",meaning:"Derivative contracts giving the buyer the right, but not the obligation, to buy or sell an underlying asset at a specified price by or on a stated date, depending on the contract.",simple:"An option gives its buyer a choice: buy or sell at an agreed price under the contract rules. The buyer pays a premium for that right.",real:"A call option may benefit if the underlying price rises enough; a put may benefit if it falls enough. Options can expire worthless and strategies can be complex.",url:"https://www.nseindia.com/"},
 {term:"P/B ratio (price-to-book)",meaning:"A valuation ratio comparing a company's market price or market capitalisation with its book value or book value per share.",simple:"It compares what the stock market says a company is worth with the value recorded in its books.",real:"A P/B below 1 means the market price is below recorded book value per share, but that alone does not mean the share is cheap or safe.",url:"https://www.nseindia.com/learn"},
 {term:"PE ratio (P/E ratio)",meaning:"A valuation measure comparing a share's market price with earnings per share. It can be calculated using past or expected earnings.",simple:"It tells you how many rupees investors are paying for each rupee the company earns per share.",real:"If a share costs ₹300 and EPS is ₹15, its P/E is 20. Compare companies carefully because growth, debt, sector and accounting all matter.",url:"https://www.nseindia.com/learn"},
 {term:"Relative Strength Index (RSI)",meaning:"A momentum indicator that measures the speed and size of recent price changes on a scale from 0 to 100.",simple:"RSI tries to show whether recent price moves have been unusually strong in either direction.",real:"Some traders watch readings above 70 or below 30, but these are not automatic sell or buy signals. Strong trends can stay at extreme readings.",url:"https://www.investopedia.com/terms/r/rsi.asp"},
 {term:"Resistance",meaning:"A price area where selling interest has previously been strong enough to slow or halt a rise. It is an analytical concept, not a fixed ceiling.",simple:"It is a price zone where a share has struggled to move higher before because sellers appeared.",real:"If a share repeatedly turns down near ₹500, traders may watch ₹500 as resistance. It can still break above it, or turn down somewhere else.",url:"https://www.nseindia.com/market-data"},
 {term:"ROE (return on equity)",meaning:"A profitability ratio measuring net profit attributable to shareholders relative to average shareholders' equity over a period.",simple:"It shows how much profit a company makes from the money shareholders have invested in the business, based on accounting figures.",real:"A 15% ROE means the company earned about ₹15 for every ₹100 of average equity during the period. High debt or a very small equity base can affect the ratio.",url:"https://www.nseindia.com/learn"},
 {term:"SIP (systematic investment plan)",meaning:"A method of investing a fixed amount into a mutual fund at regular intervals, rather than investing one lump sum.",simple:"You set up a recurring investment—say ₹500 every month—into a mutual fund.",real:"A SIP can make regular investing easier and buy units at different prices over time. It does not guarantee profits or protect against market losses.",url:"https://www.amfiindia.com/investor-corner"},
 {term:"Support",meaning:"A price area where buying interest has previously been strong enough to slow or halt a decline. It is an analytical concept, not a guaranteed floor.",simple:"It is a zone where a share has previously found buyers and stopped falling for a while.",real:"If a share has bounced near ₹400 several times, traders may watch that area as support. It can break if selling pressure continues.",url:"https://www.nseindia.com/market-data"},
 {term:"Upper circuit",meaning:"The maximum permitted upward price movement for a security during a trading session under the applicable exchange price-band rules.",simple:"It is the day's allowed top price limit. Once the share reaches it, further buying may be difficult to execute.",real:"A share hitting its upper circuit may have many buyers but few or no sellers at that limit. Circuit limits and rules vary by security.",url:"https://www.nseindia.com/"},
 {term:"Lower circuit",meaning:"The maximum permitted downward price movement for a security during a trading session under the applicable exchange price-band rules.",simple:"It is the day's allowed bottom price limit. If a share reaches it, selling may become difficult because buyers may be scarce.",real:"A share at lower circuit can leave investors unable to sell at the price they want. The limit does not mean the share has reached its true value.",url:"https://www.nseindia.com/"},
 {term:"YTM (yield to maturity)",meaning:"The annualised rate of return implied by a bond's current price, scheduled cash flows and repayment at maturity, assuming the stated payments occur and the bond is held to maturity.",simple:"It is the estimated yearly return you would earn from a bond if you bought it at today's price and held it until it matures, assuming payments happen as promised.",real:"A bond bought below face value may have a YTM above its coupon rate. YTM is an estimate based on assumptions, not a guaranteed return if you sell early or the issuer defaults.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds"},
 
 {term:"Market indices",meaning:"Plural of index: benchmark measures that track groups of securities according to defined rules.",simple:"An index is like a scoreboard for a selected group of shares. Indices are the different scoreboards for different markets or sectors.",real:"NIFTY 50 and SENSEX are widely followed Indian equity indices. They help people track broad market movement but are not individual shares.",url:"https://www.niftyindices.com/"},
 {term:"Mutual funds",meaning:"Pooled investment schemes that collect money from investors and invest it in assets such as shares, bonds or money-market instruments according to the scheme's objective.",simple:"Many people put money into one shared pool, and the fund invests that pool for them. Each investor owns units of the fund.",real:"An equity mutual fund may hold shares in many companies. Check the scheme's objective, costs, risks and documents; returns are not guaranteed.",url:"https://www.amfiindia.com/investor-corner"},
 {term:"Open interest",meaning:"The total number of outstanding derivative contracts that have not been closed, exercised or settled.",simple:"It counts how many futures or options contracts are still open, rather than how many were traded today.",real:"Traders may study open interest alongside price and volume to understand participation in derivatives. It does not reveal market direction on its own.",url:"https://www.nseindia.com/"},
 {term:"Put option",meaning:"An option contract giving its buyer the right, but not the obligation, to sell the underlying asset at the specified strike price under the contract terms.",simple:"A put is a contract that can give its buyer the right to sell at an agreed price, even if the market price falls.",real:"An investor might buy a put as protection against a fall in a share or index. The premium can be lost if the option expires without value.",url:"https://www.nseindia.com/"},
 {term:"Call option",meaning:"An option contract giving its buyer the right, but not the obligation, to buy the underlying asset at the specified strike price under the contract terms.",simple:"A call is a contract that can give its buyer the right to buy at an agreed price if the market moves up.",real:"A call buyer may profit if the underlying price rises enough to cover the premium and costs. The option can expire worthless.",url:"https://www.nseindia.com/"},
 {term:"Market breadth",meaning:"A measure of how many securities are participating in a market move, often comparing advancing, declining and unchanged shares.",simple:"It checks whether lots of shares are rising or falling, or whether only a few big companies are moving the index.",real:"An index may rise while most shares fall if a few heavyweight stocks gain sharply. Breadth can add context to the headline index move.",url:"https://www.nseindia.com/market-data"},
 {term:"Volume-weighted average price (VWAP)",meaning:"The average traded price of a security over a period, weighted by the volume traded at each price.",simple:"It gives more importance to prices where more shares changed hands.",real:"Some traders compare the current price with the day's VWAP when judging execution quality or intraday direction. It is not a guarantee of fair value.",url:"https://www.nseindia.com/market-data"},
 {term:"Expense ratio",meaning:"The annual operating expenses of a mutual fund expressed as a percentage of its assets, charged to the scheme.",simple:"It is the yearly cost of running a fund, shown as a percentage of the money invested in it.",real:"If a fund's expense ratio is 1%, that cost reduces the fund's returns over time. Compare costs along with strategy and performance.",url:"https://www.amfiindia.com/investor-corner"},
 {term:"Net asset value (NAV)",meaning:"The per-unit value of a mutual fund's net assets, calculated by subtracting liabilities from assets and dividing by units outstanding.",simple:"It is the value of one mutual fund unit based on the fund's holdings after its liabilities are counted.",real:"If a fund has net assets of ₹100 crore and 10 crore units, its NAV is ₹10 per unit. A lower NAV does not automatically mean a fund is cheaper.",url:"https://www.amfiindia.com/investor-corner"},
 {term:"Margin",meaning:"Money or eligible collateral an investor must provide to open or maintain certain leveraged or derivative positions.",simple:"It is the security deposit you need to put up when trading with borrowed exposure or in derivatives.",real:"If a position moves against you, the broker or exchange may require more margin or close the position under its rules. Leverage can magnify losses.",url:"https://www.nseindia.com/"},
 {term:"Market lot",meaning:"The standard minimum quantity or contract size in which a particular security or derivative contract can be traded, where applicable.",simple:"It is the fixed bundle size you may have to trade instead of choosing any number you like.",real:"Some derivative contracts are traded in fixed lots. Lot sizes can change, so traders should check current exchange specifications.",url:"https://www.nseindia.com/"},
 {term:"Gap up",meaning:"A situation where a security opens at a price materially above its previous session's close.",simple:"The share starts the day noticeably higher than where it finished yesterday.",real:"A company announcement or broad market news may lead to a gap up. The price can continue rising or fall back after the open.",url:"https://www.nseindia.com/market-data"},
 {term:"Gap down",meaning:"A situation where a security opens at a price materially below its previous session's close.",simple:"The share starts the day noticeably lower than where it finished yesterday.",real:"Unexpected bad news or a market-wide sell-off can cause a gap down. Stop orders may execute at prices different from their trigger levels.",url:"https://www.nseindia.com/market-data"},

 {term:"Bonds",meaning:"Debt investments issued by governments, companies or other organisations. The issuer borrows money and agrees to pay interest, principal or both under the bond's terms.",simple:"A bond is basically an IOU: you lend money to an issuer, and it promises to pay you back under agreed rules.",real:"An investor can buy a government or corporate bond to receive scheduled payments. The issuer may default, and the bond's market price can change before maturity.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds"},
 {term:"PB Ratio",meaning:"A valuation ratio comparing a company's market price per share with its book value per share.",simple:"It compares the share's price in the market with the company's accounting value per share.",real:"A PB ratio of 2 means the market price is twice the book value per share. A low ratio is not automatically a bargain; asset quality and future profits matter.",url:"https://www.nseindia.com/learn"},
 {term:"PE Ratio",meaning:"A valuation ratio comparing a company's market price per share with its earnings per share.",simple:"It tells you how much investors are paying for each rupee of the company's earnings per share.",real:"If a share costs ₹300 and earns ₹15 per share, its PE ratio is 20. Compare it with similar companies and consider expected growth and risk.",url:"https://www.nseindia.com/learn"}
];



// Short, everyday-language explanations for the original glossary entries.
const STOCK_SIMPLE_EXPLANATIONS = {
 "Ask price":"The lowest price someone is currently asking for a share.",
 "Bear market":"A period when the overall market has been falling for a while.",
 "Bid price":"The highest price someone is currently offering to pay for a share.",
 "Blue-chip stock":"A share in a big, well-known company that has been around for a long time.",
 "Brokerage":"The company or app that helps you buy and sell investments.",
 "Bull market":"A period when the overall market has been rising for a while.",
 "Capital gain":"The money you make when you sell something for more than you paid.",
 "Dividend":"Money a company chooses to distribute to its shareholders.",
 "Diversification":"Not putting all your investment money into one company or one type of asset.",
 "Earnings per share (EPS)":"The company's profit divided across its shares. It is a rough way to see how much profit relates to each share.",
 "Equity":"Owning a small part of a company.",
 "Exchange-traded fund (ETF)":"A basket of investments that you can buy and sell on a stock exchange like a share.",
 "Index":"A group of selected shares tracked together to show how that part of the market is doing.",
 "Initial public offering (IPO)":"The first time a company offers its shares to public investors.",
 "Limit order":"An instruction that sets the highest price you will pay or the lowest price you will accept.",
 "Liquidity":"How easily you can buy or sell something without moving its price too much.",
 "Market capitalisation":"The market value of all a company's listed shares added together.",
 "Market order":"An instruction to buy or sell as soon as possible at the best prices available.",
 "Mutual fund":"A pool of money from many investors that is invested together.",
 "Portfolio":"All the investments you own, taken together.",
 "Price-to-earnings ratio (P/E)":"A way to compare a share's price with the company's profit per share.",
 "Primary market":"Where a company or government sells new securities to raise money.",
 "Risk appetite":"How much uncertainty or possible loss you are comfortable taking with your money.",
 "Secondary market":"Where investors buy and sell securities that have already been issued.",
 "Short selling":"Selling borrowed shares because you hope to buy them back later at a lower price.",
 "Stock exchange":"An organised marketplace where shares and other securities are bought and sold.",
 "Stop-loss order":"An instruction intended to sell or buy if a price reaches a level you set.",
 "Volatility":"How much and how quickly a price moves up and down.",
 "Volume":"How many shares or contracts were traded in a period.",
 "Yield":"The income an investment pays compared with its price or value.",
 "Market correction":"A noticeable fall from a recent market high, often around 10% or more. It is a description of what has happened, not a forecast.",
 "Asset allocation":"How you divide your money between shares, bonds, cash and other types of investments.",
 "Bond":"A loan you make to a company or government in return for promised payments.",
 "Circuit breaker":"A safety pause or trading limit used when prices move very sharply.",
 "Custodian":"An institution that safely holds investments on behalf of their owner.",
 "Demat account":"An electronic account where your shares are held.",
 "Face value":"The original nominal value printed for a share or bond; it is not necessarily its current price.",
 "Fundamental analysis":"Studying a company's business and finances to judge how it is doing and what it may be worth.",
 "Insider trading":"Trading using important company information that the public does not yet know, where the law prohibits it.",
 "Rights issue":"When a company gives its existing shareholders the chance to buy more of its shares."
};
const STOCK_RELATED_TERMS = {
 "Face value":["Book value","Market price per share (MPS)","Dividend"],
 "Book value":["Face value","P/B ratio (price-to-book)","ROE (return on equity)"],
 "P/B ratio (price-to-book)":["Book value","Face value","Market capitalisation"],
 "PE ratio (P/E ratio)":["Earnings per share (EPS)","Market price per share (MPS)","CAGR"],
 "Price-to-earnings ratio (P/E)":["Earnings per share (EPS)","Market price per share (MPS)","CAGR"],
 "Earnings per share (EPS)":["PE ratio (P/E ratio)","ROE (return on equity)","Dividend"],
 "ROE (return on equity)":["Book value","Debt-to-equity ratio","Earnings per share (EPS)"],
 "Debt-to-equity ratio":["ROE (return on equity)","Interest rate","Bond"],
 "Dividend yield":["Dividend","Market price per share (MPS)","Yield"],
 "CAGR":["Volatility","Capital gain","Yield"],
 "YTM (yield to maturity)":["Bond","Yield","Interest rate"],
 "Market price per share (MPS)":["Face value","PE ratio (P/E ratio)","Dividend yield"],
 "Support":["Resistance","Volume","Relative Strength Index (RSI)"],
 "Resistance":["Support","Volume","Relative Strength Index (RSI)"],
 "Upper circuit":["Lower circuit","Volatility","Liquidity"],
 "Lower circuit":["Upper circuit","Volatility","Liquidity"],
 "Futures":["Options","Open interest","Margin"],
 "Options":["Futures","Call option","Put option"],
 "Call option":["Put option","Options","Futures"],
 "Put option":["Call option","Options","Futures"],
 "Indicators":["Moving average","Relative Strength Index (RSI)","MACD"],
 "Moving average":["50-day moving average","200-day moving average","MACD"],
 "50-day moving average":["200-day moving average","Moving average","Relative Strength Index (RSI)"],
 "200-day moving average":["50-day moving average","Moving average","MACD"],
 "Relative Strength Index (RSI)":["MACD","Moving average","Volume"],
 "MACD":["Relative Strength Index (RSI)","Moving average","Bollinger Bands"],
 "Bollinger Bands":["Volatility","Moving average","Relative Strength Index (RSI)"],
 "Volume-weighted average price (VWAP)":["Volume","Market price per share (MPS)","Moving average"],
 "Mutual funds":["SIP (systematic investment plan)","Net asset value (NAV)","Expense ratio"],
 "Mutual fund":["SIP (systematic investment plan)","Net asset value (NAV)","Expense ratio"],
 "Bond":["YTM (yield to maturity)","Yield","Interest rate"],
 "Bonds":["YTM (yield to maturity)","Yield","Interest rate"],
 "PB Ratio":["Book value","P/B ratio (price-to-book)","Market price per share (MPS)"],
 "PE Ratio":["Earnings per share (EPS)","Price-to-earnings ratio (P/E)","Market price per share (MPS)"],
 "Bonds":["YTM (yield to maturity)","Yield","Interest rate"],
 "Market indices":["Index","Market breadth","ETF"],
 "Index":["Market indices","ETF","Market breadth"],
 "OTC (over-the-counter) market":["Liquidity","Stock exchange","Bond"],
 "Market correction":["Bear market","Volatility","Market indices"],
 "Market breadth":["Index","Volume","Market indices"],
 "Open interest":["Futures","Options","Volume"],
 "Margin":["Futures","Options","Short selling"],
 "SIP (systematic investment plan)":["Mutual funds","Diversification","Net asset value (NAV)"],
 "Net asset value (NAV)":["Mutual funds","ETF","Expense ratio"],
 "Expense ratio":["Mutual funds","ETF","Net asset value (NAV)"],
 "Capital gain":["CAGR","Yield","Dividend"],
 "Diversification":["Asset allocation","Portfolio","Mutual funds"],
 "Portfolio":["Asset allocation","Diversification","Risk appetite"],
 "Liquidity":["Volume","Bid price","Ask price"],
 "Volume":["Liquidity","Market breadth","VWAP (volume-weighted average price)"]
};

function stockTermCategory(term){
 const t=term.toLowerCase();
 if(/pe ratio|p\/e|pb ratio|p\/b|price-to-earnings|price-to-book|book value|face value|earnings per share|\beps\b|\broe\b|return on equity|market capitalisation|market price per share|\bcagr\b|dividend yield|dividend|enterprise value/.test(t))return "Valuation";
 if(/rsi|macd|moving average|bollinger|support|resistance|technical|vwap|volume|market breadth|indicator|trendline/.test(t))return "Technical Analysis";
 if(/future|option|call option|put option|open interest|derivative|margin/.test(t))return "Derivatives";
 if(/mutual fund|sip|systematic investment|net asset value|\bnav\b|expense ratio|exchange-traded fund|\betf\b/.test(t))return "Mutual Funds";
 if(/bond|yield to maturity|\bytm\b|coupon|fixed income|treasury/.test(t))return "Bonds";
 return "Trading Basics";
}
function notebookPlainLanguage(item){
 const base=item.simple||STOCK_SIMPLE_EXPLANATIONS[item.term]||item.meaning;
 const category=stockTermCategory(item.term);
 const notes={
  "Valuation":"When you use this idea, remember that a number is only a starting point. Compare it with similar businesses, the company's past performance and the reasons behind the number. One figure on its own cannot tell you whether an investment is good or bad.",
  "Technical Analysis":"This is a way of describing information already visible in market data. It can help you organise what has happened to a price, but it cannot tell you with certainty what will happen next. Treat it as one clue, not a prediction.",
  "Derivatives":"These contracts can move in value quickly and may involve leverage, margin and deadlines. A small movement in the underlying asset can have a much bigger effect on the money you put at risk. Understand the contract and the possible loss before using it.",
  "Mutual Funds":"A fund is a way of investing alongside other people. You own units in the fund, while the fund owns the underlying investments. The fund's value can rise or fall, and costs, risk level and investment strategy all matter.",
  "Bonds":"Think of this as lending rather than owning a piece of a business. The promised payments depend on the issuer meeting its obligations. The market value can still change before the bond matures, especially when interest rates or the issuer's credit quality change.",
  "Trading Basics":"This term helps explain how a market transaction or portfolio decision works. In real life, the final result can also depend on timing, charges, taxes, available buyers and sellers, and the rules of the platform or exchange."
 };
 return base+" "+(notes[category]||"The key is to understand what this measure describes, what it leaves out and which assumptions sit behind it. It is useful information, but it should be considered alongside the wider situation rather than treated as a complete answer.");
}
function notebookRealLife(item){
 const base=item.real;
 const category=stockTermCategory(item.term);
 const notes={
  "Valuation":"Before drawing a conclusion, ask what could make this figure change: the share price, profits, debt, cash flow or the assumptions used. Two companies can show the same ratio and still have very different risks.",
  "Technical Analysis":"For example, if you see this on a share-price chart, first check the time period and the broader market trend. Then look at other information too; a chart signal by itself is not a reason to assume a trade will work.",
  "Derivatives":"In practice, check the contract size, expiry date, margin requirement and worst-case loss. The amount paid or deposited at the beginning is not always the maximum amount that can be lost.",
  "Mutual Funds":"When comparing two schemes, look beyond recent returns. Check what each fund invests in, its benchmark, risk level, costs and whether it fits the time when you may need the money.",
  "Bonds":"An investor should look at who issued the bond, when repayment is due, how interest is paid and whether the issuer can realistically make those payments. A higher quoted return can come with higher risk.",
  "Trading Basics":"A real order may not execute at the exact price you saw on screen. Check the order type, quantity, charges and confirmation after placing it; these details can affect the actual outcome."
 };
 return base+" "+(notes[category]||"In an actual financial decision, check the surrounding details and the source of the information. Ask what could change the result, what costs apply and what could go wrong. That is how you turn a definition into something you can use.");
}
function initStockNotebook(){
 const left=document.getElementById("notebook-left-terms");if(!left)return;
 const right=document.getElementById("notebook-right-terms"),search=document.getElementById("stock-term-search"),prev=document.getElementById("notebook-prev"),next=document.getElementById("notebook-next"),status=document.getElementById("notebook-spread-status"),searchStatus=document.getElementById("stock-search-status");
 const sorted=[...STOCK_TERMS].sort((a,b)=>a.term.localeCompare(b.term,undefined,{sensitivity:"base"}));let page=0,selectedCategory="all",filtered=sorted;
 const renderSide=(items,start)=>items.map((item,index)=>'<button class="notebook-term" type="button" data-term="'+encodeURIComponent(item.term)+'"><span class="notebook-term-index">'+String(start+index+1).padStart(2,"0")+'</span><span class="notebook-term-name">'+item.term+'</span><span class="notebook-term-arrow">↗</span></button>').join("");
 function render(){const pages=Math.max(1,Math.ceil(filtered.length/20));page=Math.min(page,pages-1);const chunk=filtered.slice(page*20,page*20+20);left.innerHTML=renderSide(chunk.slice(0,10),page*20);right.innerHTML=renderSide(chunk.slice(10,20),page*20+10);
 document.getElementById("notebook-page-left-number").textContent=chunk.length?String(page*20+1).padStart(2,"0")+"—"+String(page*20+Math.min(10,chunk.length)).padStart(2,"0"):"—";
 document.getElementById("notebook-page-right-number").textContent=chunk.length>10?String(page*20+11).padStart(2,"0")+"—"+String(page*20+chunk.length).padStart(2,"0"):"—";
 document.getElementById("notebook-page-count").textContent="PAGE "+String(page+1).padStart(2,"0");status.textContent="SPREAD "+(page+1)+" OF "+pages;prev.disabled=page===0;next.disabled=page>=pages-1;
 searchStatus.textContent=filtered.length+" terms · "+(selectedCategory==="all"?"all categories":selectedCategory)+" · alphabetically arranged";
 if(!chunk.length){left.innerHTML='<p class="notebook-no-results">No terms found. Try another word.</p>';right.innerHTML='<p class="notebook-no-results">Your next discovery might be one search away.</p>';}}
 function applyFilters(){const q=search.value.trim().toLowerCase();filtered=sorted.filter(t=>(selectedCategory==="all"||stockTermCategory(t.term)===selectedCategory)&&(!q||t.term.toLowerCase().includes(q)||t.meaning.toLowerCase().includes(q)||(t.simple||STOCK_SIMPLE_EXPLANATIONS[t.term]||"").toLowerCase().includes(q)||t.real.toLowerCase().includes(q)));page=0;render();}
 function showTerm(term){const item=sorted.find(t=>t.term===term);if(!item)return;const modal=document.getElementById("stock-term-modal");modal.querySelector(".stock-term-category").textContent=stockTermCategory(item.term).toUpperCase()+" · STOCK MARKET NOTEBOOK";modal.querySelector(".stock-term-title").textContent=item.term;modal.querySelector(".stock-term-meaning").textContent=item.meaning;modal.querySelector(".stock-term-simple").textContent=notebookPlainLanguage(item);modal.querySelector(".stock-term-real").textContent=notebookRealLife(item);
 const related=modal.querySelector(".stock-term-related"),suggestions=(STOCK_RELATED_TERMS[item.term]||["Diversification","Risk appetite","Portfolio"]).filter(name=>sorted.some(t=>t.term===name&&t.term!==item.term));related.innerHTML=suggestions.length?suggestions.map(name=>'<button class="stock-related-term" type="button" data-related-term="'+encodeURIComponent(name)+'">'+name+'</button>').join(""):'<span class="stock-related-empty">Keep exploring the glossary for connected ideas.</span>';modal.querySelector(".stock-term-more").href=item.url;modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.classList.add("stock-term-open");}
 function closeTerm(){const modal=document.getElementById("stock-term-modal");modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("stock-term-open");}
 document.addEventListener("click",e=>{const related=e.target.closest(".stock-related-term");if(related){showTerm(decodeURIComponent(related.dataset.relatedTerm));return;}const button=e.target.closest(".notebook-term");if(button){showTerm(decodeURIComponent(button.dataset.term));return;}const cat=e.target.closest("[data-term-category]");if(cat){selectedCategory=cat.dataset.termCategory;document.querySelectorAll("[data-term-category]").forEach(b=>b.classList.toggle("is-active",b===cat));applyFilters();return;}if(e.target.closest("[data-close-stock-term]"))closeTerm();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeTerm();});search.addEventListener("input",applyFilters);
 document.getElementById("clear-stock-search").addEventListener("click",()=>{search.value="";selectedCategory="all";document.querySelectorAll("[data-term-category]").forEach(b=>b.classList.toggle("is-active",b.dataset.termCategory==="all"));applyFilters();search.focus();});
 prev.addEventListener("click",()=>{if(page>0){page--;render();}});next.addEventListener("click",()=>{if((page+1)*20<filtered.length){page++;render();}});render();
}
initStockNotebook();;

/* Make Divy's welcome layer dismiss reliably from any background click or key. */
(function hardenDivyWelcome(){
  const welcome=document.getElementById("divy-welcome");
  if(!welcome) return;
  const dismiss=()=>{
    if(!welcome.isConnected) return;
    document.body.classList.remove("divy-is-welcoming");
    welcome.remove();
  };
  welcome.style.pointerEvents="auto";
  welcome.addEventListener("pointerdown",event=>{
    if(event.target.closest(".divy-email")) return;
    dismiss();
  },true);
  welcome.addEventListener("click",event=>{
    if(event.target.closest(".divy-email")) return;
    dismiss();
  },true);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")dismiss();});
})();

/* Live formula calculations with beginner-friendly interpretation and rationale. */
(function(){
 const explanations={
  pe:(v,n)=>["A P/E of "+v.toFixed(2)+" times means the market price is "+v.toFixed(2)+" times the company's earnings per share. With the example values, a share price of ₹"+n("price").toFixed(2)+" and earnings of ₹"+n("eps").toFixed(2") means buyers are paying about ₹"+v.toFixed(2)+" for every ₹1 of annual earnings represented by one share. This is a way to describe the price investors are placing on the company's current earnings. It does not mean the company will definitely earn this amount in future, nor does it tell us by itself whether the share is cheap or expensive. A high or low result needs comparison with similar companies, the company's own history, expected growth, debt and the reliability of its profits.",
  "We divide share price by earnings per share because we want to relate the amount an investor pays for one share to the profit attributable to that share. Share price alone is not enough: a ₹500 share may represent very different earnings from another ₹500 share. EPS puts company profit on a per-share basis, making the comparison more meaningful. The ratio expresses the price in units of earnings, which is why the answer is shown as a multiple (×), not as rupees or a percentage. Analysts use it as one valuation clue alongside other information, not as a final decision rule."],
  pb:(v,n)=>["A P/B of "+v.toFixed(2)+" times means the market is valuing the share at "+v.toFixed(2)+" times its accounting book value per share. In this example, the market price is ₹"+n("price").toFixed(2)+" while the book value per share is ₹"+n("book").toFixed(2)+". A result above 1 means the market price is higher than the accounting value of net assets attributed to each share; below 1 means it is lower. That difference is not automatically good or bad. Investors may pay more because they expect strong future profits, valuable brands or efficient use of assets. A low result may reflect real financial trouble or assets whose recorded values do not match what they could be sold for.",
  "We divide market price by book value per share to compare what investors are currently willing to pay with the net assets recorded for each share in the company's accounts. Book value is generally assets minus liabilities, expressed per share. This can be useful when studying businesses where balance-sheet assets matter, such as some banks and financial firms. It is less informative for businesses whose most important value comes from things that are difficult to record as accounting assets, such as software, research, reputation or networks. Always read the business context and accounting notes before interpreting the ratio."],
  roe:(v,n)=>["An ROE of "+v.toFixed(2)+"% means the company generated about ₹"+v.toFixed(2)+" of profit for every ₹100 of shareholders' equity during the period, using the figures entered. In this example, profit is ₹"+n("income").toFixed(2)+" and shareholders' equity is ₹"+n("equity").toFixed(2)+". It is a measure of how much accounting profit was produced relative to the owners' recorded stake in the business. A higher ROE can look impressive, but it is not automatically proof of a better company: debt, one-off gains, buybacks or a very small equity base can make the percentage look unusually high. Compare it across time and similar businesses.",
  "We divide net income by shareholders' equity because we want to see the profit earned in relation to the capital belonging to shareholders. Profit on its own does not tell us how much capital was needed to generate it. A company earning ₹20 crore on ₹100 crore of equity has a different return profile from one earning the same ₹20 crore on ₹500 crore of equity. Multiplying by 100 converts the decimal into a percentage that is easier to read and compare. Some analyses use average equity from the beginning and end of the period because profit is earned throughout the year; this simple calculator uses the entered equity figure as a learning illustration."],
  eps:(v,n)=>["An EPS of ₹"+v.toFixed(2)+" means the company generated about ₹"+v.toFixed(2)+" of profit for each weighted-average ordinary share during the period, based on the numbers entered. Here, profit is ₹"+n("income").toFixed(2)+" crore and the weighted-average number of shares is "+n("shares").toFixed(2)+" crore. It does not mean that each shareholder receives ₹"+v.toFixed(2)+" in cash. EPS is an accounting measure of profit allocated to each share; dividends are a separate decision made by the company. Investors often compare EPS across years to understand whether profit per share is growing, but should also check whether the change came from better business performance or simply fewer shares.",
  "We divide profit available to ordinary shareholders by weighted-average ordinary shares because the profit belongs to the ordinary shareholders after relevant prior claims, and the number of shares can change during a reporting period. A weighted average accounts for shares being issued or bought back part-way through the year, rather than treating the year-end share count as if it existed for the whole period. The result gives a per-share measure, which helps compare earnings across companies of different sizes and track changes over time. EPS can still be affected by accounting policies, one-off items and dilution, so it should be read with the financial statements."],
  cagr:(v,n)=>["A CAGR of "+v.toFixed(2)+"% means the starting value would have to grow at a steady annual rate of about "+v.toFixed(2)+"% to reach the entered ending value over "+n("years").toFixed(2)+" years. With these inputs, the value moves from ₹"+n("start").toLocaleString("en-IN")+" to ₹"+n("end").toLocaleString("en-IN")+". Actual growth may not have been steady: one year could have been strong and another weak. CAGR smooths the journey into one annualised rate so different periods can be compared more easily. It does not show the ups and downs along the way, and it does not predict what will happen next.",
  "We divide the ending value by the starting value to find the total growth multiple. We then raise that multiple to the power of one divided by the number of years, which converts the total change into an equivalent annual growth factor. Subtracting 1 removes the original starting value, and multiplying by 100 expresses the result as a percentage. The exponent is important because growth compounds: a 10% increase each year builds on the previous year's larger amount. This is why simply dividing the total percentage gain by the number of years can give the wrong answer. CAGR is useful for comparing historical growth periods, but it hides volatility and the timing of gains or losses."],
  ytm:(v,n)=>["This approximate YTM of "+v.toFixed(2)+"% is a rough annualised estimate based on the bond's coupon, the difference between its face value and current price, and the time left until maturity. In this example, the bond has a face value of ₹"+n("face").toFixed(2)+", costs ₹"+n("price").toFixed(2)+" in the market, pays an annual coupon of ₹"+n("coupon").toFixed(2)+" and has "+n("years").toFixed(2)+" years remaining. The estimate combines the annual interest with an averaged annual gain or loss if the bond moves towards face value by maturity. It is not a guaranteed return and is not the exact yield used in professional bond pricing.",
  "We use the coupon because it represents the regular interest cash flow promised by the bond. We include the difference between face value and market price because an investor buying below face value may receive an additional amount when the bond is repaid at maturity; buying above face value can have the opposite effect. Dividing that difference by years spreads the estimated gain or loss across the remaining period. The average of face value and market price is used as a rough estimate of the capital invested over that period. Exact YTM is found by solving for the discount rate that makes the present value of every promised coupon and the final repayment equal to the bond's market price. This shortcut can differ from exact YTM, especially for long maturities, irregular payments or large price differences."]
 };
 document.querySelectorAll("[data-calculator]").forEach(card=>{
  function update(){
   const n=k=>Number(card.querySelector('[data-field="'+k+'"]').value);
   let v=NaN,s="%",k=card.dataset.calculator;
   if(k==="pe"){v=n("price")/n("eps");s="×";}
   if(k==="pb"){v=n("price")/n("book");s="×";}
   if(k==="roe")v=n("income")/n("equity")*100;
   if(k==="eps"){v=n("income")/n("shares");s="";}
   if(k==="cagr")v=(Math.pow(n("end")/n("start"),1/n("years"))-1)*100;
   if(k==="ytm")v=((n("coupon")+(n("face")-n("price"))/n("years"))/((n("face")+n("price"))/2))*100;
   const valid=Number.isFinite(v)&&v>=0&&card.querySelectorAll("input").length&&[...card.querySelectorAll("input")].every(input=>input.value!==""&&Number.isFinite(Number(input.value))&&Number(input.value)>=0);
   card.querySelector("output").textContent=valid?(k==="eps"?"₹":"")+v.toFixed(2)+s:"Enter valid non-negative values";
   const meaning=card.querySelector(".formula-meaning"),why=card.querySelector(".formula-why");
   if(meaning&&why&&valid){const copy=explanations[k](v,n);meaning.textContent=copy[0];why.textContent=copy[1];}
   else if(meaning&&why){meaning.textContent="Enter valid values above to see what this result means.";why.textContent="The explanation will update when the inputs are valid.";}
  }
  card.addEventListener("input",update);update();
 });
})();
