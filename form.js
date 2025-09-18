const form = document.querySelector("#contactForm")
const formStatus = document.querySelector("#formStatus")
const submitButton = form?.querySelector('[data-role="submit"]')
const mailtoButton = form?.querySelector('[data-role="mailto"]')

const navToggle = document.querySelector(".nav-toggle")
const mainNav = document.querySelector(".main-nav")

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

function updateStatus(type, message) {
  if (!formStatus) return
  formStatus.classList.remove("form-status--success", "form-status--error")
  if (type) {
    formStatus.classList.add(
      type === "success" ? "form-status--success" : "form-status--error"
    )
  }
  formStatus.textContent = message
}

function toggleLoading(isLoading) {
  if (!submitButton || !mailtoButton) return
  submitButton.disabled = isLoading
  mailtoButton.disabled = isLoading
  submitButton.classList.toggle("btn--loading", isLoading)
}

function getFieldValue(name) {
  const field = form?.elements.namedItem(name)
  if (field && "value" in field) {
    return field.value.trim()
  }
  return ""
}

function setFieldValidity(field, isValid) {
  if (!field) return
  if (isValid) {
    field.removeAttribute("aria-invalid")
  } else {
    field.setAttribute("aria-invalid", "true")
  }
}

function validateForm() {
  if (!form) return false
  let isValid = true
  updateStatus("", "")

  const nameField = form.elements.namedItem("name")
  const emailField = form.elements.namedItem("email")
  const companyField = form.elements.namedItem("company")
  const consentField = form.elements.namedItem("consent")
  const honeyField = form.elements.namedItem("_honey")

  if (honeyField && "value" in honeyField && honeyField.value.trim()) {
    updateStatus("error", "Spam detected, please resubmit the form.")
    return false
  }

  const requiredFields = [nameField, emailField, companyField, consentField]
  requiredFields.forEach((field) => {
    if (!field) return
    const value = "value" in field ? field.value.trim() : field.checked
    const valid =
      field instanceof HTMLInputElement && field.type === "checkbox"
        ? field.checked
        : Boolean(value)
    if (!valid) {
      isValid = false
      setFieldValidity(field, false)
    } else {
      setFieldValidity(field, true)
    }
  })

  if (emailField && "value" in emailField) {
    const isEmailValid = emailPattern.test(emailField.value.trim())
    if (!isEmailValid) {
      isValid = false
      setFieldValidity(emailField, false)
      updateStatus("error", "Please enter a valid email.")
    }
  }

  if (!isValid && !formStatus.textContent) {
    updateStatus(
      "error",
      "Please fill in all required fields before submitting."
    )
  }

  return isValid
}

function formatMailBody(data) {
  const lines = [
    `Name: ${data.name || "-"}`,
    `Email: ${data.email || "-"}`,
    `Company: ${data.company || "-"}`,
    `Message: ${data.message || "-"}`,
    `Consent given: ${data.consent ? "Yes" : "No"}`,
    `Source: ${data.source || "-"}`,
  ]
  return lines.join("\n")
}

function buildMailtoUrl(data) {
  const subject = encodeURIComponent(
    `Marketing research request - ${data.company || "No company provided"}`
  )
  const body = encodeURIComponent(formatMailBody(data))
  return `mailto:hello@neonlab.team?subject=${subject}&body=${body}`
}

async function submitForm(event) {
  event.preventDefault()
  if (!form || !submitButton) return

  if (!validateForm()) {
    return
  }

  const payload = {
    name: getFieldValue("name"),
    email: getFieldValue("email"),
    company: getFieldValue("company"),
    message: getFieldValue("message"),
    consent:
      form.elements.namedItem("consent") instanceof HTMLInputElement
        ? form.elements.namedItem("consent").checked
        : false,
    source: "Neon Insight Lab landing",
  }

  toggleLoading(true)
  updateStatus("", "")

  const endpoint =
    form.getAttribute("action") || "https://formspree.io/f/YOUR_ID"

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Formspree responded with ${response.status}`)
    }

    updateStatus("success", "Thank you! We will get in touch with you soon.")
    form.reset()
  } catch (error) {
    const mailtoUrl = buildMailtoUrl(payload)
    window.location.href = mailtoUrl
    updateStatus(
      "error",
      "Something went wrong. Please send an email if the problem repeats."
    )
    console.warn("Form submission failed, used mailto fallback.", error)
  } finally {
    toggleLoading(false)
  }
}

function handleMailtoClick() {
  if (!form) return
  const payload = {
    name: getFieldValue("name"),
    email: getFieldValue("email"),
    company: getFieldValue("company"),
    message: getFieldValue("message"),
    consent:
      form.elements.namedItem("consent") instanceof HTMLInputElement
        ? form.elements.namedItem("consent").checked
        : false,
    source: "Neon Insight Lab landing",
  }
  const mailtoUrl = buildMailtoUrl(payload)
  window.location.href = mailtoUrl
  updateStatus(
    "success",
    "Email draft created. Please send it when you are ready."
  )
}

function bindFieldListeners() {
  if (!form) return
  form.addEventListener("input", (event) => {
    const target = event.target
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      if (target.hasAttribute("aria-invalid") && target.value.trim()) {
        setFieldValidity(target, true)
        if (formStatus?.classList.contains("form-status--error")) {
          updateStatus("", "")
        }
      }
    }
  })
}

function initNavigation() {
  if (!navToggle || !mainNav) return
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true"
    navToggle.setAttribute("aria-expanded", String(!expanded))
    mainNav.classList.toggle("is-open", !expanded)
  })

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 768px)").matches) {
        navToggle.setAttribute("aria-expanded", "false")
        mainNav.classList.remove("is-open")
      }
    })
  })
}

if (form) {
  form.addEventListener("submit", submitForm)
  bindFieldListeners()
}

if (mailtoButton) {
  mailtoButton.addEventListener("click", handleMailtoClick)
}

initNavigation()
