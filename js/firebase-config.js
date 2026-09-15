// ==========================================
// FIREBASE CONFIGURATION - RTO eChallan
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBamNTH8KZuoG75LmZMcw57WZWBfFqqmBg",
  authDomain: "rto-e-challan-2fbc9.firebaseapp.com",
  databaseURL: "https://rto-e-challan-2fbc9-default-rtdb.firebaseio.com",
  projectId: "rto-e-challan-2fbc9",
  storageBucket: "rto-e-challan-2fbc9.firebasestorage.app",
  messagingSenderId: "580128087099",
  appId: "1:580128087099:web:c2ff5a1496d461520d01e"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global references
const auth = firebase.auth();
const db = firebase.database();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function requireAuth() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      const el = document.getElementById("userEmail");
      if (el) el.textContent = user.email;
    }
  });
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

function formatTime(ts) {
  if (!ts) return "N/A";
  if (typeof ts === "string") return ts;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(s) {
  if (s === undefined || s === null) return "-";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function isDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  return (Date.now() - lastSeen) < (5 * 60 * 1000);
}

function shortDeviceName(deviceId) {
  if (!deviceId) return "----";
  return String(deviceId).slice(-4);
}
