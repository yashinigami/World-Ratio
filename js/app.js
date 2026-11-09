const DATA = { events: [], institutions: [], turningPoints: [] };
const state = { year: 2008, category: "all", selectedLocation: null, selectedEventId: null, eventLayer: null, institutionLayer: null, map: null, lastGeocode: 0 };

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value="") => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const prettyDate = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const categoryLabel = (category) => ({crisis:"Crisis / loss",policy:"Government / policy",global:"Global development",institution:"Financial institution"}[category] || category);
const iconFor = (category) => L.divIcon({className:"",html:`<div class="custom-marker ${category}"></div>`,iconSize:[18,18],iconAnchor:[9,9]});

async function loadData(){
  const [events, institutions, turningPoints] = await Promise.all([
    fetch("data/events.json").then(r=>{if(!r.ok)throw new Error("events.json");return r.json()}),
    fetch("data/institutions.json").then(r=>{if(!r.ok)throw new Error("institutions.json");return r.json()}),
    fetch("data/turning-points.json").then(r=>{if(!r.ok)throw new Error("turning-points.json");return r.json()})
  ]);
  DATA.events=events; DATA.institutions=institutions; DATA.turningPoints=turningPoints;
}

function initMap(){
  if(!window.L){ $("#map").innerHTML='<div class="empty-state">The map library could not load. Check your internet connection and refresh.</div>'; return; }
  const map=L.map("map",{worldCopyJump:true,scrollWheelZoom:true}).setView([24,10],2);
  state.map=map;
  // Standard OpenStreetMap tiles with a CSS dark filter; no API key required.
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    subdomains:"abc",maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
  }).addTo(map);
  state.eventLayer=L.layerGroup().addTo(map);
  state.institutionLayer=L.layerGroup().addTo(map);
  renderMap();
  map.on("click", async (e)=> {
    const status=$("#location-status");
    status.textContent="Checking this location…";
    try{
      const now=Date.now();
      const wait=Math.max(0,1100-(now-state.lastGeocode));
      if(wait) await new Promise(resolve=>setTimeout(resolve,wait));
      state.lastGeocode=Date.now();
      const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=10&addressdetails=1`;
      const response=await fetch(url,{headers:{"Accept":"application/json"}});
      if(!response.ok) throw new Error("Location lookup unavailable");
      const place=await response.json();
      const a=place.address||{};
      const name=a.city||a.town||a.village||a.municipality||a.county||a.state||a.country||"Selected location";
      const country=a.country||"";
      selectLocation(name,country,e.latlng.lat,e.latlng.lng);
    }catch(err){status.textContent="Could not identify this point. Try searching for a city or selecting a marked event.";}
  });
}

function currentEvents(){
  return DATA.events.filter(e=>e.year===state.year && (state.category==="all"||e.category===state.category));
}
function renderMap(){
  if(!state.map)return;
  state.eventLayer.clearLayers(); state.institutionLayer.clearLayers();
  const eventsOn=$("#events-toggle").checked;
  const institutionsOn=$("#institutions-toggle").checked;
  if(eventsOn){
    currentEvents().forEach(event=>{
      const marker=L.marker([event.lat,event.lng],{icon:iconFor(event.category),title:event.title}).addTo(state.eventLayer);
      marker.on("click",()=>openEvent(event.id));
      marker.bindTooltip(`${event.title} · ${event.city}`,{direction:"top"});
    });
  }
  if(institutionsOn){
    DATA.institutions.filter(i=>i.founded<=state.year).forEach(inst=>{
      const marker=L.marker([inst.lat,inst.lng],{icon:iconFor("institution"),title:inst.name}).addTo(state.institutionLayer);
      marker.bindPopup(`<div class="institution-popup"><strong>${escapeHTML(inst.name)}</strong><br><span>${escapeHTML(inst.type)} · Est. ${inst.founded}</span><br><a href="${escapeHTML(inst.url)}" target="_blank" rel="noopener">Official website ↗</a></div>`);
      marker.on("click",()=>showInstitution(inst.id));
    });
  }
  $("#selected-year").textContent=state.year;
  $("#results-title").textContent=`Events in ${state.year}`;
  renderEventList();
}
function renderEventList(){
  const list=$("#event-list");
  const records=currentEvents();
  if(!records.length){
    list.innerHTML=`<div class="empty-state">No verified sample events are currently available for ${state.year}. The timeline covers 1995–2026, but the curated dataset is still being expanded. An empty year does not mean nothing happened.</div>`;
  }else{
    list.innerHTML=records.map(e=>`<article class="event-card" tabindex="0" role="button" data-event="${escapeHTML(e.id)}">
      <div class="event-card-top"><span class="event-date">${prettyDate(e.date)}</span><span class="event-tag">${categoryLabel(e.category)}</span></div>
      <h3>${escapeHTML(e.title)}</h3><div class="event-place">${escapeHTML(e.city)}, ${escapeHTML(e.country)}</div>
      <p>${escapeHTML(e.summary.slice(0,205))}${e.summary.length>205?"…":""}</p><span class="card-read">Read the event record ↗</span>
    </article>`).join("");
    list.querySelectorAll("[data-event]").forEach(card=>{
      card.addEventListener("click",()=>openEvent(card.dataset.event));
      card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openEvent(card.dataset.event)}});
    });
  }
  $("#location-status").textContent=state.selectedLocation
    ? `Selected: ${state.selectedLocation.name}${state.selectedLocation.country?", "+state.selectedLocation.country:""}. Records shown below match the selected year; use the map markers to open individual records.`
    : "Select a marker or search for a place to explore its records.";
}
function openEvent(id){
  const e=DATA.events.find(x=>x.id===id); if(!e)return;
  state.selectedEventId=id;
  const modal=$("#event-modal"),content=$("#modal-content");
  content.innerHTML=`
    <div class="eyebrow">${categoryLabel(e.category)} · ${e.year}</div>
    <h2 id="modal-title">${escapeHTML(e.title)}</h2>
    <div class="modal-location">${escapeHTML(prettyDate(e.date))} · ${escapeHTML(e.city)}, ${escapeHTML(e.country)}</div>
    <div class="modal-section"><h3>What happened?</h3><p>${escapeHTML(e.summary)}</p></div>
    <div class="modal-section"><h3>Why it mattered</h3><p>${escapeHTML(e.why)}</p></div>
    <div class="modal-section"><h3>Local and wider impact</h3><p>${escapeHTML(e.impact)}</p></div>
    <div class="modal-section"><h3>Entities involved</h3><p>${escapeHTML(e.entity)}</p></div>
    <div class="modal-section"><h3>Sources and further reading</h3><div class="modal-sources">${e.sources.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`).join("")}</div></div>
    <div class="modal-actions"><button id="another-event">Discover another event in ${e.city}</button>${e.turningPoint?`<button id="open-turning-point">Explore this turning point</button>`:""}</div>`;
  modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  $("#another-event").addEventListener("click",()=>discoverAnother(e));
  if(e.turningPoint) $("#open-turning-point").addEventListener("click",()=>{closeModal();location.hash="#turning-points";setTimeout(()=>showTurningPoint(e.turningPoint),80)});
}
function discoverAnother(current){
  const options=DATA.events.filter(e=>e.year===state.year&&e.id!==current.id&&(!state.selectedLocation||e.country===state.selectedLocation.country||e.city===state.selectedLocation.name));
  if(options.length){openEvent(options[Math.floor(Math.random()*options.length)].id);}
  else{$("#modal-content").insertAdjacentHTML("beforeend",'<p class="location-status">There are no other verified records for this location and year in the current sample.</p>');}
}
function closeModal(){const m=$("#event-modal");m.classList.remove("open");m.setAttribute("aria-hidden","true");document.body.style.overflow="";}
function showInstitution(id){
  const i=DATA.institutions.find(x=>x.id===id);if(!i)return;
  const modal=$("#event-modal");
  $("#modal-content").innerHTML=`<div class="eyebrow">FINANCIAL INSTITUTION · ESTABLISHED ${i.founded}</div><h2 id="modal-title">${escapeHTML(i.name)}</h2><div class="modal-location">${escapeHTML(i.type)} · ${escapeHTML(i.city)}, ${escapeHTML(i.country)}</div><div class="modal-section"><h3>About the institution</h3><p>${escapeHTML(i.description)}</p></div><div class="modal-section"><h3>References</h3><div class="modal-sources"><a href="${escapeHTML(i.source)}" target="_blank" rel="noopener">Institutional history ↗</a><a href="${escapeHTML(i.url)}" target="_blank" rel="noopener">Official website ↗</a></div></div>`;
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
}
async function searchLocation(query){
  const status=$("#location-status");status.textContent="Searching for location…";
  try{
    const now=Date.now(),wait=Math.max(0,1100-(now-state.lastGeocode));if(wait)await new Promise(r=>setTimeout(r,wait));state.lastGeocode=Date.now();
    const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`;
    const response=await fetch(url,{headers:{"Accept":"application/json"}});
    if(!response.ok)throw new Error("Search unavailable");
    const results=await response.json();
    if(!results.length){status.textContent="No matching location found. Try a more specific place name.";return;}
    const p=results[0],a=p.address||{};
    const name=a.city||a.town||a.village||a.municipality||a.county||p.name||query;
    const country=a.country||"";
    selectLocation(name,country,Number(p.lat),Number(p.lon));
    state.map.setView([Number(p.lat),Number(p.lon)],Math.max(7,state.map.getZoom()));
  }catch(e){status.textContent="Location search is temporarily unavailable. You can still explore the event markers.";}
}
function selectLocation(name,country,lat,lng){
  state.selectedLocation={name,country,lat,lng};
  const exactCity=DATA.events.filter(e=>e.year===state.year&&e.city.toLowerCase()===name.toLowerCase());
  const national=DATA.events.filter(e=>e.year===state.year&&e.country.toLowerCase()===country.toLowerCase()&&e.scope==="national");
  const matches=exactCity.length?exactCity:national;
  if(matches.length){
    const chosen=matches[Math.floor(Math.random()*matches.length)];
    $("#location-status").textContent=`${name}${country?", "+country:""} — showing a randomly selected ${exactCity.length?"location-linked":"national"} record for ${state.year}.`;
    openEvent(chosen.id);
  }else{
    $("#location-status").textContent=`No verified sample event is currently available for ${name}${country?", "+country:""} in ${state.year}. Try another year or browse the curated markers.`;
    renderEventList();
  }
}
function renderTurningPoints(){
  $("#turning-count").textContent=`${DATA.turningPoints.length} curated studies`;
  $("#turning-list").innerHTML=DATA.turningPoints.map(t=>`<article class="turning-card" data-turning="${escapeHTML(t.id)}" tabindex="0" role="button"><div class="event-date">${t.year} · ${escapeHTML(t.category)}</div><h2>${escapeHTML(t.title)}</h2><div class="event-place">${escapeHTML(t.region)}</div><p>${escapeHTML(t.lede)}</p><span class="card-read">Explore this turning point ↗</span></article>`).join("");
  $("#turning-list").querySelectorAll("[data-turning]").forEach(c=>{c.addEventListener("click",()=>showTurningPoint(c.dataset.turning));c.addEventListener("keydown",e=>{if(e.key==="Enter")showTurningPoint(c.dataset.turning)})});
}
function showTurningPoint(id){
  const t=DATA.turningPoints.find(x=>x.id===id);if(!t)return;
  const detail=$("#turning-detail");
  detail.hidden=false;
  detail.innerHTML=`<button class="detail-back" id="back-to-turning">← All turning points</button><div class="detail-meta">${t.year} · ${escapeHTML(t.category)} · ${escapeHTML(t.region)}</div><h2>${escapeHTML(t.title)}</h2><p class="detail-lede">${escapeHTML(t.lede)}</p>
    <div class="detail-columns"><section><h3>What happened?</h3><p>${escapeHTML(t.overview)}</p></section><section><h3>Human and economic impact</h3><p>${escapeHTML(t.humanImpact)}</p></section></div>
    <section class="event-timeline"><h3>Timeline of developments</h3>${t.timeline.map(item=>`<div class="timeline-item"><time>${escapeHTML(prettyDate(item.date))}</time><div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.text)}</p></div></div>`).join("")}</section>
    <div class="modal-section"><h3>Countries and regions to explore</h3><p>${t.countries.map(escapeHTML).join(" · ")}</p></div>
    <div class="modal-section"><h3>Sources and further reading</h3><div class="source-links">${t.sources.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.label)} ↗</a>`).join("")}</div></div>`;
  detail.scrollIntoView({behavior:"smooth",block:"start"});
  $("#back-to-turning").addEventListener("click",()=>{detail.hidden=true;$("#turning-list").scrollIntoView({behavior:"smooth"})});
}
function updateYear(year){
  state.year=Number(year);$("#year-slider").value=state.year;renderMap();
}
function route(){
  const hash=location.hash.replace("#","")||"home";
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===hash));
  document.querySelectorAll("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===hash));
  if(hash==="atlas"&&state.map){setTimeout(()=>state.map.invalidateSize(),100);renderMap();}
  window.scrollTo({top:0,behavior:"smooth"});
}
function bindUI(){
  window.addEventListener("hashchange",route);
  $("#year-slider").addEventListener("input",e=>updateYear(e.target.value));
  $("#previous-year").addEventListener("click",()=>updateYear(Math.max(1995,state.year-1)));
  $("#next-year").addEventListener("click",()=>updateYear(Math.min(2026,state.year+1)));
  $("#today-year").addEventListener("click",()=>updateYear(2026));
  $("#category-filter").addEventListener("change",e=>{state.category=e.target.value;renderMap()});
  $("#events-toggle").addEventListener("change",renderMap);
  $("#institutions-toggle").addEventListener("change",renderMap);
  $("#location-form").addEventListener("submit",e=>{e.preventDefault();const q=$("#location-search").value.trim();if(q)searchLocation(q)});
  document.querySelectorAll("[data-close-modal]").forEach(el=>el.addEventListener("click",closeModal));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
  $("#footer-year").textContent=new Date().getFullYear();
}
(async function init(){
  bindUI();
  try{await loadData();initMap();renderTurningPoints();updateYear(2008);route();}
  catch(error){console.error(error);$("#event-list").innerHTML='<div class="empty-state">The data files could not be loaded. Run the site through a local web server rather than opening index.html directly. See README.md.</div>';}
})();