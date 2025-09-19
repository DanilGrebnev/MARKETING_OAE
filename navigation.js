function initNavigation() {
  let openBurgerMenu = false
  const navToggle = document.querySelector(".nav-toggle")
  const mainNav = document.querySelector(".main-nav")

  if (!navToggle || !mainNav) return

  function closeNavigation() {
    openBurgerMenu = false
    mainNav.classList.remove("is-open")
  }

  function openNavigation() {
    openBurgerMenu = true
    mainNav.classList.add("is-open")
  }

  function toggleNavigation() {
    if (openBurgerMenu) {
      closeNavigation()
    } else {
      openNavigation()
    }
  }

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
      navToggle.focus()
    }
  })

  // Закрытие меню при изменении размера экрана (если переходим на десктоп)
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 768px)").matches) {
      closeNavigation()
    }
  })
}

// Инициализация навигации (на случай, если DOM уже готов)
document.addEventListener("DOMContentLoaded", initNavigation)
