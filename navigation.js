const navToggle = document.querySelector(".nav-toggle")
const mainNav = document.querySelector(".main-nav")

function closeNavigation() {
  if (!navToggle || !mainNav) return
  navToggle.setAttribute("aria-expanded", "false")
  mainNav.classList.remove("is-open")
}

function openNavigation() {
  if (!navToggle || !mainNav) return
  navToggle.setAttribute("aria-expanded", "true")
  mainNav.classList.add("is-open")
}

function toggleNavigation() {
  if (!navToggle || !mainNav) return
  const expanded = navToggle.getAttribute("aria-expanded") === "true"
  if (expanded) {
    closeNavigation()
  } else {
    openNavigation()
  }
}

function initNavigation() {
  if (!navToggle || !mainNav) return

  // Обработчик клика по кнопке меню
  navToggle.addEventListener("click", (event) => {
    event.stopPropagation()
    toggleNavigation()
  })

  // Закрытие меню при клике на ссылки внутри меню
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 768px)").matches) {
        closeNavigation()
      }
    })
  })

  // Предотвращение закрытия меню при клике внутри самого меню
  mainNav.addEventListener("click", (event) => {
    event.stopPropagation()
  })

  // Закрытие меню при клике вне его области
  document.addEventListener("click", (event) => {
    const isMenuOpen = mainNav.classList.contains("is-open")
    const isMobile = window.matchMedia("(max-width: 768px)").matches

    if (isMenuOpen && isMobile) {
      // Проверяем, что клик был не по кнопке меню и не внутри меню
      if (
        !navToggle.contains(event.target) &&
        !mainNav.contains(event.target)
      ) {
        closeNavigation()
      }
    }
  })

  // Закрытие меню при нажатии клавиши Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mainNav.classList.contains("is-open")) {
      closeNavigation()
      navToggle.focus() // Возвращаем фокус на кнопку меню
    }
  })

  // Закрытие меню при изменении размера экрана (если переходим на десктоп)
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 768px)").matches) {
      closeNavigation()
    }
  })
}

// Инициализация навигации
initNavigation()
