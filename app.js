// Helper to launch your personal WhatsApp app / WhatsApp Web
function sendViaPersonalWhatsApp(data) {
  const message = 
`Hi ${data.customer_name} 👋
Thank you for visiting ${appState.salonName}.

Service: ${data.service}
Amount: ₹${data.price}

Thank you for choosing us!
— ${appState.salonName}`;

  const encodedMessage = encodeURIComponent(message);
  const waUrl = `https://wa.me/91${data.phone}?text=${encodedMessage}`;

  // Opens WhatsApp directly on mobile or WhatsApp Web on desktop
  window.open(waUrl, "_blank");
}

// Updated Submit Handler
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
  submitText.innerText = "Processing...";

  try {
    // Optional: Still sync with n8n for Google Sheets backup if configured
    if (WEBHOOK_URL && WEBHOOK_URL !== "YOUR_N8N_WEBHOOK_URL") {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(err => console.log("n8n offline, skipping webhook sync"));
    }
  } catch (err) {
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add("hidden");
    submitText.innerText = "Send & Save";
  }

  // 1. Save locally to dashboard
  const newTx = {
    id: Date.now(),
    ...payload,
    whatsapp_status: "Sent"
  };

  appState.transactions.unshift(newTx);
  localStorage.setItem("SALON_TX", JSON.stringify(appState.transactions));

  // 2. Open Personal WhatsApp with pre-filled message
  sendViaPersonalWhatsApp(payload);

  showToast("✓ Saved! Opening WhatsApp...", "success");

  // 3. Reset form
  nameInput.value = "";
  phoneInput.value = "";
  updateDefaultPrice(serviceInput.value);

  // 4. Update UI
  renderDashboard();
  renderTransactionsTable();
  renderPerformance();
}
