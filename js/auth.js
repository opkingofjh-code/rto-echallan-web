// ==========================================
// LOGIN PAGE LOGIC - Fixed Version
// ==========================================

// Login form handler
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    const err = document.getElementById("errorMsg");

    err.textContent = "";
    btn.disabled = true;
    btn.innerHTML = "<span>LOGGING IN...</span>";

    try {
      const userCred = await auth.signInWithEmailAndPassword(email, password);
      console.log("Login success:", userCred.user.email);
      // Success - dashboard pe redirect
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error.code, error.message);

      let msg = "Login failed!";
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
          msg = "API key invalid. Config problem.";
          break;
        case "auth/operation-not-allowed":
          msg = "Email/Password login disabled in Firebase.";
          break;
        default:
          msg = error.message;
      }
      err.textContent = msg;
      err.style.color = "#ff3b5c";
      err.style.fontWeight = "700";

      btn.disabled = false;
      btn.innerHTML = "<span>LOGIN</span>";
    }
  });
}

// Auto-redirect agar already logged in hai (sirf index.html pe)
auth.onAuthStateChanged((user) => {
  if (user) {
    const path = window.location.pathname;
    if (path.endsWith("index.html") || path.endsWith("/rto-echallan-web/") || path.endsWith("/rto-echallan-web")) {
      window.location.href = "dashboard.html";
    }
  }
});
