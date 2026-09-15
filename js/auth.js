// ==========================================
// LOGIN PAGE LOGIC
// ==========================================

auth.onAuthStateChanged((user) => {
  if (user) {
    const path = window.location.pathname;
    if (path.endsWith("index.html") || path.endsWith("/") || path === "") {
      window.location.href = "dashboard.html";
    }
  }
});

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
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error);

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
        default:
          msg = error.message;
      }
      err.textContent = msg;

      btn.disabled = false;
      btn.innerHTML = "<span>LOGIN</span>";
    }
  });
}
