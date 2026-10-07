"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Physics, RigidBody, CuboidCollider, InstancedRigidBodies } from "@react-three/rapier"
import { Environment, Text3D, Center, Float, Sparkles } from "@react-three/drei"
import { Suspense, useMemo, useRef, useState } from "react"
import * as THREE from "three"

// Interactive Physics Objects
function FallingObjects() {
  const count = 30
  
  const positions = useMemo(() => {
    return Array.from({ length: count }, () => [
      (Math.random() - 0.5) * 10,
      Math.random() * 20 + 10,
      (Math.random() - 0.5) * 10
    ])
  }, [])
  
  const rotations = useMemo(() => {
    return Array.from({ length: count }, () => [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ])
  }, [])
  
  const colors = useMemo(() => {
    const palette = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6']
    return Array.from({ length: count }, () => new THREE.Color(palette[Math.floor(Math.random() * palette.length)]))
  }, [])

  return (
    <InstancedRigidBodies
      positions={positions as any}
      rotations={rotations as any}
      colliders="hull"
      restitution={0.7}
      friction={0.2}
    >
      <instancedMesh args={[undefined, undefined, count]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          roughness={0.2} 
          metalness={0.8} 
          envMapIntensity={2}
        />
        <instancedBufferAttribute
          attach="instanceColor"
          args={[new Float32Array(colors.flatMap((c) => c.toArray())), 3]}
        />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}

function Pointer() {
  const ref = useRef<any>(null)
  useFrame(({ mouse, viewport }) => {
    if (ref.current) {
      ref.current.setNextKinematicTranslation({
        x: (mouse.x * viewport.width) / 2,
        y: (mouse.y * viewport.height) / 2,
        z: 0
      })
    }
  })
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[1.5, 1.5, 1.5]} />
    </RigidBody>
  )
}

function FloatingLogo() {
  return (
    <Float
      speed={2} 
      rotationIntensity={0.5} 
      floatIntensity={2}
      position={[0, 1, 0]}
    >
      <Center>
        <Text3D
          font="https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_bold.typeface.json"
          size={1.5}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          CampusOS
          <meshStandardMaterial color="#6366f1" roughness={0.1} metalness={0.8} />
        </Text3D>
      </Center>
    </Float>
  )
}

export function CampusHero() {
  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden glass-card relative group">
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center">
        <p className="text-xl md:text-2xl font-light text-foreground/80 mb-2 drop-shadow-md">
          The Smart Digital Campus Hub for
        </p>
        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 pb-2 drop-shadow-xl">
          City University
        </h2>
      </div>
      
      <Canvas shadows camera={{ position: [0, 0, 12], fov: 45 }} className="w-full h-full bg-background/50">
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#a855f7" />
        
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Physics gravity={[0, -5, 0]}>
            <Pointer />
            <FloatingLogo />
            <FallingObjects />
            
            {/* Invisible walls to keep objects in view */}
            <RigidBody type="fixed" position={[0, -5, 0]}>
              <CuboidCollider args={[20, 1, 20]} />
            </RigidBody>
            <RigidBody type="fixed" position={[-10, 0, 0]}>
              <CuboidCollider args={[1, 20, 20]} />
            </RigidBody>
            <RigidBody type="fixed" position={[10, 0, 0]}>
              <CuboidCollider args={[1, 20, 20]} />
            </RigidBody>
            <RigidBody type="fixed" position={[0, 0, -5]}>
              <CuboidCollider args={[20, 20, 1]} />
            </RigidBody>
            <RigidBody type="fixed" position={[0, 0, 5]}>
              <CuboidCollider args={[20, 20, 1]} />
            </RigidBody>
          </Physics>
          
          <Sparkles count={100} scale={12} size={2} speed={0.4} opacity={0.5} color="#ec4899" />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg backdrop-blur-md">
          Move your mouse to interact with the objects
        </p>
      </div>
    </div>
  )
}
