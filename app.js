/**
 * Salon Dashboard Logic (GitHub Pages Compatible)
 */

// Global Webhook Configuration Variables (can be updated dynamically in Settings)
let WEBHOOK_URL = localStorage.getItem("SALON_WEBHOOK_URL") || "YOUR_N8N_WEBHOOK_URL";
let PERFORMANCE_API_URL = localStorage.getItem("SALON_PERF_URL") || "YOUR_N8N_PERFORMANCE_WEBHOOK_URL";

// Initial Demo/Local Storage State
const DEFAULT_SERVICES = [
  { name: "Hair Cut", price: 300 },
  { name: "Beard", price: 200 },
  { name: "Hair Cut + Shave", price: 450 },
  { name: "Facial", price: 800 },
  { name: "Hair Dye", price: 1200 }
];

const INITIAL_TRANSACTIONS = [
  { id: 1, customer_name: "Rahul", phone: "9876543210", service: "Hair Cut", price: 500, date: "2026-08-23", time: "10:30:00", whatsapp_status: "Sent" },
  { id: 2, customer_name: "Arun", phone: "9845012345", service: "Beard", price: 250, date: "2026-08-23", time: "11:15:00", whatsapp_status: "Sent" },
  { id: 3, customer_name: "Vikram", phone: "9811122233", service: "Facial", price: 800, date: "2026-08-22", time: "16:00:00", whatsapp_status: "Sent" },
  { id: 4, customer_name: "Pooja", phone: "9988776655", service: "Hair Dye", price: 1200, date: "2026-08-20", time: "14:20:00", whatsapp_status: "Sent" }
];

let appState = {
  salonName: localStorage.getItem("SALON_NAME") || "Luxe Salon & Spa",
  ownerName: localStorage.getItem("OWNER_NAME") || "Ramesh Sharma",
  ownerPhone: localStorage.getItem("OWNER_PHONE") || "+91 98765 00000",
  services: JSON.parse(localStorage.getItem("SALON_SERVICES")) || DEFAULT_SERVICES,
  transactions: JSON.parse(localStorage.getItem("SALON_TX")) || INITIAL_TRANSACTIONS
};

let monthlyChartInstance = null;
let serviceChartInstance = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  setupNavigation();
  populateServiceDropdown();
  renderDashboard();
  renderTransactionsTable();
  renderPerformance();
  initSettings();
});

function initUI() {
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  document.getElementById("dashboard-date").innerText = new Date().toLocaleDateString('en-IN', options);
  document.getElementById("nav-salon-name").innerText = appState.salonName;
}

// Navigation View Routing
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

// Form & Services Handlers
function populateServiceDropdown() {
  const dropdown = document.getElementById("cust-service");
  dropdown.innerHTML = "";
  appState.services.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = `${s.name} (₹${s.price})`;
    if (idx === 0) {
      document.getElementById("cust-price").value = s.price;
    }
    dropdown.appendChild(opt);
  });
}

function updateDefaultPrice(serviceName) {
  const item = appState.services.find(s => s.name === serviceName);
  if (item) {
    document.getElementById("cust-price").value = item.price;
  }
}

// Transaction Submission (Webhook + State Sync)
async function handleCustomerSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById("cust-name");
  const phoneInput = document.getElementById("cust-phone");
  const serviceInput = document.getElementById("cust-service");
  const priceInput = document.getElementById("cust-price");
  const submitBtn = document.getElementById("submit-btn");
  const spinner = document.getElementById("submit-spinner");
  const submitText = document.getElementById("submit-text");

  // Validation
  let isValid = true;
  const phoneVal = phoneInput.value.trim();
  const phoneRegex = /^[6-9]\d{9}$/;

  document.getElementById("cust-name-error").innerText = "";
  document.getElementById("cust-phone-error").innerText = "";
  document.getElementById("cust-price-error").innerText = "";

  if (!nameInput.value.trim()) {
    document.getElementById("cust-name-error").innerText = "Customer name is required.";
    isValid = false;
  }
  if (!phoneRegex.test(phoneVal)) {
    document.getElementById("cust-phone-error").innerText = "Please enter a valid 10-digit Indian phone number.";
    isValid = false;
  }
  if (!priceInput.value || Number(priceInput.value) <= 0) {
    document.getElementById("cust-price-error").innerText = "Please enter a valid amount.";
    isValid = false;
  }

  if (!isValid) return;

  const now = new Date();
  const payload = {
    customer_name: nameInput.value.trim(),
    phone: phoneVal,
    service: serviceInput.value,
    price: Number(priceInput.value),
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    salon_name: appState.salonName
  };

  // UI Processing State
  submitBtn.disabled = true;
  spinner.classList.remove("hidden");
  submitText.innerText = "Saving transaction...";

  let whatsappSent = true;
  let saveSuccess = true;

  try {
    if (WEBHOOK_URL && WEBHOOK_URL !== "YOUR_N8N_WEBHOOK_URL") {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error("Failed connecting to n8n Webhook.");
      }

      // Check n8n custom partial status if available
      if (result.whatsapp_success === false) {
        whatsappSent = false;
      }
    } else {
      // Offline / Demo Simulation
      await new Promise(res => setTimeout(res, 800));
    }
  } catch (err) {
    showToast("Webhook error: " + err.message, "error");
    saveSuccess = false;
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add("hidden");
    submitText.innerText = "Send & Save";
  }

  if (saveSuccess) {
    // Record locally
    const newTx = {
      id: Date.now(),
      ...payload,
      whatsapp_status: whatsappSent ? "Sent" : "Failed"
    };

    appState.transactions.unshift(newTx);
    localStorage.setItem("SALON_TX", JSON.stringify(appState.transactions));

    if (whatsappSent) {
      showToast("✓ Transaction Saved & WhatsApp Bill Sent!", "success");
    } else {
      showToast("Transaction saved to Sheet, but WhatsApp message failed.", "warning");
    }

    // Reset Form
    nameInput.value = "";
    phoneInput.value = "";
    updateDefaultPrice(serviceInput.value);

    // Refresh Views
    renderDashboard();
    renderTransactionsTable();
    renderPerformance();
  }
}

// Dashboard Summary Calculation
function renderDashboard() {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  let todayRev = 0, monthRev = 0, yearRev = 0;

  appState.transactions.forEach(t => {
    if (t.date === todayStr) todayRev += t.price;
    if (t.date.startsWith(currentMonthStr)) monthRev += t.price;
    if (t.date.startsWith(currentYearStr)) yearRev += t.price;
  });

  document.getElementById("dash-today-rev").innerText = `₹${todayRev.toLocaleString('en-IN')}`;
  document.getElementById("dash-month-rev").innerText = `₹${monthRev.toLocaleString('en-IN')}`;
  document.getElementById("dash-year-rev").innerText = `₹${yearRev.toLocaleString('en-IN')}`;

  // Render recent 5 transactions
  const tbody = document.getElementById("dashboard-tx-body");
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

// Transactions View Logic
function renderTransactionsTable(filtered = null) {
  const list = filtered || appState.transactions;
  const tbody = document.getElementById("all-transactions-body");
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

// Performance View & Analytics
function renderPerformance() {
  const txs = appState.transactions;
  const totalCustomers = new Set(txs.map(t => t.phone)).size;
  const totalTx = txs.length;
  const totalRev = txs.reduce((acc, t) => acc + t.price, 0);
  const avgTx = totalTx > 0 ? Math.round(totalRev / totalTx) : 0;

  // Most Popular Service
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

  document.getElementById("perf-total-customers").innerText = totalCustomers;
  document.getElementById("perf-total-tx").innerText = totalTx;
  document.getElementById("perf-avg-tx").innerText = `₹${avgTx.toLocaleString('en-IN')}`;
  document.getElementById("perf-popular-service").innerText = popular;
}

// Chart.js Visualizations
function renderPerformanceCharts() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = new Array(12).fill(0);

  appState.transactions.forEach(t => {
    if (t.date && t.date.startsWith("2026")) {
      const monthIdx = parseInt(t.date.split("-")[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyData[monthIdx] += t.price;
      }
    }
  });

  const ctxMonth = document.getElementById("monthlyRevenueChart").getContext("2d");
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
      scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
    }
  });

  // Services breakdown
  const serviceMap = {};
  appState.transactions.forEach(t => {
    serviceMap[t.service] = (serviceMap[t.service] || 0) + t.price;
  });

  const ctxService = document.getElementById("serviceRevenueChart").getContext("2d");
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

// Fetch Remote Performance Data from n8n (Optional Sync Endpoint)
async function syncPerformanceFromWebhook() {
  if (!PERFORMANCE_API_URL || PERFORMANCE_API_URL === "YOUR_N8N_PERFORMANCE_WEBHOOK_URL") {
    showToast("Please configure the Performance Webhook URL in Settings first.", "warning");
    return;
  }

  showToast("Syncing with Google Sheets via n8n...", "warning");
  try {
    const response = await fetch(PERFORMANCE_API_URL);
    if (!response.ok) throw new Error("Sync failed.");
    const remoteData = await response.json();
    if (Array.isArray(remoteData)) {
      appState.transactions = remoteData;
      localStorage.setItem("SALON_TX", JSON.stringify(appState.transactions));
      renderDashboard();
      renderTransactionsTable();
      renderPerformance();
      renderPerformanceCharts();
      showToast("Data successfully synced from n8n!", "success");
    }
  } catch (err) {
    showToast("Failed to fetch performance sync: " + err.message, "error");
  }
}

// Settings Handlers
function initSettings() {
  document.getElementById("set-salon-name").value = appState.salonName;
  document.getElementById("set-owner-name").value = appState.ownerName;
  document.getElementById("set-owner-phone").value = appState.ownerPhone;
  document.getElementById("set-webhook-url").value = WEBHOOK_URL !== "YOUR_N8N_WEBHOOK_URL" ? WEBHOOK_URL : "";
  document.getElementById("set-perf-url").value = PERFORMANCE_API_URL !== "YOUR_N8N_PERFORMANCE_WEBHOOK_URL" ? PERFORMANCE_API_URL : "";
  
  updateMessageTemplatePreview();
  renderSettingsServices();
}

function updateMessageTemplatePreview() {
  const tmpl = `Hi {customer_name} 👋\nThank you for visiting ${appState.salonName}.\nService: {service}\nAmount: ₹{price}\nThank you for choosing us!\n— ${appState.salonName}`;
  document.getElementById("set-msg-template").value = tmpl;
}

function renderSettingsServices() {
  const container = document.getElementById("service-list");
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
  if (!nameEl.value.trim() || !priceEl.value) {
    showToast("Enter a valid name and price for the service.", "error");
    return;
  }
  appState.services.push({ name: nameEl.value.trim(), price: Number(priceEl.value) });
  localStorage.setItem("SALON_SERVICES", JSON.stringify(appState.services));
  nameEl.value = "";
  priceEl.value = "";
  renderSettingsServices();
  populateServiceDropdown();
  showToast("Service added.", "success");
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

  document.getElementById("nav-salon-name").innerText = appState.salonName;
  updateMessageTemplatePreview();
  showToast("Salon profile updated.", "success");
}

function saveWebhookSettings() {
  const wh = document.getElementById("set-webhook-url").value.trim();
  const perf = document.getElementById("set-perf-url").value.trim();

  WEBHOOK_URL = wh || "YOUR_N8N_WEBHOOK_URL";
  PERFORMANCE_API_URL = perf || "YOUR_N8N_PERFORMANCE_WEBHOOK_URL";

  localStorage.setItem("SALON_WEBHOOK_URL", WEBHOOK_URL);
  localStorage.setItem("SALON_PERF_URL", PERFORMANCE_API_URL);

  showToast("Webhook configurations saved locally.", "success");
}

// Utility Toast Component
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
