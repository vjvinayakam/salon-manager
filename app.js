// Reliable WhatsApp launcher for both Mobile and Desktop
function sendViaPersonalWhatsApp(data) {
  const message = 
`Hi ${data.customer_name} 👋
Thank you for visiting ${appState.salonName}.

Service: ${data.service}
Amount: ₹${data.price}

Thank you for choosing us!
— ${appState.salonName}`;

  const encoded = encodeURIComponent(message);
  
  // Clean phone number (strip spaces/symbols, prepend 91 for India)
  const cleanPhone = data.phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // api.whatsapp.com works seamlessly across iOS, Android, and Desktop
  const waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;

  // Direct redirection bypasses popup blockers on mobile
  window.location.href = waUrl;
}

// Updated Form Handler
function handleCustomerSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById("cust-name");
  const phoneInput = document.getElementById("cust-phone");
  const serviceInput = document.getElementById("cust-service");
  const priceInput = document.getElementById("cust-price");

  // Validation
  const phoneVal = phoneInput.value.trim().replace(/\D/g, "");
  const phoneRegex = /^[6-9]\d{9}$/;

  document.getElementById("cust-name-error").innerText = "";
  document.getElementById("cust-phone-error").innerText = "";
  document.getElementById("cust-price-error").innerText = "";

  if (!nameInput.value.trim()) {
    document.getElementById("cust-name-error").innerText = "Customer name is required.";
    return;
  }
  if (!phoneRegex.test(phoneVal)) {
    document.getElementById("cust-phone-error").innerText = "Please enter a valid 10-digit Indian phone number.";
    return;
  }
  if (!priceInput.value || Number(priceInput.value) <= 0) {
    document.getElementById("cust-price-error").innerText = "Please enter a valid amount.";
    return;
  }

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

  // 1. Save locally to dashboard immediately
  const newTx = {
    id: Date.now(),
    ...payload,
    whatsapp_status: "Sent"
  };

  appState.transactions.unshift(newTx);
  localStorage.setItem("SALON_TX", JSON.stringify(appState.transactions));

  // 2. Fire-and-forget background sync to n8n (won't stall WhatsApp launch)
  if (WEBHOOK_URL && WEBHOOK_URL !== "YOUR_N8N_WEBHOOK_URL") {
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true // Ensures delivery even if page redirects
    }).catch(err => console.log("n8n offline:", err));
  }

  // 3. Reset form fields
  nameInput.value = "";
  phoneInput.value = "";
  updateDefaultPrice(serviceInput.value);

  // 4. Update UI
  renderDashboard();
  renderTransactionsTable();
  renderPerformance();

  // 5. Instantly launch WhatsApp (synchronous with the button click)
  sendViaPersonalWhatsApp(payload);
}
