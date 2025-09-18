import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js"

// Глобальные настройки визуализации (SNAKE_CASE)
// NODE_COUNT — общее количество узлов графа
const NODE_COUNT = 380
// CLUSTERS_MIN / CLUSTERS_MAX — диапазон количества кластеров (выбирается случайно в этом диапазоне)
const CLUSTERS_MIN = 5
const CLUSTERS_MAX = 10
// CLUSTER_RADIUS_* — радиус кластеров в пикселях (минимум/максимум)
const CLUSTER_RADIUS_MIN_PX = 40
const CLUSTER_RADIUS_MAX_PX = 100
// HUB_RATE — доля «хабов» (увеличенных узлов) среди всех узлов
const HUB_RATE = 0.08
// LINK_PER_NODE_MIN/MAX — целевой диапазон числа связей для одного узла внутри кластера
const LINK_PER_NODE_MIN = 1
const LINK_PER_NODE_MAX = 3
// INTER_CLUSTER_FACTOR — множитель числа межкластерных рёбер (меньше — реже)
const INTER_CLUSTER_FACTOR = 6
// GRAPH_DENSITY — коэффициент плотности графа: меньше — реже, больше — гуще (может быть > 1)
const GRAPH_DENSITY = 1.5
// SPRING_K — жёсткость «пружины» ребра (сила стягивания к длине покоя)
const SPRING_K = 0
// SPRING_REST_PX — длина покоя пружины в пикселях (используется по умолчанию, если для ребра не задана собственная)
const SPRING_REST_PX = 100
// REPULSION_STRENGTH — сила отталкивания между соседями (px^2)
const REPULSION_STRENGTH = 450
// DAMPING — коэффициент демпфирования скоростей (0..1)
const DAMPING = 0.9
// JITTER — случайные микро-возмущения (визуальная «живость»)
const JITTER = 0.28
// EDGE_OPACITY — прозрачность линий рёбер (0..1)
const EDGE_OPACITY = 0.22
// NODE_SIZE_MIN/MAX_PX — базовый размер узлов (в пикселях), масштабируется под DPR
const NODE_SIZE_MIN_PX = 1.2
const NODE_SIZE_MAX_PX = 2.0
// HUB_SIZE_MIN/MAX_PX — размер хабов (в пикселях), масштабируется под DPR
const HUB_SIZE_MIN_PX = 2.4
const HUB_SIZE_MAX_PX = 3.8
// MOTION_SCALE — масштаб амплитуды движения (увеличивает расстояние колебаний)
const MOTION_SCALE = 1.75
// WALL_PADDING_PX — отступ от краёв контейнера, ближе которого узлы не подходят
// Учитывается вместе с размером узла, чтобы точки не касались стенок визуально
const WALL_PADDING_PX = 50
// CLUSTER_CENTER_MARGIN_PX — минимальный отступ центров кластеров от краёв контейнера (в пикселях)
const CLUSTER_CENTER_MARGIN_PX = 50
// CLUSTER_CENTER_MIN_DIST_FACTOR — минимальная дистанция между центрами кластеров как доля от min(width, height)
const CLUSTER_CENTER_MIN_DIST_FACTOR = 0.28

// Network animation: dark background, blue nodes/edges, subtle motion
// - Nodes via InstancedMesh
// - Edges via single BufferGeometry + LineSegments
// - ~350–400 nodes, 6–8 clusters, hubs larger
// - Auto-initialize inside .hero__visual container
// - Canvas resizes to container
// - dispose() cleans listeners and GPU resources

class NetworkAnimation {
  constructor(container) {
    this.container = container

    // Palette
    this.colors = {
      bg: 0x0f1322,
      node: new THREE.Color("#9acbff"),
      edge: new THREE.Color("#7fb6ff"),
    }

    // Config
    this.config = {
      nodeCount: NODE_COUNT,
      clusters: Math.floor(THREE.MathUtils.randInt(CLUSTERS_MIN, CLUSTERS_MAX)),
      clusterRadius: [CLUSTER_RADIUS_MIN_PX, CLUSTER_RADIUS_MAX_PX],
      hubRate: HUB_RATE,
      linkPerNode: [LINK_PER_NODE_MIN, LINK_PER_NODE_MAX],
      interClusterFactor: INTER_CLUSTER_FACTOR,
      graphDensity: GRAPH_DENSITY,
      springK: SPRING_K,
      springRest: SPRING_REST_PX,
      repulsion: REPULSION_STRENGTH,
      damping: DAMPING,
      jitter: JITTER,
      edgeOpacity: EDGE_OPACITY,
      nodeSize: [NODE_SIZE_MIN_PX, NODE_SIZE_MAX_PX],
      hubSize: [HUB_SIZE_MIN_PX, HUB_SIZE_MAX_PX],
      motionScale: MOTION_SCALE,
    }

    // Core
    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(this.colors.bg, 0)

    this.container.appendChild(this.renderer.domElement)

    // State
    this.nodes = [] // {x,y,vx,vy,size,isHub,cluster}
    this.edges = [] // [aIndex,bIndex]

    // GPU objects
    this.nodeMesh = null
    this.edgeMesh = null

    // Bindings
    this._onResize = this._onResize.bind(this)
    this._animate = this._animate.bind(this)

    this._setup()
  }

  _setup() {
    this._resizeToContainer()
    this._generateGraph()
    this._buildGPU()

    window.addEventListener("resize", this._onResize)
    this._raf = requestAnimationFrame(this._animate)
  }

  _resizeToContainer() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    this.renderer.setSize(w, h, false)

    // Ortho camera that maps pixels to world units (top-left origin)
    this.camera.left = 0
    this.camera.right = w
    this.camera.top = 0
    this.camera.bottom = -h
    this.camera.updateProjectionMatrix()

    this.width = w
    this.height = h
    this.dpr = dpr
  }

  _generateGraph() {
    // Create cluster centers
    const clusterCenters = []
    const margin = CLUSTER_CENTER_MARGIN_PX
    const minDist =
      Math.min(this.width, this.height) * CLUSTER_CENTER_MIN_DIST_FACTOR
    let attempts = 0
    while (clusterCenters.length < this.config.clusters && attempts < 4000) {
      const x = THREE.MathUtils.randFloat(margin, this.width - margin)
      const y = -THREE.MathUtils.randFloat(margin, this.height - margin)
      if (clusterCenters.every((c) => Math.hypot(c.x - x, c.y - y) > minDist)) {
        clusterCenters.push({ x, y })
      }
      attempts++
    }

    // Allocate nodes to clusters
    const total = this.config.nodeCount
    const perCluster = Math.floor(total / clusterCenters.length)
    const leftover = total - perCluster * clusterCenters.length

    const sizes = []
    for (let i = 0; i < total; i++)
      sizes.push(i < total * this.config.hubRate ? 1 : 0)
    // Shuffle sizes to randomize hub placement
    for (let i = sizes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = sizes[i]
      sizes[i] = sizes[j]
      sizes[j] = t
    }

    this.nodes = []
    let idx = 0
    clusterCenters.forEach((c, ci) => {
      const count = perCluster + (ci < leftover ? 1 : 0)
      const radius = THREE.MathUtils.randFloat(
        this.config.clusterRadius[0],
        this.config.clusterRadius[1]
      )
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const r = radius * Math.pow(Math.random(), 0.7)
        const x = c.x + Math.cos(a) * r + (Math.random() - 0.5) * 8
        const y = c.y + Math.sin(a) * r + (Math.random() - 0.5) * 8
        const isHub = sizes[idx++] === 1
        const sizePx = isHub
          ? THREE.MathUtils.randFloat(
              this.config.hubSize[0],
              this.config.hubSize[1]
            )
          : THREE.MathUtils.randFloat(
              this.config.nodeSize[0],
              this.config.nodeSize[1]
            )
        this.nodes.push({
          x,
          y,
          vx: 0,
          vy: 0,
          size: sizePx * this.dpr,
          isHub,
          cluster: ci,
        })
      }
    })

    // Build edges: connect each node to K nearest within same cluster; plus sparse intercluster
    const kMin = this.config.linkPerNode[0]
    const kMax = this.config.linkPerNode[1]
    this.edges = []

    // Index nodes by cluster
    const byCluster = new Map()
    this.nodes.forEach((n, i) => {
      if (!byCluster.has(n.cluster)) byCluster.set(n.cluster, [])
      byCluster.get(n.cluster).push(i)
    })

    // Intra-cluster connections
    byCluster.forEach((indices) => {
      indices.forEach((i) => {
        const a = this.nodes[i]
        const nearest = indices
          .filter((j) => j !== i)
          .map((j) => ({
            j,
            d: (this.nodes[j].x - a.x) ** 2 + (this.nodes[j].y - a.y) ** 2,
          }))
          .sort((u, v) => u.d - v.d)
          .slice(
            0,
            Math.max(
              1,
              Math.round(
                THREE.MathUtils.randInt(kMin, kMax) * this.config.graphDensity
              )
            )
          )
        nearest.forEach(({ j }) => {
          if (i < j) {
            const dx = this.nodes[i].x - this.nodes[j].x
            const dy = this.nodes[i].y - this.nodes[j].y
            const rest = Math.hypot(dx, dy)
            this.edges.push({ a: i, b: j, rest })
          }
        })
      })
    })

    // A few inter-cluster edges
    const clusters = Array.from(byCluster.keys())
    const crossCount = Math.max(
      1,
      Math.round(
        clusters.length *
          this.config.interClusterFactor *
          this.config.graphDensity
      )
    )
    for (let t = 0; t < crossCount; t++) {
      const ca = clusters[Math.floor(Math.random() * clusters.length)]
      let cb = clusters[Math.floor(Math.random() * clusters.length)]
      if (cb === ca) cb = (cb + 1) % clusters.length
      const ia =
        byCluster.get(ca)[Math.floor(Math.random() * byCluster.get(ca).length)]
      const ib =
        byCluster.get(cb)[Math.floor(Math.random() * byCluster.get(cb).length)]
      const a = Math.min(ia, ib),
        b = Math.max(ia, ib)
      if (
        !this.edges.some(
          (e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)
        )
      ) {
        const dx = this.nodes[a].x - this.nodes[b].x
        const dy = this.nodes[a].y - this.nodes[b].y
        const rest = Math.hypot(dx, dy)
        this.edges.push({ a, b, rest })
      }
    }
  }

  _buildGPU() {
    // Edges as single LineSegments
    const edgePositions = new Float32Array(this.edges.length * 2 * 3)
    for (let i = 0; i < this.edges.length; i++) {
      const { a: aIdx, b: bIdx } = this.edges[i]
      const a = this.nodes[aIdx]
      const b = this.nodes[bIdx]
      edgePositions.set([a.x, a.y, 0], i * 6 + 0)
      edgePositions.set([b.x, b.y, 0], i * 6 + 3)
    }
    const edgeGeom = new THREE.BufferGeometry()
    edgeGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(edgePositions, 3)
    )

    const edgeMat = new THREE.LineBasicMaterial({
      color: this.colors.edge,
      transparent: true,
      opacity: this.config.edgeOpacity,
    })
    this.edgeMesh = new THREE.LineSegments(edgeGeom, edgeMat)
    this.scene.add(this.edgeMesh)

    // Nodes as InstancedMesh of spheres (true circular points)
    const instanceCount = this.nodes.length
    const sphereGeom = new THREE.SphereGeometry(0.5, 12, 12)
    const nodeMat = new THREE.MeshBasicMaterial({
      color: this.colors.node,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    this.nodeMesh = new THREE.InstancedMesh(sphereGeom, nodeMat, instanceCount)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    for (let i = 0; i < instanceCount; i++) {
      const n = this.nodes[i]
      m.compose(
        new THREE.Vector3(n.x, n.y, 0),
        q,
        s.set(n.size, n.size, n.size)
      )
      this.nodeMesh.setMatrixAt(i, m)
    }
    this.nodeMesh.instanceMatrix.needsUpdate = true
    this.scene.add(this.nodeMesh)
  }

  _physicsStep(dt) {
    const { springK, springRest, repulsion, damping, jitter, motionScale } =
      this.config

    // Repulsion (approximate: cluster-local by neighborhood from edges)
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i]
      let fx = (Math.random() - 0.5) * jitter
      let fy = (Math.random() - 0.5) * jitter

      // Apply spring forces along edges
      // Also collect mild repulsion from neighbors in edges
      // Build neighbor list on the fly (sparse)
      // Note: O(E), acceptable for ~1k edges
      for (let e = 0; e < this.edges.length; e++) {
        const ed = this.edges[e]
        const ia = ed.a !== undefined ? ed.a : this.edges[e][0]
        const ib = ed.b !== undefined ? ed.b : this.edges[e][1]
        if (ia !== i && ib !== i) continue
        const j = ia === i ? ib : ia
        const b = this.nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) + 0.0001

        // spring
        const rest = ed.rest !== undefined ? ed.rest : springRest
        const stretch = dist - rest
        const k = springK
        fx += (dx / dist) * (stretch * k) * motionScale
        fy += (dy / dist) * (stretch * k) * motionScale

        // repulsion
        const inv = repulsion / (dist * dist)
        fx -= (dx / dist) * inv * 0.35 * motionScale
        fy -= (dy / dist) * inv * 0.35 * motionScale
      }

      a.vx = (a.vx + fx * dt) * damping
      a.vy = (a.vy + fy * dt) * damping
    }

    // Integrate and keep inside bounds with soft walls
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]
      n.x += n.vx
      n.y += n.vy
      const pad = WALL_PADDING_PX + n.size
      if (n.x < pad) {
        n.x = pad
        n.vx *= -0.5
      }
      if (n.x > this.width - pad) {
        n.x = this.width - pad
        n.vx *= -0.5
      }
      if (n.y > -pad) {
        n.y = -pad
        n.vy *= -0.5
      }
      if (n.y < -this.height + pad) {
        n.y = -this.height + pad
        n.vy *= -0.5
      }
    }
  }

  _syncGPU() {
    // Update node instances (matrix)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]
      m.compose(
        new THREE.Vector3(n.x, n.y, 0),
        q,
        s.set(n.size, n.size, n.size)
      )
      this.nodeMesh.setMatrixAt(i, m)
    }
    this.nodeMesh.instanceMatrix.needsUpdate = true

    // Update edges
    const pos = this.edgeMesh.geometry.getAttribute("position")
    for (let i = 0; i < this.edges.length; i++) {
      const ed = this.edges[i]
      const aIdx = ed.a !== undefined ? ed.a : this.edges[i][0]
      const bIdx = ed.b !== undefined ? ed.b : this.edges[i][1]
      const a = this.nodes[aIdx]
      const b = this.nodes[bIdx]
      pos.setXYZ(i * 2 + 0, a.x, a.y, 0)
      pos.setXYZ(i * 2 + 1, b.x, b.y, 0)
    }
    pos.needsUpdate = true
  }

  _animate(now) {
    const t = (now || performance.now()) * 0.001
    if (!this._last) this._last = t
    const dt = Math.min(0.033, t - this._last)
    this._last = t

    this._physicsStep(dt)
    this._syncGPU()

    this.renderer.render(this.scene, this.camera)
    this._raf = requestAnimationFrame(this._animate)
  }

  _onResize() {
    this._resizeToContainer()
    // Rebuild to keep densities in pixel units
    this.scene.remove(this.nodeMesh)
    this.scene.remove(this.edgeMesh)
    if (this.nodeMesh)
      this.nodeMesh.geometry.dispose(), this.nodeMesh.material.dispose()
    if (this.edgeMesh)
      this.edgeMesh.geometry.dispose(), this.edgeMesh.material.dispose()
    this.nodeMesh = null
    this.edgeMesh = null

    this._generateGraph()
    this._buildGPU()
  }

  dispose() {
    cancelAnimationFrame(this._raf)
    window.removeEventListener("resize", this._onResize)

    if (this.nodeMesh) {
      this.nodeMesh.geometry.dispose()
      this.nodeMesh.material.dispose()
      this.scene.remove(this.nodeMesh)
      this.nodeMesh = null
    }
    if (this.edgeMesh) {
      this.edgeMesh.geometry.dispose()
      this.edgeMesh.material.dispose()
      this.scene.remove(this.edgeMesh)
      this.edgeMesh = null
    }
    this.renderer.dispose()
    if (
      this.renderer.domElement &&
      this.renderer.domElement.parentNode === this.container
    ) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}

// Auto-init in container .hero__visual
;(function init() {
  const container = document.querySelector(".hero__visual")
  if (!container) return

  const vis = new NetworkAnimation(container)
  // Expose for possible manual cleanup
  window.__networkAnimation = vis
})()
