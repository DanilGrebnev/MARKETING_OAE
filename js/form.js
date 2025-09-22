/**
 * Simple contact form handler
 */

// Configuration
import { SEND_EMAIL_URL, SOURCE } from "./env.js"

// Get form elements
const form = document.querySelector("#contactForm")
const formStatus = document.querySelector("#formStatus")
const submitButton = form?.querySelector('[data-role="submit"]')
const mailtoButton = form?.querySelector('[data-role="mailto"]')

form.addEventListener("submit", submitForm)
mailtoButton.addEventListener("click", handleMailto)

/**
 * Collect form data
 */
function getFormData() {
  const formData = new FormData(form)

  return {
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    message: formData.get("message"),
    consent: formData.get("consent") === "on",
    source: SOURCE,
  }
}

/**
 * Show status message
 */
function showStatus(type, message) {
  if (!formStatus) return

  formStatus.className = `form-status ${type ? `form-status--${type}` : ""}`
  formStatus.textContent = message
}

/**
 * Toggle loading state
 */
function setLoading(loading) {
  if (!submitButton) return

  submitButton.disabled = loading
  submitButton.classList.toggle("btn--loading", loading)
  if (mailtoButton) mailtoButton.disabled = loading
}

/**
 * Submit form
 */
async function submitForm(event) {
  event.preventDefault()

  // Check consent checkbox
  const consentField = form.querySelector("#consent")
  if (!consentField.checked) {
    showStatus("error", "Please agree to the privacy policy.")
    return
  }

  const formData = new FormData(form)
  const endpoint = SEND_EMAIL_URL

  setLoading(true)
  showStatus("", "")

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    showStatus("success", "Thank you! We will get in touch with you soon.")
    form.reset()
  } catch (error) {
    console.error("Form submission error:", error)
    showStatus(
      "error",
      "Failed to send message. Please try the 'Write an Email' button instead."
    )
  } finally {
    setLoading(false)
  }
}

/**
 * Handle mailto button
 */
function handleMailto() {
  const data = getFormData()
  const subject = encodeURIComponent(
    `Marketing Research Request - ${data.company || "No company"}`
  )
  const body = encodeURIComponent(
    `Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company}\nMessage: ${data.message}`
  )
  window.location.href = `mailto:hello@neonlab.team?subject=${subject}&body=${body}`

  showStatus("success", "Email draft created.")
}
