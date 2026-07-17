const CONFIG = {

  FIREBASE_URL: "https://trendgear-5d283-default-rtdb.firebaseio.com/customers.json",
  LOCAL_FALLBACK_URL: "data/trendgear_full_dataset.json",
};

const state = {
  all: [],
  filtered: [],
};

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

async function loadCustomers() {
  setConnStatus("loading", "Conectando…");

  try {

    const isPlaceholder = CONFIG.FIREBASE_URL.includes("REEMPLAZA-CON-TU-PROYECTO");
    if (isPlaceholder) throw new Error("Firebase URL no configurada, usando datos locales.");

    const res = await fetch(CONFIG.FIREBASE_URL);
    if (!res.ok) throw new Error(`Firebase respondio con status ${res.status}`);
    const json = await res.json();
    const list = normalizeFirebasePayload(json);
    if (!list.length) throw new Error("Firebase respondio vacio.");

    setConnStatus("live", "Conectado a Firebase");
    document.getElementById("footerStatus").textContent = "Fuente de datos: Firebase Realtime Database";
    return list;
  } catch (firebaseErr) {
    console.warn("[TrendGear] No se pudo leer Firebase, se usa el dataset local. Detalle:", firebaseErr.message);
  }


  try {
    const res = await fetch(CONFIG.LOCAL_FALLBACK_URL);
    if (!res.ok) throw new Error(`No se pudo cargar el dataset local (status ${res.status})`);
    const json = await res.json();
    const list = normalizeFirebasePayload(json);

    setConnStatus("demo", "Modo demostracion (datos locales)");
    document.getElementById("footerStatus").textContent = "Fuente de datos: data/trendgear_full_dataset.json (local)";
    return list;
  } catch (localErr) {
    console.error("[TrendGear] Fallo tambien el dataset local:", localErr.message);
    setConnStatus("error", "Sin conexion a datos");
    document.getElementById("footerStatus").textContent = "Fuente de datos: no disponible";
    return [];
  }
}

function normalizeFirebasePayload(json) {
  const root = json && json.customers ? json.customers : json;
  if (Array.isArray(root)) return root.filter(Boolean);
  if (root && typeof root === "object") return Object.values(root);
  return [];
}

function setConnStatus(kind, label) {
  const el = document.getElementById("connStatus");
  el.classList.remove("is-live", "is-demo", "is-error");
  if (kind === "live") el.classList.add("is-live");
  if (kind === "demo") el.classList.add("is-demo");
  if (kind === "error") el.classList.add("is-error");
  document.getElementById("connLabel").textContent = label;
}

function renderTable(rows) {
  const tbody = document.getElementById("tableBody");
  const rowCount = document.getElementById("rowCount");

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state">No hay clientes que coincidan con estos filtros. Prueba a limpiarlos.</div>
      </td></tr>`;
    rowCount.textContent = "0 clientes";
    return;
  }

  let html = "";
  rows.forEach((c) => {
    const tierClass = `badge-${(c["Membership Status"] || "").toLowerCase()}`;
    html += `
      <tr>
        <td class="cid" data-label="ID">${c["Customer ID"]}</td>
        <td class="name" data-label="Nombre">${c["Name"]}</td>
        <td data-label="Email">${c["Email"]}</td>
        <td data-label="Producto">${c["Product Purchased"]}</td>
        <td class="date" data-label="Fecha compra">${c["Purchase Date"]}</td>
        <td class="amount" data-label="Monto">${money.format(Number(c["Amount Spent ($)"]))}</td>
        <td data-label="Edad">${c["Age"]}</td>
        <td data-label="Ciudad">${c["City"]}</td>
        <td data-label="Pago">${c["Payment Method"]}</td>
        <td class="date" data-label="Ultimo login">${c["Last Login Date"]}</td>
        <td data-label="Membresia"><span class="badge ${tierClass}">${c["Membership Status"]}</span></td>
      </tr>`;
  });
  tbody.innerHTML = html;
  rowCount.textContent = `${rows.length} cliente${rows.length === 1 ? "" : "s"}`;
}

function renderKPIs(rows) {
  const totalRevenue = rows.reduce((sum, c) => sum + Number(c["Amount Spent ($)"]), 0);
  const totalCustomers = rows.length;
  const avgTicket = totalCustomers ? totalRevenue / totalCustomers : 0;
  const topTierPct = totalCustomers
    ? (rows.filter((c) => ["Gold", "Platinum"].includes(c["Membership Status"])).length / totalCustomers) * 100
    : 0;

  animateValue("kpiRevenue", (v) => money.format(v), totalRevenue);
  animateValue("kpiCustomers", (v) => Math.round(v).toString(), totalCustomers);
  animateValue("kpiAvg", (v) => money.format(v), avgTicket);
  animateValue("kpiTop", (v) => `${Math.round(v)}%`, topTierPct);

  requestAnimationFrame(() => {
    document.getElementById("kpiRevenueBar").style.width = "100%";
    document.getElementById("kpiCustomersBar").style.width = "100%";
    document.getElementById("kpiAvgBar").style.width = "70%";
    document.getElementById("kpiTopBar").style.width = `${Math.max(topTierPct, 6)}%`;
  });
}

function animateValue(elId, formatFn, target, duration = 900) {
  const el = document.getElementById(elId);
  const start = 0;
  const t0 = performance.now();
  function tick(now) {
    const progress = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = formatFn(current);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const TIER_COLORS = {
  Bronze: "#c58f5d",
  Silver: "#b9c2cc",
  Gold: "#f5a623",
  Platinum: "#7fd8ff",
};

function renderTierChart(rows) {
  const tiers = ["Bronze", "Silver", "Gold", "Platinum"];
  const counts = tiers.map((t) => rows.filter((c) => c["Membership Status"] === t).length);
  const max = Math.max(...counts, 1);
  const barW = 46, gap = 20, h = 120, baseline = h - 20;

  let bars = "";
  tiers.forEach((tier, i) => {
    const barH = (counts[i] / max) * (h - 40);
    const x = i * (barW + gap) + 10;
    bars += `
      <rect x="${x}" y="${baseline - barH}" width="${barW}" height="${barH}" rx="4" fill="${TIER_COLORS[tier]}" opacity="0.85" />
      <text x="${x + barW / 2}" y="${baseline + 16}" font-size="11" fill="#9b9b9b" text-anchor="middle">${tier}</text>
      <text x="${x + barW / 2}" y="${baseline - barH - 6}" font-size="12" fill="#f2f2f2" text-anchor="middle">${counts[i]}</text>`;
  });

  document.getElementById("tierChart").innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${tiers.length * (barW + gap)} ${h}">${bars}</svg>`;

  document.getElementById("tierLegend").innerHTML = tiers
    .map((t) => `<span><span class="legend-dot" style="background:${TIER_COLORS[t]}"></span>${t}</span>`)
    .join("");
}

function renderAgeHistogram(rows) {
  const buckets = [
    { label: "13-24", min: 13, max: 24 },
    { label: "25-34", min: 25, max: 34 },
    { label: "35-44", min: 35, max: 44 },
    { label: "45-54", min: 45, max: 54 },
    { label: "55+", min: 55, max: 200 },
  ];
  const counts = buckets.map((b) => rows.filter((c) => c.Age >= b.min && c.Age <= b.max).length);
  const max = Math.max(...counts, 1);
  const barW = 40, gap = 14, h = 120, baseline = h - 20;

  let bars = "";
  buckets.forEach((b, i) => {
    const barH = (counts[i] / max) * (h - 40);
    const x = i * (barW + gap) + 10;
    bars += `
      <rect x="${x}" y="${baseline - barH}" width="${barW}" height="${barH}" rx="4" fill="#007bff" opacity="0.85" />
      <text x="${x + barW / 2}" y="${baseline + 16}" font-size="10" fill="#9b9b9b" text-anchor="middle">${b.label}</text>
      <text x="${x + barW / 2}" y="${baseline - barH - 6}" font-size="12" fill="#f2f2f2" text-anchor="middle">${counts[i]}</text>`;
  });

  document.getElementById("ageChart").innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${buckets.length * (barW + gap)} ${h}">${bars}</svg>`;
}

function populateCityFilter(rows) {
  const select = document.getElementById("cityFilter");
  const cities = [...new Set(rows.map((c) => c.City))].sort();
  cities.forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const city = document.getElementById("cityFilter").value;
  const tier = document.getElementById("tierFilter").value;
  const payment = document.getElementById("paymentFilter").value;

  state.filtered = state.all.filter((c) => {
    const matchesQuery =
      !q ||
      c.Name.toLowerCase().includes(q) ||
      c.Email.toLowerCase().includes(q);
    const matchesCity = !city || c.City === city;
    const matchesTier = !tier || c["Membership Status"] === tier;
    const matchesPayment = !payment || c["Payment Method"] === payment;
    return matchesQuery && matchesCity && matchesTier && matchesPayment;
  });

  renderTable(state.filtered);
  renderKPIs(state.filtered);
  renderTierChart(state.filtered);
  renderAgeHistogram(state.filtered);
}

function wireFilterEvents() {
  let debounceId;
  document.getElementById("searchInput").addEventListener("input", () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(applyFilters, 180);
  });
  ["cityFilter", "tierFilter", "paymentFilter"].forEach((id) => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("cityFilter").value = "";
    document.getElementById("tierFilter").value = "";
    document.getElementById("paymentFilter").value = "";
    applyFilters();
  });
}

function wireHamburger() {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mainNav");
  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    })
  );
}

function showSkeleton() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = Array.from({ length: 5 })
    .map(
      () => `<tr class="skeleton-row">${Array.from({ length: 11 })
        .map(() => `<td><div class="skeleton"></div></td>`)
        .join("")}</tr>`
    )
    .join("");
}

async function init() {
  wireHamburger();
  wireFilterEvents();
  showSkeleton();

  const customers = await loadCustomers();
  state.all = customers;
  state.filtered = customers;

  if (!customers.length) {
    document.getElementById("tableBody").innerHTML = `
      <tr><td colspan="11"><div class="error-state">
        No fue posible cargar los datos de clientes. Revisa la consola para el detalle del error.
      </div></td></tr>`;
    document.getElementById("rowCount").textContent = "0 clientes";
    return;
  }

  populateCityFilter(customers);
  renderTable(customers);
  renderKPIs(customers);
  renderTierChart(customers);
  renderAgeHistogram(customers);
}

document.addEventListener("DOMContentLoaded", init);
