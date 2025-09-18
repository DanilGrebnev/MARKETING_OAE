async function initOptionalGlobe() {
  const visual = document.querySelector(".hero__visual")
  if (!visual) return

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  )
  const isMobile = window.matchMedia("(max-width: 600px)")

  if (prefersReducedMotion.matches || isMobile.matches) {
    return
  }

  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.min.js"
    )
    const { clientWidth, clientHeight } = visual

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.setSize(clientWidth, clientHeight)
    renderer.domElement.classList.add("hero__canvas")
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.inset = "0"
    renderer.domElement.style.pointerEvents = "none"
    visual.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      40,
      clientWidth / clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 3.6)

    const pointsCount = 1600
    const positions = new Float32Array(pointsCount * 3)
    const colors = new Float32Array(pointsCount * 3)

    const cyan = new THREE.Color("#00e6ff")
    const magenta = new THREE.Color("#b64cff")

    for (let i = 0; i < pointsCount; i += 1) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const radius = 1.2 + (Math.random() - 0.5) * 0.08

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      const idx = i * 3
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z

      const color = i % 2 === 0 ? cyan : magenta
      colors[idx] = color.r
      colors[idx + 1] = color.g
      colors[idx + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let animationFrameId = 0

    const render = () => {
      points.rotation.y += 0.0025
      points.rotation.x += 0.0009
      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(render)
    }

    render()

    const handleResize = () => {
      const { clientWidth: width, clientHeight: height } = visual
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    window.addEventListener("resize", handleResize)

    const stopAnimation = () => {
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      window.removeEventListener("resize", handleResize)
    }

    const handleMotionQuery = (event) => {
      if (event.matches) {
        stopAnimation()
      }
    }

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", handleMotionQuery)
    } else if (typeof prefersReducedMotion.addListener === "function") {
      prefersReducedMotion.addListener(handleMotionQuery)
    }

    const handleMobileChange = (event) => {
      if (event.matches) {
        stopAnimation()
      }
    }

    if (typeof isMobile.addEventListener === "function") {
      isMobile.addEventListener("change", handleMobileChange)
    } else if (typeof isMobile.addListener === "function") {
      isMobile.addListener(handleMobileChange)
    }
  } catch (error) {
    console.warn("Optional globe initialization failed.", error)
  }
}

// Инициализация анимации глобуса
initOptionalGlobe()
