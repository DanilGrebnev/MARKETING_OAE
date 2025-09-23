// Simple config (importable)
export const BRAND_NAME = "NeonLab"
export const SUPPORT_EMAIL = "hello@allflow.tech"
export const SEND_EMAIL_URL = "https://your-api-endpoint.com/send-email"
export const SOURCE = "Neon Insight Lab landing"

function injectBrandAndEmail() {
  const logo = document.querySelector(".logo")
  if (logo) {
    logo.textContent = BRAND_NAME
    const aria = logo.getAttribute("aria-label") || ""
    if (aria) {
      logo.setAttribute(
        "aria-label",
        aria.replace(/Neon Insight Lab|NeonLab/gi, BRAND_NAME)
      )
    }
  }

  const selectors = [
    ".header-mail",
    ".main-nav__email a",
    "footer .site-footer__inner a[href^='mailto:']",
  ]
  document.querySelectorAll(selectors.join(",")).forEach((el) => {
    el.textContent = SUPPORT_EMAIL
    el.setAttribute("href", `mailto:${SUPPORT_EMAIL}`)
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectBrandAndEmail)
} else {
  injectBrandAndEmail()
}
