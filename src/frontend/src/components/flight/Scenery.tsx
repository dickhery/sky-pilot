import { MeshReflectorMaterial } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Seeded pseudo-random for deterministic scatter placement. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeGrassTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(c);
  }
  ctx.fillStyle = "#4a6740";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const h = 88 + Math.random() * 28;
    const s = 28 + Math.random() * 28;
    const l = 24 + Math.random() * 20;
    ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
    ctx.fillRect(
      Math.random() * 256,
      Math.random() * 256,
      2 + Math.random() * 2,
      2,
    );
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function isRunwayCorridor(x: number, z: number): boolean {
  const dep = Math.abs(x) < 16 && z > -100 && z < 100;
  const land = Math.abs(x - 22) < 16 && z < -270 && z > -450;
  return dep || land;
}

function isLake(x: number, z: number): boolean {
  const dx = x + 68;
  const dz = z - 8;
  return dx * dx + dz * dz < 40 * 40;
}

/**
 * Rolling countryside with vertex-colored fields, dirt around the runways,
 * and a flattened lake basin. Smooth-shaded — no flat faceting.
 */
export function Terrain() {
  const { geometry, texture } = useMemo(() => {
    const size = 1400;
    const segments = 96;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const rand = seededRandom(42);
    const fieldRand = seededRandom(99);
    const color = new THREE.Color();

    const patches: {
      x: number;
      z: number;
      r: number;
      hue: number;
      lit: number;
    }[] = [];
    for (let i = 0; i < 28; i++) {
      patches.push({
        x: (fieldRand() - 0.5) * 700,
        z: fieldRand() * -500 + 40,
        r: 18 + fieldRand() * 36,
        hue: 0.18 + fieldRand() * 0.12,
        lit: 0.28 + fieldRand() * 0.14,
      });
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Mesh is rotated -90° about X and placed at z = -160, so local Y
      // becomes world −Z.
      const worldX = x;
      const worldZ = -y - 160;

      const hill =
        Math.sin(worldX * 0.008 + worldZ * 0.006) * 7 +
        Math.sin(worldX * 0.018 - worldZ * 0.012) * 3.4 +
        Math.cos(worldZ * 0.014 + worldX * 0.01) * 4.2 +
        Math.sin(worldX * 0.035) * 1.4;

      const distDep = Math.min(Math.abs(worldX), Math.abs(worldX - 22) * 0.75);
      const t = THREE.MathUtils.clamp(distDep / 40, 0, 1);
      const flatten = t * t * (3 - 2 * t);

      let height = hill * flatten * (0.45 + rand() * 0.12);

      const dxL = worldX + 68;
      const dzL = worldZ - 8;
      const lakeD = Math.hypot(dxL, dzL);
      if (lakeD < 44) {
        const basin = 1 - THREE.MathUtils.smoothstep(32, 44, lakeD);
        height = THREE.MathUtils.lerp(height, -0.35, basin);
      }

      if (isRunwayCorridor(worldX, worldZ)) {
        height *= 0.05;
      }

      // Displace along the plane normal (local Z). After the mesh is
      // rotated flat, that becomes world-up so hills actually have height.
      pos.setZ(i, height);

      let h = 0.28;
      let s = 0.38;
      let l = 0.32;
      for (const p of patches) {
        const d = Math.hypot(worldX - p.x, worldZ - p.z);
        if (d < p.r) {
          const w = 1 - d / p.r;
          h = THREE.MathUtils.lerp(h, p.hue, w);
          s = THREE.MathUtils.lerp(s, 0.42, w);
          l = THREE.MathUtils.lerp(l, p.lit, w);
        }
      }
      if (height < 0.4) {
        l *= 0.92;
      } else {
        l += 0.04;
      }
      if (isRunwayCorridor(worldX, worldZ)) {
        h = 0.08;
        s = 0.12;
        l = 0.28;
      }
      if (lakeD < 46) {
        h = 0.12;
        s = 0.22;
        l = 0.38;
      }
      color.setHSL(h, s, l);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geometry: geo, texture: makeGrassTexture() };
  }, []);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.35, -160]}
      receiveShadow
    >
      <meshStandardMaterial
        map={texture}
        vertexColors
        roughness={0.92}
        metalness={0}
      />
    </mesh>
  );
}

/** Instanced pines and a few rounded deciduous trees. */
export function TreeField() {
  const pines = useMemo(() => {
    const rand = seededRandom(77);
    const arr: { x: number; z: number; scale: number; rot: number }[] = [];
    for (let i = 0; i < 160; i++) {
      const x = (rand() - 0.5) * 620;
      const z = rand() * -520 + 90;
      if (isRunwayCorridor(x, z)) continue;
      if (isLake(x, z)) continue;
      if (Math.abs(x) < 28 && z > -20 && z < 90) continue;
      arr.push({
        x,
        z,
        scale: 0.75 + rand() * 1.35,
        rot: rand() * Math.PI,
      });
    }
    return arr;
  }, []);

  const deciduous = useMemo(() => {
    const rand = seededRandom(131);
    const arr: { x: number; z: number; scale: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const x = (rand() - 0.5) * 500;
      const z = rand() * -360 + 40;
      if (isRunwayCorridor(x, z)) continue;
      if (isLake(x, z)) continue;
      arr.push({ x, z, scale: 0.8 + rand() * 1.1 });
    }
    return arr;
  }, []);

  const pineFoliage = useMemo(() => {
    const geo = new THREE.ConeGeometry(1.05, 2.6, 8);
    geo.translate(0, 2.05, 0);
    return geo;
  }, []);
  const pineFoliageMid = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.82, 1.9, 8);
    geo.translate(0, 2.85, 0);
    return geo;
  }, []);
  const pineTrunk = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.11, 0.16, 1.1, 6);
    geo.translate(0, 0.55, 0);
    return geo;
  }, []);
  const leafGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.15, 8, 6);
    geo.scale(1, 0.75, 1);
    geo.translate(0, 1.55, 0);
    return geo;
  }, []);
  const trunkDecid = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.1, 0.14, 1.3, 6);
    geo.translate(0, 0.65, 0);
    return geo;
  }, []);

  const decidItems = useMemo(
    () => deciduous.map((d) => ({ ...d, rot: 0 })),
    [deciduous],
  );

  return (
    <group>
      <PlacedInstances
        geometry={pineTrunk}
        items={pines}
        color="#4a3426"
        castShadow
      />
      <PlacedInstances
        geometry={pineFoliage}
        items={pines}
        color="#2d4a2c"
        castShadow
      />
      <PlacedInstances
        geometry={pineFoliageMid}
        items={pines}
        color="#3a5c36"
        castShadow
      />
      <PlacedInstances
        geometry={trunkDecid}
        items={decidItems}
        color="#5a4030"
      />
      <PlacedInstances
        geometry={leafGeo}
        items={decidItems}
        color="#4f7a3e"
        castShadow
      />
    </group>
  );
}

function PlacedInstances({
  geometry,
  items,
  color,
  castShadow = false,
}: {
  geometry: THREE.BufferGeometry;
  items: { x: number; z: number; scale: number; rot: number }[];
  color: string;
  castShadow?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, items.length]}
      castShadow={castShadow}
    >
      <meshStandardMaterial color={color} roughness={0.9} />
    </instancedMesh>
  );
}

/**
 * Distant ridgeline — a displaced strip so the horizon reads as mountains
 * instead of four-sided cones.
 */
export function DistantMountains() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1100, 280, 70, 18);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const nx = x / 550;
      const ridge =
        (Math.cos(nx * Math.PI * 1.6) * 0.5 + 0.5) * 78 +
        Math.sin(nx * 9.2) * 18 +
        Math.sin(nx * 17) * 8;
      const falloff = THREE.MathUtils.smoothstep(-140, 40, y);
      const h = ridge * falloff;
      pos.setZ(i, h);
      const snow = h > 58 ? THREE.MathUtils.clamp((h - 58) / 22, 0, 1) : 0;
      color.setRGB(
        THREE.MathUtils.lerp(0.38, 0.9, snow),
        THREE.MathUtils.lerp(0.42, 0.92, snow),
        THREE.MathUtils.lerp(0.46, 0.94, snow),
      );
      if (h < 22) {
        color.setRGB(0.32, 0.4, 0.34);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} position={[20, -4, -520]} rotation={[0, 0, 0]}>
      <meshStandardMaterial
        vertexColors
        roughness={0.95}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Reflective lake beside the departure airfield. */
export function WaterBody() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-68, 0.04, 8]}>
      <circleGeometry args={[36, 48]} />
      <MeshReflectorMaterial
        blur={[200, 80]}
        resolution={256}
        mixBlur={0.85}
        mixStrength={0.55}
        roughness={0.35}
        metalness={0.45}
        color="#1a4e66"
        mirror={0.25}
        depthScale={0.4}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.2}
      />
    </mesh>
  );
}

/** Hangars with barrel roofs, a control tower, and a windsock. */
export function AirportBuildings() {
  return (
    <group position={[26, 0, 62]}>
      <ControlTower />
      <Hangar position={[-16, 0, 6]} width={16} depth={10} height={5.2} />
      <Hangar position={[12, 0, 10]} width={11} depth={8} height={4.2} />
      <Windsock position={[-2, 0, -8]} />
      {/* Apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2, 0.03, 8]}>
        <planeGeometry args={[42, 22]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.88} />
      </mesh>
    </group>
  );
}

function ControlTower() {
  return (
    <group>
      <mesh position={[0, 3.4, 0]} castShadow>
        <boxGeometry args={[3.2, 6.8, 3.2]} />
        <meshStandardMaterial
          color="#c5cdd6"
          roughness={0.55}
          metalness={0.08}
        />
      </mesh>
      {/* Windows up the shaft */}
      {[1.4, 2.8, 4.2].map((y) => (
        <mesh key={`tw-${y}`} position={[0, y, 1.62]}>
          <boxGeometry args={[2.2, 0.55, 0.06]} />
          <meshStandardMaterial
            color="#6a8aa0"
            metalness={0.5}
            roughness={0.2}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
      <mesh position={[0, 7.15, 0]}>
        <boxGeometry args={[4.4, 0.28, 4.4]} />
        <meshStandardMaterial
          color="#4a5562"
          metalness={0.25}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 8.05, 0]}>
        <boxGeometry args={[3.8, 1.5, 3.8]} />
        <meshStandardMaterial
          color="#7eb0c8"
          metalness={0.55}
          roughness={0.12}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh position={[0, 8.9, 0]}>
        <boxGeometry args={[4.0, 0.18, 4.0]} />
        <meshStandardMaterial color="#3a4450" />
      </mesh>
      <mesh position={[0, 10.1, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#889098" metalness={0.5} />
      </mesh>
      <mesh position={[0, 11.25, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#e24a3a" />
      </mesh>
    </group>
  );
}

function Hangar({
  position,
  width,
  depth,
  height,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.38, 0]} castShadow>
        <boxGeometry args={[width, height * 0.76, depth]} />
        <meshStandardMaterial
          color="#8b949e"
          roughness={0.68}
          metalness={0.12}
        />
      </mesh>
      {/* Barrel roof */}
      <mesh
        position={[0, height * 0.74, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry
          args={[
            depth * 0.52,
            depth * 0.52,
            width + 0.3,
            18,
            1,
            false,
            0,
            Math.PI,
          ]}
        />
        <meshStandardMaterial
          color="#6d757e"
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>
      {/* Door recess */}
      <mesh position={[0, height * 0.32, depth * 0.51]}>
        <boxGeometry args={[width * 0.72, height * 0.62, 0.08]} />
        <meshStandardMaterial color="#3d444c" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Windsock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 4.4, 6]} />
        <meshStandardMaterial color="#c8c8c8" metalness={0.4} />
      </mesh>
      <mesh position={[0.45, 4.15, 0]} rotation={[0, 0, -0.35]}>
        <coneGeometry args={[0.22, 1.1, 8]} />
        <meshStandardMaterial color="#e24a3a" roughness={0.55} />
      </mesh>
    </group>
  );
}
