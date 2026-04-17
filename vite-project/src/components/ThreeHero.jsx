import React, { useRef, Suspense } from 'react' // React primitives for refs and handling 3D loading states
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber' // The core 3D engine: Fiber bridges React to Three.js
import { ScrollControls, useScroll } from '@react-three/drei' // Helper library for high-end scroll and UI 3D components
import * as THREE from 'three' // The underlying Three.js engine for material and geometry logic

// THE SCENE COMPONENT: Where the actual 3D planes live and move
function Scene() {
  const scroll = useScroll() // Accessing the scroll data from ScrollControls
  const group = useRef() // Creating a reference to the group of architectural images
  const { viewport } = useThree() // Accessing the current screen dimensions (for responsiveness)
  
  // ASSET LOADER: Pulling the architectural renders into GPU memory
  const [img1, img2, img3, img4] = useLoader(THREE.TextureLoader, [
    '/architect_hero_brutalist_1776428703604.png',
    '/architect_hero_organic_1776428731136.png',
    '/architect_hero_minimalist_1776428750774.png',
    '/architect_hero_brutalist_1776428703604.png'
  ])

  // RESPONSIVE LOGIC: Detecting if the user is on a phone or desktop
  const isMobile = viewport.width < 10 // Checking the Width of the 3D viewport
  const planeWidth = isMobile ? viewport.width * 0.8 : 16 // Scaling planes based on device
  const planeHeight = planeWidth * 0.75 // Maintaining a 4:3 architectural aspect ratio
  const spacing = isMobile ? viewport.width * 1.5 : 20 // Adjusting gap between floating projects

  // THE KINETIC ENGINE: This function runs 60 times per second
  useFrame((state, delta) => {
    const offset = scroll.offset // Value between 0 and 1 representing scroll progress
    
    // HORIZONTAL SLIDE: Lerping (smoothing) the movement of the group based on vertical scroll
    // This creates the iconic "Cargo" side-scrolling experience
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, -offset * spacing * 3, 0.1)
  })

  return (
    <group ref={group}>
      {/* 3D PROJECT 01: The first focal plane */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        {/* meshBasicMaterial: High-performance material that ignores lights */}
        <meshBasicMaterial map={img1} transparent opacity={isMobile ? 0.3 : 1} />
      </mesh>

      {/* 3D PROJECT 02: Offset in space and depth (Z) for a parallax effect */}
      <mesh position={[spacing, 0, -2]}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial map={img2} transparent opacity={isMobile ? 0.3 : 0.8} />
      </mesh>

      {/* 3D PROJECT 03: Pushed further back for atmospheric depth */}
      <mesh position={[spacing * 2, 0, -4]}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial map={img3} transparent opacity={isMobile ? 0.3 : 0.6} />
      </mesh>

      {/* 3D PROJECT 04: The final background plane */}
      <mesh position={[spacing * 3, 0, -6]}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial map={img4} transparent opacity={isMobile ? 0.2 : 0.4} />
      </mesh>
    </group>
  )
}

// THE WRAPPER COMPONENT: Initializes the 3D Canvas
export default function ThreeHero() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {/* Canvas: The "Stage" for all 3D content */}
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <Suspense fallback={null}>
          {/* ScrollControls: Overrides traditional scroll for 3D synchronization */}
          <ScrollControls pages={8} damping={0.2} horizontal={false}>
            <Scene />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  )
}
