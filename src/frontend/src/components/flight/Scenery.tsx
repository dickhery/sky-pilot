import { useMemo } from "react";
import * as THREE from "three";

/** Seeded pseudo-random for deterministic scatter placement. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Rolling terrain with gentle hills. The flight corridor stays relatively
 * flat; hills rise away from the runways for visual depth only.
 */
export function Terrain() {
  const geometry = useMemo(() => {
    const size = 1200;
    const segments = 64;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = geo.attributes.position;
    const rand = seededRandom(42);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distFromRunway = Math.min(Math.abs(x), Math.abs(x - 20) * 0.7);
      const hill =
        Math.sin(x * 0.012 + z * 0.008) * 4 +
        Math.sin(x * 0.025 - z * 0.015) * 2.5 +
        Math.cos(z * 0.018) * 3;
      const t = THREE.MathUtils.clamp(distFromRunway / 35, 0, 1);
      const flatten = t * t * (3 - 2 * t);
      const height = hill * flatten * (0.4 + rand() * 0.15);
      pos.setY(i, height);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, -150]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#3d5c3a"
        roughness={0.95}
        metalness={0}
        flatShading
      />
    </mesh>
  );
}

/** Scatter low-poly pine trees around the airfield. */
export function TreeField() {
  const trees = useMemo(() => {
    const rand = seededRandom(77);
    const arr: { x: number; z: number; scale: number; hue: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const x = (rand() - 0.5) * 500;
      const z = rand() * -400 + 80;
      if (Math.abs(x) < 18 && z > -80 && z < 60) continue;
      if (Math.abs(x - 20) < 18 && z < -220 && z > -380) continue;
      arr.push({
        x,
        z,
        scale: 0.7 + rand() * 1.1,
        hue: 0.28 + rand() * 0.08,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {trees.map((t) => (
        <group
          key={`tree-${t.x.toFixed(1)}-${t.z.toFixed(1)}`}
          position={[t.x, 0, t.z]}
          scale={t.scale}
        >
          <mesh position={[0, 1.2, 0]} castShadow>
            <coneGeometry args={[0.9, 2.4, 6]} />
            <meshStandardMaterial
              color={`hsl(${t.hue * 360}, 45%, 28%)`}
              roughness={0.9}
            />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.7, 6]} />
            <meshStandardMaterial color="#4a3528" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Distant mountain silhouettes on the horizon. */
export function DistantMountains() {
  const peaks = useMemo(
    () => [
      { x: -180, z: -320, w: 120, h: 55 },
      { x: -60, z: -380, w: 90, h: 40 },
      { x: 80, z: -350, w: 140, h: 65 },
      { x: 200, z: -300, w: 100, h: 48 },
      { x: -120, z: -200, w: 70, h: 30 },
      { x: 150, z: -220, w: 80, h: 35 },
    ],
    [],
  );

  return (
    <group>
      {peaks.map((p) => (
        <mesh key={`peak-${p.x}-${p.z}`} position={[p.x, p.h / 2 - 2, p.z]}>
          <coneGeometry args={[p.w / 2, p.h, 4]} />
          <meshStandardMaterial
            color="#5a6a78"
            roughness={1}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Small lake beside the departure airfield. */
export function WaterBody() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-55, 0.15, 10]}>
      <circleGeometry args={[28, 32]} />
      <meshStandardMaterial
        color="#2a6a8a"
        metalness={0.6}
        roughness={0.15}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

/** Hangars and tower near the departure runway. */
export function AirportBuildings() {
  return (
    <group position={[22, 0, 55]}>
      {/* Control tower */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[3, 9, 3]} />
        <meshStandardMaterial color="#c8d0d8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 9.2, 0]}>
        <boxGeometry args={[4, 1.5, 4]} />
        <meshStandardMaterial color="#3a4a5a" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Glass cab */}
      <mesh position={[0, 10, 0]}>
        <boxGeometry args={[3.2, 1.2, 3.2]} />
        <meshStandardMaterial
          color="#6a9ab8"
          transparent
          opacity={0.6}
          metalness={0.5}
        />
      </mesh>

      {/* Hangar 1 */}
      <mesh position={[-12, 2.5, 5]} castShadow>
        <boxGeometry args={[14, 5, 8]} />
        <meshStandardMaterial color="#8a949e" roughness={0.7} />
      </mesh>
      <mesh position={[-12, 5.3, 5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[14.2, 0.4, 8.2]} />
        <meshStandardMaterial color="#6a7078" />
      </mesh>

      {/* Hangar 2 */}
      <mesh position={[10, 2, 8]} castShadow>
        <boxGeometry args={[10, 4, 6]} />
        <meshStandardMaterial color="#9aa0a8" roughness={0.65} />
      </mesh>
    </group>
  );
}

/** Farm fields with crop-color patches for visual variety. */
export function Fields() {
  const patches = useMemo(() => {
    const rand = seededRandom(99);
    const arr: { x: number; z: number; w: number; h: number; color: string }[] =
      [];
    const colors = ["#5a7048", "#6b8050", "#4a6240", "#7a9060"];
    for (let i = 0; i < 24; i++) {
      arr.push({
        x: (rand() - 0.5) * 400,
        z: rand() * -350 + 20,
        w: 20 + rand() * 40,
        h: 20 + rand() * 40,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }
    return arr;
  }, []);

  return (
    <group position={[0, 0.08, 0]}>
      {patches.map((p) => (
        <mesh
          key={`field-${p.x.toFixed(0)}-${p.z.toFixed(0)}`}
          rotation={[-Math.PI / 2, 0, randAngle(p.x, p.z)]}
          position={[p.x, 0, p.z]}
        >
          <planeGeometry args={[p.w, p.h]} />
          <meshStandardMaterial color={p.color} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function randAngle(x: number, z: number): number {
  return (((Math.abs(x) + Math.abs(z)) * 47) % 360) * (Math.PI / 180);
}
