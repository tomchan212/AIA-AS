(function () {
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginSubmit = document.getElementById("login-submit");
  const registerSubmit = document.getElementById("register-submit");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  const openRegisterBtn = document.getElementById("open-register-btn");
  const backToLoginBtn = document.getElementById("back-to-login-btn");
  const googleLoginBtn = document.getElementById("google-login-btn");
  const authBackBtn = document.getElementById("auth-back-btn");
  const topBarHeading = document.getElementById("top-bar-heading");
  const topBarSub = document.getElementById("top-bar-sub");

  let view = "login";
  let submitting = false;

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden", "auth-msg--status");
    el.classList.add("auth-msg--error");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideError(el) {
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("auth-msg--status");
    el.classList.add("auth-msg--error");
    el.textContent = "";
  }

  function showView(nextView) {
    view = nextView;
    const isLogin = view === "login";

    loginView.classList.toggle("hidden", !isLogin);
    registerView.classList.toggle("hidden", isLogin);
    loginSubmit.classList.toggle("hidden", !isLogin);
    registerSubmit.classList.toggle("hidden", isLogin);
    openRegisterBtn.classList.toggle("hidden", !isLogin);
    backToLoginBtn.classList.toggle("hidden", isLogin);
    if (googleLoginBtn) googleLoginBtn.classList.toggle("hidden", !isLogin);

    topBarHeading.textContent = isLogin ? "管理後台" : "建立帳戶";
    topBarSub.textContent = isLogin ? "AIA · 預約管理" : "只需設定一次";

    authBackBtn.href = isLogin ? "index.html" : "#";
    authBackBtn.setAttribute("aria-label", isLogin ? "返回預約頁" : "返回登入");

    hideError(loginError);
    hideError(registerError);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (!isLogin) {
      const loginEmail = document.getElementById("login-email").value.trim();
      if (loginEmail) document.getElementById("reg-email").value = loginEmail;
    }
  }

  function setSubmitting(on, which) {
    submitting = on;
    const btn = which === "login" ? loginSubmit : registerSubmit;
    const label = which === "login" ? "登入後台" : "建立並登入";
    btn.disabled = on;
    btn.textContent = on ? "處理中…" : label;
    if (googleLoginBtn) googleLoginBtn.disabled = on && which === "login";
  }

  function waitForAuth() {
    return new Promise(function (resolve, reject) {
      if (window.__authReady && typeof window.__authLogin === "function") {
        resolve();
        return;
      }
      var waited = 0;
      var timer = setInterval(function () {
        waited += 200;
        if (window.__authReady && typeof window.__authLogin === "function") {
          clearInterval(timer);
          resolve();
        } else if (waited >= 15000) {
          clearInterval(timer);
          reject(new Error("連線逾時，請重新整理頁面。"));
        }
      }, 200);
    });
  }

  openRegisterBtn.addEventListener("click", function () {
    showView("register");
  });

  backToLoginBtn.addEventListener("click", function () {
    showView("login");
  });

  authBackBtn.addEventListener("click", function (e) {
    if (view === "register") {
      e.preventDefault();
      showView("login");
    }
  });

  loginSubmit.addEventListener("click", function () {
    loginForm.requestSubmit();
  });

  registerSubmit.addEventListener("click", function () {
    registerForm.requestSubmit();
  });

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", function () {
      if (submitting) return;
      hideError(loginError);

      setSubmitting(true, "login");
      waitForAuth()
        .then(function () {
          return window.__authGoogleLogin();
        })
        .then(function (res) {
          if (res && res.pending) {
            // Keep loading state while browser leaves for Google redirect.
            return;
          }
          if (res && !res.ok) {
            showError(loginError, res.message);
            setSubmitting(false, "login");
          }
        })
        .catch(function (err) {
          showError(loginError, err.message || "Google 登入失敗，請稍後再試。");
          setSubmitting(false, "login");
        });
    });
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;
    hideError(loginError);

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email) {
      showError(loginError, "請輸入帳號或 Email。");
      return;
    }
    if (password.length < 6) {
      showError(loginError, "密碼至少 6 位。");
      return;
    }

    setSubmitting(true, "login");
    waitForAuth()
      .then(function () {
        return window.__authLogin(email, password);
      })
      .then(function (res) {
        if (!res.ok) {
          if (res.code === "auth/user-not-found" || res.code === "auth/invalid-credential") {
            showError(loginError, "Email 或密碼錯誤。若未有帳戶，請按下方「建立管理員帳戶」。");
          } else {
            showError(loginError, res.message);
          }
        }
      })
      .catch(function (err) {
        showError(loginError, err.message || "登入失敗，請稍後再試。");
      })
      .finally(function () {
        setSubmitting(false, "login");
      });
  });

  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;
    hideError(registerError);

    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const password2 = document.getElementById("reg-password2").value;

    if (!email) {
      showError(registerError, "請輸入 Email。");
      return;
    }
    if (password.length < 6) {
      showError(registerError, "密碼至少 6 位。");
      return;
    }
    if (password !== password2) {
      showError(registerError, "兩次密碼不一致，請再檢查。");
      return;
    }

    setSubmitting(true, "register");
    waitForAuth()
      .then(function () {
        return window.__authRegister(email, password);
      })
      .then(function (res) {
        if (!res.ok) {
          if (res.code === "auth/email-already-in-use") {
            showError(registerError, "此 Email 已有帳戶，請按下方返回登入。");
          } else {
            showError(registerError, res.message);
          }
        }
      })
      .catch(function (err) {
        showError(registerError, err.message || "建立失敗，請稍後再試。");
      })
      .finally(function () {
        setSubmitting(false, "register");
      });
  });

  window.__authUI = {
    showLoginError: function (msg) {
      showError(loginError, msg);
    },
    showRegisterError: function (msg) {
      showError(registerError, msg);
    },
  };
})();
