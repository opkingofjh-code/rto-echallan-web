// ==========================================
// LOGIN PAGE LOGIC - RTO eChallan
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    const err = document.getElementById("errorMsg");

    err.textContent = "";
    btn.disabled = true;
    btn.innerHTML = "<span>LOGGING IN...</span>";

    try {
      console.log("Trying login:", email);
      const userCred = await auth.signInWithEmailAndPassword(email, password);
      console.log("Success:", userCred.user.email);
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("FULL ERROR:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let msg = "Login failed!";
      if (error && error.code) {
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
            msg = "Network error!";
            break;
          case "auth/api-key-not-valid":
          case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
            msg = "API key invalid!";
            break;
          case "auth/operation-not-allowed":
            msg = "Email/Password login disabled in Firebase!";
            break;
          default:
            msg = "Error: " + error.code;
        }
      } else if (error && error.message) {
        msg = "Error: " + error.message;
      } else {
        msg = "Unknown error - check console";
      }

      err.textContent = msg;
      err.style.color = "#ff3b5c";
      err.style.fontWeight = "700";

      btn.disabled = false;
      btn.innerHTML = "<span>LOGIN</span>";
    }
  });
}

auth.onAuthStateChanged((user) => {
  if (user) {
    const path = window.location.pathname;
    if (path.endsWith("index.html") ||
        path === "/rto-echallan-web/" ||
        path === "/rto-echallan-web" ||
        path.endsWith("/rto-echallan-web/")) {
      window.location.href = "dashboard.html";
    }
  }
});
