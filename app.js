/**
 * Salon Manager Pro - Production Engine
 * GitHub Pages Compatible
 */

// Webhook Defaults
let WEBHOOK_URL = localStorage.getItem("SALON_WEBHOOK_URL") || "YOUR_N8N_WEBHOOK_URL";
let PERFORMANCE_API_URL = localStorage.getItem("SALON_PERF_URL") || "YOUR_N8N_PERFORMANCE_WEBHOOK_URL";

const DEFAULT_SERVICES = [
  { name: "Hair Cut", price: 300 },
  { name: "Beard", price: 200 },
  { name: "Hair Cut + Shave", price: 450 },
  { name: "Facial", price: 800 },
  { name: "Hair Dye", price: 1200 }
];

const INITIAL_TRANSACTIONS = [
  { id: 1, customer_name: "Rahul", phone: "9876543210", service: "Hair Cut", price: 500, date: "2026-08-23", time: "10:30:00", whatsapp_status: "Sent" },
  { id: 2, customer_name: "Arun", phone: "9845012345", service: "Beard", price: 250, date: "2026-08-23", time: "11:15:00", whatsapp_status: "Sent" }
];

let appState = {
  salonName: localStorage.getItem("SALON_NAME") || "Luxe Salon & Spa",
  ownerName: localStorage.getItem("OWNER_NAME") || "Salon Owner",
  ownerPhone: localStorage.getItem("OWNER_PHONE") || "+91 98765 00000",
  services: JSON.parse(localStorage.getItem("SALON_SERVICES")) || DEFAULT_SERVICES,
  transactions: JSON.parse(localStorage.getItem("SALON_TX")) || INITIAL_TRANSACTIONS
};

let monthlyChartInstance = null;
let serviceChartInstance = null;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  setupNavigation();
  populateServiceDropdown();
  bindFormEvents();
  renderDashboard();
  renderTransactionsTable();
  renderPerformance();
  initSettings();
});

function initUI() {
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  const dateEl = document.getElementById("dashboard-date");
  if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-IN', options);
  
  const navNameEl = document.getElementById("nav-salon-name");
  if (navNameEl) navNameEl.innerText = appState.salonName;
}

// Direct Event Binding (Eliminates inline HTML attribute errors)
function bindFormEvents() {
  const customerForm = document.getElementById("add-customer-form");
  if (customerForm) {
    customerForm.onsubmit = null; // Clear inline handler
    customerForm.addEventListener("submit", processCustomerForm);
  }

  const serviceSelect = document.getElementById("cust-service");
  if (serviceSelect) {
    serviceSelect.addEventListener("change", (e) => {
      updateDefaultPrice(e.target.value);
    });
  }
}

function setupNavigation() {
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      switchView(view);
    });
  });
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  
  const targetView = document.getElementById(`view-${viewName}`);
  const targetBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  
  if (targetView) targetView.classList.add("active");
  if (targetBtn) targetBtn.classList.add("active");

  if (viewName === 'performance') {
    renderPerformanceCharts();
  }
}

function populateServiceDropdown() {
  const dropdown = document.getElementById("cust-service");
  if (!dropdown) return;

  dropdown.innerHTML = "";
  appState.services.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = `${s.name} (₹${s.price})`;
    dropdown.appendChild(opt);
  });

  if (appState.services.length > 0) {
    dropdown.value = appState.services[0].name;
    const priceEl = document.getElementById("cust-price");
    if (priceEl) priceEl.value = appState.services[0].price;
  }
}

function updateDefaultPrice(serviceName) {
  const item = appState.services.find(s => s.name === serviceName);
  const priceEl = document.getElementById("cust-price");
  if (item && priceEl) {
    priceEl.value = item.price;
  }
}

// Direct Form Submission Logic
function processCustomerForm(e) {
  e.preventDefault();

  const nameInput = document.getElementById("cust-name");
  const phoneInput = document.getElementById("cust-phone");
  const serviceInput = document.getElementById("cust-service");
  const priceInput = document.getElementById("cust-price");

  const errName = document.getElementById("cust-name-error");
  const errPhone = document.getElementById("cust-phone-error");
  const errPrice = document.getElementById("cust-price-error");

  if (errName) errName.innerText = "";
  if (errPhone) errPhone.innerText = "";
  if (errPrice) errPrice.innerText = "";

  const nameVal = nameInput.value.trim();
  const rawPhone = phoneInput.value.trim().replace(/\D/g, "");
  const priceVal = Number(priceInput.value);

  let hasError = false;

  if (!nameVal) {
    if (errName) errName.innerText = "Please enter customer name.";
    hasError = true;
  }

  // Accepts standard 10 digit Indian mobile numbers
  if (!rawPhone || rawPhone.length !== 10 || !/^[6-9]\d{9}$/.test(rawPhone)) {
    if (errPhone) errPhone.innerText = "Please enter a valid 10-digit Indian mobile number.";
    hasError = true;
  }

  if (isNaN(priceVal) || priceVal <= 0) {
    if (errPrice) errPrice.innerText = "Please enter a valid price amount.";
    hasError = true;
  }

  if (hasError) return;

  const now = new Date();
  const payload = {
    customer_name: nameVal,
    phone: rawPhone,
    service: serviceInput.value,
    price: priceVal,
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    salon_name: appState.salonName
  };

  // 1. Save locally
  const newTx = {
    id: Date.now(),
    ...payload,
    whatsapp_status: "Sent"
  };

  appState.transactions.unshift(newTx);
  localStorage.setItem("SALON_TX", JSON.stringify(appState.transactions));

  // 2. Background Sync to n8n (if URL configured)
  if (WEBHOOK_URL && WEBHOOK_URL.startsWith("http")) {
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => console.warn("n8n offline or CORS blocked:", err));
  }

  // 3. Reset form
  nameInput.value = "";
  phoneInput.value = "";
  if (appState.services.length > 0) {
    serviceInput.value = appState.services[0].name;
    updateDefaultPrice(appState.services[0].name);
  }

  // 4. Update UI tables
  renderDashboard();
  renderTransactionsTable();
  renderPerformance();

  // 5. Build WhatsApp URL and launch
  const message = 
`Hi ${payload.customer_name} 👋
Thank you for visiting ${appState.salonName}.

Service: ${payload.service}
Amount: ₹${payload.price}

Thank you for choosing us!
— ${appState.salonName}`;

  const encodedMsg = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?phone=91${payload.phone}&text=${encodedMsg}`;

  // Direct redirection for iOS / Android / Desktop
  window.location.href = waUrl;
}

// Render Dashboard
function renderDashboard() {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  let todayRev = 0, monthRev = 0, yearRev = 0;

  appState.transactions.forEach(t => {
    const p = Number(t.price) || 0;
    if (t.date === todayStr) todayRev += p;
    if (t.date && t.date.startsWith(currentMonthStr)) monthRev += p;
    if (t.date && t.date.startsWith(currentYearStr)) yearRev += p;
  });

  const todayEl = document.getElementById("dash-today-rev");
  const monthEl = document.getElementById("dash-month-rev");
  const yearEl = document.getElementById("dash-year-rev");

  if (todayEl) todayEl.innerText = `₹${todayRev.toLocaleString('en-IN')}`;
  if (monthEl) monthEl.innerText = `₹${monthRev.toLocaleString('en-IN')}`;
  if (yearEl) yearEl.innerText = `₹${yearRev.toLocaleString('en-IN')}`;

  const tbody = document.getElementById("dashboard-tx-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.transactions.slice(0, 5).forEach(tx => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(tx.customer_name)}</strong></td>
      <td>${escapeHtml(tx.service)}</td>
      <td>₹${tx.price}</td>
      <td>${tx.date}</td>
      <td><span class="badge ${tx.whatsapp_status === 'Sent' ? 'badge-success' : 'badge-failed'}">${tx.whatsapp_status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Transactions Table
function renderTransactionsTable(filtered = null) {
  const list = filtered || appState.transactions;
  const tbody = document.getElementById("all-transactions-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No transactions found.</td></tr>`;
    return;
  }

  list.forEach(tx => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(tx.customer_name)}</strong></td>
      <td>+91 ${escapeHtml(tx.phone)}</td>
      <td>${escapeHtml(tx.service)}</td>
      <td>₹${tx.price}</td>
      <td>${tx.date} <small style="color:var(--text-muted)">${tx.time || ''}</small></td>
      <td><span class="badge ${tx.whatsapp_status === 'Sent' ? 'badge-success' : 'badge-failed'}">${tx.whatsapp_status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterTransactions(term) {
  const q = term.toLowerCase();
  const filtered = appState.transactions.filter(t => 
    t.customer_name.toLowerCase().includes(q) ||
    t.service.toLowerCase().includes(q) ||
    t.phone.includes(q)
  );
  renderTransactionsTable(filtered);
}

// Performance View
function renderPerformance() {
  const txs = appState.transactions;
  const totalCustomers = new Set(txs.map(t => t.phone)).size;
  const totalTx = txs.length;
  const totalRev = txs.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  const avgTx = totalTx > 0 ? Math.round(totalRev / totalTx) : 0;

  const serviceCounts = {};
  txs.forEach(t => serviceCounts[t.service] = (serviceCounts[t.service] || 0) + 1);
  let popular = "-";
  let maxCount = 0;
  for (let s in serviceCounts) {
    if (serviceCounts[s] > maxCount) {
      maxCount = serviceCounts[s];
      popular = `${s} (${maxCount})`;
    }
  }

  const custEl = document.getElementById("perf-total-customers");
  const txEl = document.getElementById("perf-total-tx");
  const avgEl = document.getElementById("perf-avg-tx");
  const popEl = document.getElementById("perf-popular-service");

  if (custEl) custEl.innerText = totalCustomers;
  if (txEl) txEl.innerText = totalTx;
  if (avgEl) avgEl.innerText = `₹${avgTx.toLocaleString('en-IN')}`;
  if (popEl) popEl.innerText = popular;
}

// Render Charts
function renderPerformanceCharts() {
  if (typeof Chart === "undefined") return;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = new Array(12).fill(0);

  appState.transactions.forEach(t => {
    if (t.date) {
      const parts = t.date.split("-");
      if (parts.length > 1) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyData[monthIdx] += Number(t.price) || 0;
        }
      }
    }
  });

  const monthCanvas = document.getElementById("monthlyRevenueChart");
  if (monthCanvas) {
    const ctxMonth = monthCanvas.getContext("2d");
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctxMonth, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (₹)',
          data: monthlyData,
          backgroundColor: '#c2410c',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  const serviceMap = {};
  appState.services.forEach(s => { serviceMap[s.name] = 0; });
  appState.transactions.forEach(t => {
    serviceMap[t.service] = (serviceMap[t.service] || 0) + (Number(t.price) || 0);
  });

  const serviceCanvas = document.getElementById("serviceRevenueChart");
  if (serviceCanvas) {
    const ctxService = serviceCanvas.getContext("2d");
    if (serviceChartInstance) serviceChartInstance.destroy();
    serviceChartInstance = new Chart(ctxService, {
      type: 'doughnut',
      data: {
        labels: Object.keys(serviceMap),
        datasets: [{
          data: Object.values(serviceMap),
          backgroundColor: ['#c2410c', '#0f766e', '#d97706', '#2563eb', '#7c3aed']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
}

// Settings
function initSettings() {
  const setSalon = document.getElementById("set-salon-name");
  const setOwner = document.getElementById("set-owner-name");
  const setPhone = document.getElementById("set-owner-phone");
  const setWh = document.getElementById("set-webhook-url");
  const setPerf = document.getElementById("set-perf-url");

  if (setSalon) setSalon.value = appState.salonName;
  if (setOwner) setOwner.value = appState.ownerName;
  if (setPhone) setPhone.value = appState.ownerPhone;
  if (setWh) setWh.value = WEBHOOK_URL.startsWith("http") ? WEBHOOK_URL : "";
  if (setPerf) setPerf.value = PERFORMANCE_API_URL.startsWith("http") ? PERFORMANCE_API_URL : "";
  
  updateMessageTemplatePreview();
  renderSettingsServices();
}

function updateMessageTemplatePreview() {
  const tmplEl = document.getElementById("set-msg-template");
  if (tmplEl) {
    tmplEl.value = `Hi {customer_name} 👋\nThank you for visiting ${appState.salonName}.\n\nService: {service}\nAmount: ₹{price}\n\nThank you for choosing us!\n— ${appState.salonName}`;
  }
}

function renderSettingsServices() {
  const container = document.getElementById("service-list");
  if (!container) return;
  container.innerHTML = "";
  appState.services.forEach((s, idx) => {
    const row = document.createElement("div");
    row.className = "service-item-row";
    row.innerHTML = `
      <span><strong>${escapeHtml(s.name)}</strong> — ₹${s.price}</span>
      <button class="btn btn-secondary btn-sm" onclick="removeService(${idx})">Remove</button>
    `;
    container.appendChild(row);
  });
}

function addNewService() {
  const nameEl = document.getElementById("new-service-name");
  const priceEl = document.getElementById("new-service-price");
  if (!nameEl.value.trim() || !priceEl.value) return;

  appState.services.push({ name: nameEl.value.trim(), price: Number(priceEl.value) });
  localStorage.setItem("SALON_SERVICES", JSON.stringify(appState.services));
  nameEl.value = "";
  priceEl.value = "";
  renderSettingsServices();
  populateServiceDropdown();
}

function removeService(idx) {
  appState.services.splice(idx, 1);
  localStorage.setItem("SALON_SERVICES", JSON.stringify(appState.services));
  renderSettingsServices();
  populateServiceDropdown();
}

function saveSettings(e) {
  e.preventDefault();
  appState.salonName = document.getElementById("set-salon-name").value.trim();
  appState.ownerName = document.getElementById("set-owner-name").value.trim();
  appState.ownerPhone = document.getElementById("set-owner-phone").value.trim();

  localStorage.setItem("SALON_NAME", appState.salonName);
  localStorage.setItem("OWNER_NAME", appState.ownerName);
  localStorage.setItem("OWNER_PHONE", appState.ownerPhone);

  const navNameEl = document.getElementById("nav-salon-name");
  if (navNameEl) navNameEl.innerText = appState.salonName;
  updateMessageTemplatePreview();
}

function saveWebhookSettings() {
  const wh = document.getElementById("set-webhook-url").value.trim();
  const perf = document.getElementById("set-perf-url").value.trim();

  WEBHOOK_URL = wh || "YOUR_N8N_WEBHOOK_URL";
  PERFORMANCE_API_URL = perf || "YOUR_N8N_PERFORMANCE_WEBHOOK_URL";

  localStorage.setItem("SALON_WEBHOOK_URL", WEBHOOK_URL);
  localStorage.setItem("SALON_PERF_URL", PERFORMANCE_API_URL);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
