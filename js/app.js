
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

  document.querySelectorAll(".view").forEach(v => {
    const active = v.id === hash;
    v.classList.toggle("active", active);
    v.style.display = active ? "block" : "none";
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
 {term:"Yield",meaning:"Income generated by an investment over a period, often expressed as a percentage of its price or value. The exact calculation depends on the asset.",real:"Dividend yield is commonly calculated as annual dividend per share divided by the current share price. It changes when either the dividend or share price changes.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"}

 {term:"Asset allocation",meaning:"The way an investment portfolio is divided among broad asset classes such as shares, bonds and cash.",real:"A portfolio with 60% in equities and 40% in bonds has a different risk and return profile from one invested entirely in shares. The right mix depends on goals, time horizon and capacity for loss.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products"},
 {term:"Bond",meaning:"A debt security through which an issuer borrows money from investors and promises payments under stated terms, usually including interest and repayment of principal at maturity.",real:"A government or company may issue bonds to raise funds. Bond prices can move when interest rates, credit quality or market expectations change.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds"},
 {term:"Circuit breaker",meaning:"A market-wide or security-level mechanism that temporarily pauses or limits trading after specified price movements, according to exchange rules.",real:"If a broad index falls sharply and reaches a prescribed threshold, trading may pause to allow information to be absorbed and reduce disorderly trading.",url:"https://www.nseindia.com/"},
 {term:"Custodian",meaning:"A financial institution that safeguards clients' securities and other financial assets and may provide related administration and record-keeping services.",real:"An institutional investor may use a custodian to hold securities, process corporate actions and maintain asset records separately from the investment manager.",url:"https://www.sebi.gov.in/"},
 {term:"Demat account",meaning:"An electronic account that holds securities in dematerialised form, rather than as paper certificates. In India, it is maintained through a depository participant.",real:"When an investor buys listed shares in India, the shares are generally credited to their demat account after settlement. A trading account and demat account serve different purposes.",url:"https://www.cdslindia.com/"},
 {term:"Face value",meaning:"The nominal value assigned to a share or bond when it is issued. For a share, it is distinct from the market price.",real:"A company may have a share with a face value of ₹10 that trades at ₹250. The market price reflects what buyers and sellers are willing to pay.",url:"https://www.nseindia.com/learn"},
 {term:"Fundamental analysis",meaning:"An approach that studies a company's financial statements, business model, management, industry and economic conditions to estimate its prospects or value.",real:"An analyst may examine revenue growth, margins, debt, cash flow and competition before forming a view. The conclusions depend on assumptions and are not certain.",url:"https://www.investor.gov/introduction-investing/investing-basics/researching-investments"},
 {term:"Insider trading",meaning:"Trading in securities while in possession of material, non-public information, where prohibited by applicable securities laws and regulations.",real:"A company insider who trades using confidential results before public disclosure may breach market-abuse rules. Not every trade by an insider is automatically unlawful; the facts and rules matter.",url:"https://www.sebi.gov.in/legal/regulations.html"},
 {term:"Market correction",meaning:"A commonly used term for a decline of around 10% or more from a recent market peak. It is a market description, not a formal prediction.",real:"A broad index falling 10% from its high may be described as being in correction territory. A correction can occur within a longer bull market.",url:"https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"},
 {term:"Rights issue",meaning:"An offer by a company to existing shareholders to buy additional shares, usually in proportion to their current holdings and at stated terms.",real:"A listed company may offer one new share for every five held. Shareholders may be able to subscribe, sell or let the entitlement lapse, depending on the offer rules.",url:"https://www.sebi.gov.in/investors/investor-education.html"}
];

function initStockNotebook(){
  const left=document.getElementById("notebook-left-terms");
  if(!left) return;
  const right=document.getElementById("notebook-right-terms");
  const search=document.getElementById("stock-term-search");
  const prev=document.getElementById("notebook-prev");
  const next=document.getElementById("notebook-next");
  const status=document.getElementById("notebook-spread-status");
  const searchStatus=document.getElementById("stock-search-status");
  const sorted=[...STOCK_TERMS].sort((a,b)=>a.term.localeCompare(b.term,undefined,{sensitivity:"base"}));
  let page=0;
  let filtered=sorted;

  const renderSide=(items,start)=>items.map((item,index)=>`
    <button class="notebook-term" type="button" data-term="${encodeURIComponent(item.term)}">
      <span class="notebook-term-index">${String(start+index+1).padStart(2,"0")}</span>
      <span class="notebook-term-name">${item.term}</span>
      <span class="notebook-term-arrow">↗</span>
    </button>`).join("");

  function render(){
    const pages=Math.max(1,Math.ceil(filtered.length/20));
    page=Math.min(page,pages-1);
    const chunk=filtered.slice(page*20,page*20+20);
    left.innerHTML=renderSide(chunk.slice(0,10),page*20);
    right.innerHTML=renderSide(chunk.slice(10,20),page*20+10);
    document.getElementById("notebook-page-left-number").textContent=chunk.length?String(page*20+1).padStart(2,"0")+"—"+String(page*20+Math.min(10,chunk.length)).padStart(2,"0"):"—";
    document.getElementById("notebook-page-right-number").textContent=chunk.length>10?String(page*20+11).padStart(2,"0")+"—"+String(page*20+chunk.length).padStart(2,"0"):"—";
    document.getElementById("notebook-page-count").textContent="PAGE "+String(page+1).padStart(2,"0");
    status.textContent="SPREAD "+(page+1)+" OF "+pages;
    prev.disabled=page===0;
    next.disabled=page>=pages-1;
    searchStatus.textContent=search.value.trim()?filtered.length+" matching term"+(filtered.length===1?"":"s")+" · alphabetically arranged":sorted.length+" terms · alphabetically arranged · 10 terms per page";
    if(!chunk.length){
      left.innerHTML='<p class="notebook-no-results">No terms found. Try another word.</p>';
      right.innerHTML='<p class="notebook-no-results">Your next discovery might be one search away.</p>';
    }
  }
  function showTerm(term){
    const item=sorted.find(t=>t.term===term);
    if(!item) return;
    const modal=document.getElementById("stock-term-modal");
    modal.querySelector(".stock-term-category").textContent="FROM THE STOCK MARKET NOTEBOOK";
    modal.querySelector(".stock-term-title").textContent=item.term;
    modal.querySelector(".stock-term-meaning").textContent=item.meaning;
    modal.querySelector(".stock-term-real").textContent=item.real;
    const link=modal.querySelector(".stock-term-more");
    link.href=item.url;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("stock-term-open");
  }
  function closeTerm(){
    const modal=document.getElementById("stock-term-modal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("stock-term-open");
  }
  document.addEventListener("click",e=>{
    const button=e.target.closest(".notebook-term");
    if(button) showTerm(decodeURIComponent(button.dataset.term));
    if(e.target.closest("[data-close-stock-term]")) closeTerm();
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape") closeTerm();});
  search.addEventListener("input",()=>{
    const q=search.value.trim().toLowerCase();
    filtered=sorted.filter(t=>!q||t.term.toLowerCase().includes(q)||t.meaning.toLowerCase().includes(q)||t.real.toLowerCase().includes(q));
    page=0;render();
  });
  document.getElementById("clear-stock-search").addEventListener("click",()=>{search.value="";filtered=sorted;page=0;render();search.focus();});
  prev.addEventListener("click",()=>{if(page>0){page--;render();}});
  next.addEventListener("click",()=>{if((page+1)*20<filtered.length){page++;render();}});
  render();
}
initStockNotebook();

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
