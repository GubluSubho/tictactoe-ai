import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Board3D() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    let width = mount.clientWidth
    let height = mount.clientHeight

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 7, 11)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.15))

    const keyLight = new THREE.DirectionalLight(0xc8f04a, 3)
    keyLight.position.set(6, 12, 6)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x7ef2c8, 1.5)
    fillLight.position.set(-6, 6, -6)
    scene.add(fillLight)

    const pl1 = new THREE.PointLight(0xc8f04a, 3, 20)
    pl1.position.set(-4, 4, 4)
    scene.add(pl1)

    const pl2 = new THREE.PointLight(0x7ef2c8, 3, 20)
    pl2.position.set(4, 4, -4)
    scene.add(pl2)

    // Board base
    const boardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.12, 7.8),
      new THREE.MeshStandardMaterial({ color: 0x080d1a, metalness: 0.95, roughness: 0.05 })
    )
    boardMesh.position.y = -0.15
    boardMesh.receiveShadow = true
    scene.add(boardMesh)

    // Grid lines
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xc8f04a,
      emissive: 0xc8f04a,
      emissiveIntensity: 1.2,
      metalness: 0.4,
      roughness: 0.1,
    })

    const bar = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lineMat)
      m.position.set(x, y, z)
      m.castShadow = true
      scene.add(m)
      return m
    }

    bar(0.06, 0.28, 7.5, -1.25, 0.05, 0)
    bar(0.06, 0.28, 7.5,  1.25, 0.05, 0)
    bar(7.5, 0.28, 0.06, 0, 0.05, -1.25)
    bar(7.5, 0.28, 0.06, 0, 0.05,  1.25)

    // Materials
    const xMat = new THREE.MeshStandardMaterial({
      color: 0xc8f04a,
      emissive: 0xc8f04a,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.15,
    })
    const oMat = new THREE.MeshStandardMaterial({
      color: 0x7ef2c8,
      emissive: 0x7ef2c8,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.15,
    })

    const pieces = []

    // Cell positions: [x, z]
    // Row 0 = top (z=-2.5), Row 1 = mid (z=0), Row 2 = bot (z=2.5)
    // Col 0 = left (x=-2.5), Col 1 = mid (x=0), Col 2 = right (x=2.5)
    const cellPos = [
      [-2.5, -2.5], [0, -2.5], [2.5, -2.5],  // row 0
      [-2.5,  0  ], [0,  0  ], [2.5,  0  ],  // row 1
      [-2.5,  2.5], [0,  2.5], [2.5,  2.5],  // row 2
    ]

    // X wins diagonally top-left(0) → center(4) → bottom-right(8)
    const layout = ['X', 'O', 'O', 'O', 'X', '', 'O', '', 'X']

    const makeX = (cx, cz, delay) => {
      const group = new THREE.Group()
      const geo = new THREE.BoxGeometry(1.25, 0.2, 0.22)
      const b1 = new THREE.Mesh(geo, xMat)
      b1.rotation.y = Math.PI / 4
      b1.castShadow = true
      const b2 = new THREE.Mesh(geo, xMat)
      b2.rotation.y = -Math.PI / 4
      b2.castShadow = true
      group.add(b1, b2)
      group.position.set(cx, 8, cz)
      group.userData = { targetY: 0.18, delay, landed: false }
      scene.add(group)
      pieces.push(group)
    }

    const makeO = (cx, cz, delay) => {
      const geo = new THREE.TorusGeometry(0.46, 0.11, 32, 80)
      const mesh = new THREE.Mesh(geo, oMat)
      mesh.rotation.x = Math.PI / 2
      mesh.castShadow = true
      const group = new THREE.Group()
      group.add(mesh)
      group.position.set(cx, 8, cz)
      group.userData = { targetY: 0.18, delay, landed: false }
      scene.add(group)
      pieces.push(group)
    }

    layout.forEach((val, i) => {
      if (val === 'X') makeX(cellPos[i][0], cellPos[i][1], i * 140)
      if (val === 'O') makeO(cellPos[i][0], cellPos[i][1], i * 140)
    })

    // Winning diagonal line — top-left(-2.5,-2.5) to bottom-right(2.5,2.5)
    // Length = sqrt(5^2 + 5^2) = 7.07
    // Rotation -PI/4 goes from top-left to bottom-right when viewed from above
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xc8f04a,
      emissive: 0xc8f04a,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0,
    })
    const winLine = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.07, 0.12),
      winMat
    )
    winLine.position.set(0, 0.3, 0)
    winLine.rotation.y = -Math.PI / 4
    winLine.scale.x = 0
    scene.add(winLine)

    // Particles
    const pCount = 80
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3]     = (Math.random() - 0.5) * 16
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMesh = new THREE.Points(pGeo,
      new THREE.PointsMaterial({ color: 0xc8f04a, size: 0.05, transparent: true, opacity: 0.4 })
    )
    scene.add(pMesh)

    // Mouse
    let mouseX = 0, mouseY = 0
    let smoothX = 0, smoothY = 0

    const onMouseMove = (e) => {
      const rect = mount.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    mount.addEventListener('mousemove', onMouseMove)

    // Scroll
    let scrollY = 0
    const onScroll = () => { scrollY = window.scrollY }
    window.addEventListener('scroll', onScroll)

    const startTime = Date.now()
    let frame
    let winShown = false

    const easeOutBounce = (t) => {
      const n1 = 7.5625, d1 = 2.75
      if (t < 1 / d1) return n1 * t * t
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
      else return n1 * (t -= 2.625 / d1) * t + 0.984375
    }

    const easeOutBack = (t) => {
      const c1 = 1.70158, c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    const animate = () => {
      frame = requestAnimationFrame(animate)
      const elapsed = Date.now() - startTime
      const t = elapsed * 0.001

      // Fast smooth mouse — no jitter
      smoothX += (mouseX - smoothX) * 0.12
      smoothY += (mouseY - smoothY) * 0.12

      scene.rotation.y = smoothX * 0.5 + t * 0.06
      scene.rotation.x = -smoothY * 0.18 + Math.sin(t * 0.25) * 0.04
      scene.position.y = Math.sin(t * 0.35) * 0.15 - scrollY * 0.002

      // Bounce drop-in
      pieces.forEach((piece) => {
        const d = piece.userData.delay
        const raw = Math.max(0, Math.min(1, (elapsed - d) / 700))
        const eased = easeOutBounce(raw)
        if (raw < 1) {
          piece.position.y = 8 - (8 - piece.userData.targetY) * eased
          piece.scale.setScalar(0.3 + eased * 0.7)
        } else {
          piece.position.y = piece.userData.targetY + Math.sin(t * 0.9 + d * 0.01) * 0.07
          piece.scale.setScalar(1)
        }
      })

      // Win line after all pieces land
      const lastDelay = layout.filter(v => v !== '').length * 140 + 700
      if (elapsed > lastDelay && !winShown) winShown = true
      if (winShown) {
        const p = Math.min(1, (elapsed - lastDelay) / 600)
        winLine.scale.x = easeOutBack(p)
        winMat.opacity = Math.min(0.9, p * 2)
      }

      pMesh.rotation.y = t * 0.025
      pMesh.rotation.x = Math.sin(t * 0.1) * 0.05

      pl1.intensity = 3 + Math.sin(t * 1.8) * 0.8
      pl2.intensity = 3 + Math.sin(t * 1.8 + Math.PI) * 0.8

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      mount.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '480px',
        cursor: 'grab',
        borderRadius: '24px',
        overflow: 'hidden',
      }}
    />
  )
}