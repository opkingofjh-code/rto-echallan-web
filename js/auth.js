// ==========================================
// LOGIN PAGE LOGIC - Clean Version
// ==========================================

// Login form handler
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    const err = document.getElementById("errorMsg");

    err.textContent = "";
    err.style.color = "#ff3b5c";
    err.style.fontWeight = "700";

    btn.disabled = true;
    btn.innerHTML = "<span>LOGGING IN...</span>";

    try {
      console.log("Attempting login for:", email);
      const userCred = await auth.signInWithEmailAndPassword(email, password);
      console.log("✅ Login success:", userCred.user.email);
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("❌ Login error:", error.code);
      console.error("Message:", error.message);

      let msg = "Login failed: " + error.code;
      switch (error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          msg = "Invalid email or password!";
          break;
        case "auth/user-not-found":
          msg = "User not found!";
          break;
        case "auth/invalid-email":
          msg = "Invalid email format!";
          break;
        case "auth/too-many-requests":
          msg = "Too many attempts. Try later.";
          break;
        case "auth/network-request-failed":
          msg = "Network error. Check internet.";
          break;
        case "auth/api-key-not-valid":
        case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
          msg = "API key invalid!";
          break;
        case "auth/operation-not-allowed":
          msg = "Email/Password auth disabled in Firebase!";
          break;
      }
      err.textContent = msg;

      btn.disabled = false;
      btn.innerHTML = "<span>LOGIN</span>";
    }
  });
}

// Auto-redirect if already logged in
auth.onAuthStateChanged((user) => {
  console.log("Auth state changed. User:", user ? user.email : "null");
  if (user) {
    const path = window.location.pathname;
    // Sirf index.html ya root pe redirect karo
    if (path.endsWith("index.html") || 
        path === "/rto-echallan-web/" || 
        path === "/rto-echallan-web" ||
        path.endsWith("/")) {
      console.log("Already logged in - redirecting to dashboard");
      window.location.href = "dashboard.html";
    }
  }
});
