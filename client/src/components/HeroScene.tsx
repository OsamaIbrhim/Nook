import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useRef, useState } from 'react'
import * as THREE from 'three'

function Sculpture() {
  const root = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const { pointer } = useThree()

  useFrame((state, delta) => {
    if (!root.current || !core.current) return
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * 0.35, 3, delta)
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -pointer.y * 0.2, 3, delta)
    core.current.rotation.x += delta * 0.12
    core.current.rotation.y += delta * 0.18
    root.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.12
  })

  return <group ref={root} rotation={[0.15, -0.25, -0.12]}>
    <mesh ref={core} scale={1.38}>
      <torusKnotGeometry args={[1.15, 0.38, 180, 24, 2, 3]}/>
      <meshPhysicalMaterial color="#d7ff39" roughness={0.16} metalness={0.18} clearcoat={1} clearcoatRoughness={0.12}/>
    </mesh>
    <mesh rotation={[Math.PI / 2.5, 0.2, 0]} scale={2.15}>
      <torusGeometry args={[1.35, 0.025, 12, 160]}/>
      <meshBasicMaterial color="#f4f1e8" transparent opacity={0.58}/>
    </mesh>
    <mesh rotation={[-0.7, 0.9, 0.25]} scale={2.55}>
      <torusGeometry args={[1.3, 0.012, 8, 160]}/>
      <meshBasicMaterial color="#ff5c35" transparent opacity={0.5}/>
    </mesh>
  </group>
}

function Satellites() {
  const group = useRef<THREE.Group>(null)
  useFrame((state, delta) => {
    if (group.current) group.current.rotation.z += delta * 0.025
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.12
  })
  return <group ref={group}>
    <Float speed={1.6} rotationIntensity={0.7} floatIntensity={0.8} position={[-2.8, 1.7, -1]}>
      <mesh scale={0.48}><icosahedronGeometry args={[1, 2]}/><MeshDistortMaterial color="#ff6238" roughness={0.28} distort={0.32} speed={1.4}/></mesh>
    </Float>
    <Float speed={1.2} rotationIntensity={1} floatIntensity={0.6} position={[2.85, -1.55, 0]}>
      <mesh scale={0.54}><octahedronGeometry args={[1, 0]}/><meshPhysicalMaterial color="#6d63ff" roughness={0.18} metalness={0.35}/></mesh>
    </Float>
    <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.9} position={[2.55, 2, -1.8]}>
      <mesh scale={0.28}><sphereGeometry args={[1, 32, 32]}/><meshPhysicalMaterial color="#f4f1e8" roughness={0.12} metalness={0.1}/></mesh>
    </Float>
  </group>
}

function Stage() {
  return <>
    <color attach="background" args={['#090909']}/>
    <fog attach="fog" args={['#090909', 7, 14]}/>
    <ambientLight intensity={1.15}/>
    <directionalLight position={[4, 5, 5]} intensity={4} color="#ffffff"/>
    <pointLight position={[-4, -2, 3]} intensity={45} color="#ff4d26" distance={10}/>
    <pointLight position={[4, 1, 2]} intensity={35} color="#7569ff" distance={9}/>
    <Sculpture/>
    <Satellites/>
  </>
}

export function HeroScene() {
  const [dpr, setDpr] = useState(1.5)
  return <div className="absolute inset-0" aria-hidden="true">
    <Canvas camera={{ position: [0, 0, 7.4], fov: 38 }} dpr={dpr} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
      <PerformanceMonitor onIncline={() => setDpr(1.75)} onDecline={() => setDpr(1)}/>
      <Suspense fallback={null}><Stage/></Suspense>
    </Canvas>
  </div>
}
