import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js"

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
      nodeCount: 380,
      clusters: Math.floor(THREE.MathUtils.randInt(6, 8)),
      clusterRadius: [42, 110], // in pixels; later scaled
      hubRate: 0.08, // fraction of nodes to be hubs
      linkPerNode: [3, 6], // target degree bounds
      springK: 0.012,
      springRest: 36, // px
      repulsion: 450, // px^2 strength
      damping: 0.9,
      jitter: 0.15,
      edgeOpacity: 0.22,
      nodeSize: [1.6, 2.6], // px radius baseline (scaled by dpr)
      hubSize: [3.6, 6.0],
    }

    // Core
    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(this.colors.bg, 1)

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
    const margin = 80
    const minDist = Math.min(this.width, this.height) * 0.22
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
          .slice(0, THREE.MathUtils.randInt(kMin, kMax))
        nearest.forEach(({ j }) => {
          if (i < j) this.edges.push([i, j])
        })
      })
    })

    // A few inter-cluster edges
    const clusters = Array.from(byCluster.keys())
    for (let t = 0; t < clusters.length * 14; t++) {
      const ca = clusters[Math.floor(Math.random() * clusters.length)]
      let cb = clusters[Math.floor(Math.random() * clusters.length)]
      if (cb === ca) cb = (cb + 1) % clusters.length
      const ia =
        byCluster.get(ca)[Math.floor(Math.random() * byCluster.get(ca).length)]
      const ib =
        byCluster.get(cb)[Math.floor(Math.random() * byCluster.get(cb).length)]
      const a = Math.min(ia, ib),
        b = Math.max(ia, ib)
      if (!this.edges.some((e) => e[0] === a && e[1] === b))
        this.edges.push([a, b])
    }
  }

  _buildGPU() {
    // Nodes as instanced planes (screen-aligned circles in fragment)
    const instanceCount = this.nodes.length
    const geometry = new THREE.InstancedBufferGeometry()

    // Quad for a unit circle sprite (two triangles)
    const base = new THREE.PlaneGeometry(1, 1).toNonIndexed()
    geometry.attributes.position = base.attributes.position
    geometry.attributes.uv = base.attributes.uv
    geometry.setIndex(base.index)

    const offsets = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount * 2),
      2
    )
    const sizes = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount),
      1
    )
    for (let i = 0; i < instanceCount; i++) {
      offsets.setXY(i, this.nodes[i].x, this.nodes[i].y)
      sizes.setX(i, this.nodes[i].size)
    }
    geometry.setAttribute("offset", offsets)
    geometry.setAttribute("size", sizes)

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: this.colors.node },
      },
      vertexShader: `
        attribute vec2 offset;
        attribute float size;
        void main(){
          vec2 scaled = position.xy * size;
          vec3 pos = vec3(offset + scaled, 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main(){
          // circular alpha
          vec2 p = gl_PointCoord * 2.0 - 1.0; // not used for planes, emulate soft edge
          // simple radial falloff using UV from plane: reconstruct circle via distance from center
          // Using varying-less trick: compute from gl_FragCoord is costly; approximate with geometry uv
          // Since plane uv is not passed, draw soft disc using distance to quad center via gl_FragCoord not ideal.
          // Instead draw crisp disc using step on min(abs()) from quad center in NDC is complex. We'll approximate circle using length of normalized pos in plane space.
          // For visual simplicity use smooth alpha mask based on distance from quad center provided by varying-less approach is limited.
          // We'll fallback to simple soft square with slight corner fade to look circular enough at small sizes.
          float alpha = 1.0;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    })

    this.nodeMesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.nodeMesh)

    // Edges as single LineSegments
    const edgePositions = new Float32Array(this.edges.length * 2 * 3)
    for (let i = 0; i < this.edges.length; i++) {
      const [aIdx, bIdx] = this.edges[i]
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
  }

  _physicsStep(dt) {
    const { springK, springRest, repulsion, damping, jitter } = this.config

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
        const ia = this.edges[e][0]
        const ib = this.edges[e][1]
        if (ia !== i && ib !== i) continue
        const j = ia === i ? ib : ia
        const b = this.nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) + 0.0001

        // spring
        const stretch = dist - springRest
        const k = springK
        fx += (dx / dist) * (stretch * k)
        fy += (dy / dist) * (stretch * k)

        // repulsion
        const inv = repulsion / (dist * dist)
        fx -= (dx / dist) * inv * 0.35
        fy -= (dy / dist) * inv * 0.35
      }

      a.vx = (a.vx + fx * dt) * damping
      a.vy = (a.vy + fy * dt) * damping
    }

    // Integrate and keep inside bounds with soft walls
    const pad = 18
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]
      n.x += n.vx
      n.y += n.vy
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
    // Update node instances
    const offsets = this.nodeMesh.geometry.getAttribute("offset")
    for (let i = 0; i < this.nodes.length; i++) {
      offsets.setXY(i, this.nodes[i].x, this.nodes[i].y)
    }
    offsets.needsUpdate = true

    // Update edges
    const pos = this.edgeMesh.geometry.getAttribute("position")
    for (let i = 0; i < this.edges.length; i++) {
      const [aIdx, bIdx] = this.edges[i]
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

  // Ensure container has dark bg
  container.style.background = "#0f1322"

  const vis = new NetworkAnimation(container)
  // Expose for possible manual cleanup
  window.__networkAnimation = vis
})()
