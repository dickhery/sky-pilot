import type { MapTheme, SceneLayout } from "@/components/flight/mapLayouts";
import { airfieldClearance, apronBeside } from "@/components/flight/mapLayouts";
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

function isRunwayCorridor(layout: SceneLayout, x: number, z: number): boolean {
  return airfieldClearance(layout, x, z) > 0.28;
}

function waterScore(theme: MapTheme, x: number, z: number): number {
  if (theme === "coast") {
    return x < -80 ? THREE.MathUtils.smoothstep(-40, -160, -x) : 0;
  }
  if (theme === "harbor") {
    const d = Math.hypot(x - 480, z + 40);
    return THREE.MathUtils.smoothstep(220, 80, d);
  }
  if (theme === "storm") {
    const d = Math.hypot(x - 480, z - 80);
    return THREE.MathUtils.smoothstep(380, 140, d);
  }
  if (theme === "valley") {
    return Math.abs(x + 20) < 28 ? 0.7 : 0;
  }
  if (theme === "city") {
    const d = Math.hypot(x + 40, z - 200);
    return THREE.MathUtils.smoothstep(90, 40, d);
  }
  return 0;
}

/**
 * Rolling countryside with vertex-colored fields, dirt around the runways,
 * and a flattened lake basin. Smooth-shaded — no flat faceting.
 */
export function Terrain({ layout }: { layout: SceneLayout }) {
  const { geometry, texture } = useMemo(() => {
    const size = 4000;
    const segments = 128;
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
        x: (fieldRand() - 0.5) * 1600,
        z: fieldRand() * -2100 + 80,
        r: 18 + fieldRand() * 36,
        hue: 0.18 + fieldRand() * 0.12,
        lit: 0.28 + fieldRand() * 0.14,
      });
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Mesh is rotated -90° about X and placed at z = -900, so local Y
      // becomes world −Z.
      const worldX = x;
      const worldZ = -y - 900;

      const theme = layout.theme;
      const hillAmp =
        theme === "ridge"
          ? 16
          : theme === "valley"
            ? 14
            : theme === "city"
              ? 3
              : 7;
      const hill =
        Math.sin(worldX * 0.008 + worldZ * 0.006) * hillAmp +
        Math.sin(worldX * 0.018 - worldZ * 0.012) * hillAmp * 0.45 +
        Math.cos(worldZ * 0.014 + worldX * 0.01) * hillAmp * 0.55 +
        Math.sin(worldX * 0.035) * hillAmp * 0.18;
      const valleyWall =
        theme === "valley" ? Math.max(0, Math.abs(worldX - 80) - 140) * 0.1 : 0;

      let height = (hill * 0.35 + valleyWall) * (0.5 + rand() * 0.12);
      const wet = waterScore(theme, worldX, worldZ);
      if (wet > 0.15) {
        height = THREE.MathUtils.lerp(height, -0.4, wet);
      }

      const grade = airfieldClearance(layout, worldX, worldZ);
      if (grade > 0) {
        height = THREE.MathUtils.lerp(height, 0, grade);
      }

      // Displace along the plane normal (local Z). After the mesh is
      // rotated flat, that becomes world-up so hills actually have height.
      pos.setZ(i, height);

      let h = theme === "ridge" ? 0.08 : theme === "city" ? 0.1 : 0.28;
      let s = theme === "ridge" ? 0.18 : theme === "city" ? 0.08 : 0.38;
      let l = theme === "city" ? 0.38 : 0.32;
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
      if (isRunwayCorridor(layout, worldX, worldZ)) {
        h = 0.08;
        s = 0.12;
        l = 0.28;
      }
      if (wet > 0.2) {
        h = 0.55;
        s = 0.18;
        l = 0.42;
      }
      color.setHSL(h, s, l);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geometry: geo, texture: makeGrassTexture() };
  }, [layout]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.35, -900]}
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
export function TreeField({ layout }: { layout: SceneLayout }) {
  const count = layout.theme === "city" || layout.theme === "storm" ? 50 : 200;
  const pines = useMemo(() => {
    const rand = seededRandom(77 + layout.planId * 13);
    const arr: { x: number; z: number; scale: number; rot: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 1400;
      const z = (rand() - 0.35) * 2200;
      if (isRunwayCorridor(layout, x, z)) continue;
      if (waterScore(layout.theme, x, z) > 0.35) continue;
      arr.push({
        x,
        z,
        scale: 0.75 + rand() * 1.35,
        rot: rand() * Math.PI,
      });
    }
    return arr;
  }, [layout, count]);

  const deciduous = useMemo(() => {
    const rand = seededRandom(131 + layout.planId * 9);
    const arr: { x: number; z: number; scale: number }[] = [];
    const n = layout.theme === "city" ? 8 : 50;
    for (let i = 0; i < n; i++) {
      const x = (rand() - 0.5) * 1100;
      const z = (rand() - 0.35) * 1800;
      if (isRunwayCorridor(layout, x, z)) continue;
      if (waterScore(layout.theme, x, z) > 0.35) continue;
      arr.push({ x, z, scale: 0.8 + rand() * 1.1 });
    }
    return arr;
  }, [layout]);

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
 * Horizon ridgeline that sits on the ground. The previous vertical plane
 * left a flat grey face (a giant wall) because unused vertices stayed in
 * the XY plane. This strip is horizontal; height only goes up.
 */
export function DistantMountains({ theme }: { theme: MapTheme }) {
  const geometry = useMemo(() => {
    const width = 2600;
    const depth = 420;
    const geo = new THREE.PlaneGeometry(width, depth, 88, 20);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();
    const halfW = width * 0.5;
    const halfD = depth * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const nx = x / halfW;
      const along = THREE.MathUtils.clamp((y + halfD) / depth, 0, 1);
      const ridge =
        (Math.cos(nx * Math.PI * 1.5) * 0.5 + 0.5) * 86 +
        Math.sin(nx * 8.4) * 20 +
        Math.sin(nx * 16) * 8;
      const side =
        THREE.MathUtils.smoothstep(-1, -0.72, nx) *
        THREE.MathUtils.smoothstep(1, 0.72, -nx);
      const profile = Math.sin(along * Math.PI);
      const h = Math.max(0, ridge * profile * side);
      pos.setZ(i, h);
      const snow = h > 62 ? THREE.MathUtils.clamp((h - 62) / 20, 0, 1) : 0;
      if (h < 10) {
        color.setRGB(0.28, 0.38, 0.26);
      } else {
        color.setRGB(
          THREE.MathUtils.lerp(0.34, 0.88, snow),
          THREE.MathUtils.lerp(0.4, 0.9, snow),
          THREE.MathUtils.lerp(0.32, 0.92, snow),
        );
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const position: [number, number, number] =
    theme === "ridge"
      ? [180, -0.4, -2140]
      : theme === "city"
        ? [-120, -0.4, 980]
        : [40, -0.4, -2320];

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** Reflective lake beside the departure airfield. */
export function WaterBody({ theme }: { theme: MapTheme }) {
  const patches =
    theme === "coast"
      ? [{ x: -220, z: -400, r: 280 }]
      : theme === "harbor"
        ? [{ x: 480, z: -40, r: 200 }]
        : theme === "storm"
          ? [
              { x: 480, z: 80, r: 320 },
              { x: 200, z: 260, r: 90 },
            ]
          : theme === "valley"
            ? [{ x: -20, z: -500, r: 22 }]
            : theme === "city"
              ? [{ x: -40, z: 200, r: 55 }]
              : [{ x: -80, z: 10, r: 40 }];

  return (
    <group>
      {patches.map((p) => (
        <mesh
          key={`${p.x}-${p.z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.x, 0.04, p.z]}
        >
          <circleGeometry args={[p.r, 40]} />
          <MeshReflectorMaterial
            blur={[200, 80]}
            resolution={192}
            mixBlur={0.85}
            mixStrength={0.55}
            roughness={0.35}
            metalness={0.45}
            color={theme === "storm" ? "#1a3348" : "#1a4e66"}
            mirror={0.25}
            depthScale={0.4}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Hangars with barrel roofs, a control tower, and a windsock. */
export function AirportBuildings({
  layout,
  night = false,
}: {
  layout: SceneLayout;
  night?: boolean;
}) {
  const apron = apronBeside(layout.departureStart, layout.departureEnd, 48);
  return (
    <group position={[apron.x, 0, apron.z]} rotation={[0, apron.heading, 0]}>
      <ControlTower />
      <Hangar position={[-16, 0, 6]} width={16} depth={10} height={5.2} />
      <Hangar position={[12, 0, 10]} width={11} depth={8} height={4.2} />
      <Windsock position={[-2, 0, -8]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2, 0.03, 8]}>
        <planeGeometry args={[42, 22]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.88} />
      </mesh>
      {night && <ApronLights />}
    </group>
  );
}

/** Compact destination field next to the landing runway. */
export function DestinationAirport({
  layout,
  night = false,
}: {
  layout: SceneLayout;
  night?: boolean;
}) {
  const apron = apronBeside(layout.landingThreshold, layout.landingEnd, 42);
  return (
    <group position={[apron.x, 0, apron.z]} rotation={[0, apron.heading, 0]}>
      <Hangar position={[0, 0, 8]} width={12} depth={8} height={4} />
      <mesh position={[8, 3.2, -4]} castShadow>
        <boxGeometry args={[2.4, 6.4, 2.4]} />
        <meshStandardMaterial color="#c5cdd6" roughness={0.55} />
      </mesh>
      <mesh position={[8, 6.7, -4]}>
        <boxGeometry args={[3.2, 1.1, 3.2]} />
        <meshStandardMaterial
          color="#7eb0c8"
          metalness={0.5}
          roughness={0.15}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4, 0.03, 4]}>
        <planeGeometry args={[28, 18]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.88} />
      </mesh>
      {night && <ApronLights />}
    </group>
  );
}

function ApronLights() {
  return (
    <group>
      <pointLight
        position={[0, 6, 4]}
        color="#ffd9a0"
        intensity={2.2}
        distance={40}
      />
      <mesh position={[-8, 3.2, 10]}>
        <boxGeometry args={[0.2, 6.4, 0.2]} />
        <meshStandardMaterial color="#4a5058" />
      </mesh>
      <mesh position={[-8, 6.5, 10]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color="#ffd080" />
      </mesh>
      <mesh position={[8, 3.2, 10]}>
        <boxGeometry args={[0.2, 6.4, 0.2]} />
        <meshStandardMaterial color="#4a5058" />
      </mesh>
      <mesh position={[8, 6.5, 10]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color="#ffd080" />
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
            color="#9fd4f0"
            emissive="#7ec8e8"
            emissiveIntensity={0.7}
            metalness={0.4}
            roughness={0.2}
            transparent
            opacity={0.85}
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

/** Theme-specific props: lighthouse, tower, buoy, downtown blocks. */
export function MapLandmarks({
  layout,
  night,
}: {
  layout: SceneLayout;
  night: boolean;
}) {
  const wp = layout.checkpoints[1]?.position;
  if (!wp) return null;

  if (layout.theme === "coast") {
    return (
      <group position={[wp.x, 0, wp.z]}>
        <mesh position={[0, 8, 0]}>
          <cylinderGeometry args={[1.4, 1.8, 16, 10]} />
          <meshStandardMaterial color="#f2eee6" roughness={0.7} />
        </mesh>
        <mesh position={[0, 16.4, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 1.2, 10]} />
          <meshStandardMaterial color="#c43c2c" />
        </mesh>
        <mesh position={[0, 17.4, 0]}>
          <sphereGeometry args={[0.7, 10, 10]} />
          <meshBasicMaterial color={night ? "#fff4b0" : "#ffe08a"} />
        </mesh>
        {night && (
          <pointLight
            position={[0, 17.4, 0]}
            color="#fff1b8"
            intensity={3}
            distance={80}
          />
        )}
      </group>
    );
  }

  if (layout.theme === "city") {
    const rand = seededRandom(404);
    const towers: { x: number; z: number; h: number; w: number }[] = [];
    for (let i = 0; i < 22; i++) {
      towers.push({
        x: wp.x + (rand() - 0.5) * 220,
        z: wp.z + (rand() - 0.5) * 180,
        h: 18 + rand() * 42,
        w: 6 + rand() * 8,
      });
    }
    return (
      <group>
        <mesh position={[wp.x, 28, wp.z]}>
          <boxGeometry args={[10, 56, 10]} />
          <meshStandardMaterial
            color="#3a4558"
            metalness={0.25}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[wp.x, 57, wp.z]}>
          <boxGeometry args={[4, 6, 4]} />
          <meshBasicMaterial color={night ? "#ffd36a" : "#d8c070"} />
        </mesh>
        {towers.map((t) => (
          <mesh key={`${t.x}-${t.z}`} position={[t.x, t.h / 2, t.z]} castShadow>
            <boxGeometry args={[t.w, t.h, t.w]} />
            <meshStandardMaterial
              color="#4a5568"
              emissive={night ? "#3a4a20" : "#000"}
              emissiveIntensity={night ? 0.25 : 0}
              roughness={0.6}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (layout.theme === "harbor" || layout.theme === "storm") {
    return (
      <group position={[wp.x, 0, wp.z]}>
        <mesh position={[0, 4.5, 0]}>
          <cylinderGeometry args={[0.5, 0.7, 9, 8]} />
          <meshStandardMaterial color="#c8c4bc" metalness={0.3} />
        </mesh>
        <mesh position={[0, 9.4, 0]}>
          <sphereGeometry args={[0.9, 10, 10]} />
          <meshBasicMaterial color={night ? "#ff7a3a" : "#e24a3a"} />
        </mesh>
        {night && (
          <pointLight
            position={[0, 9.4, 0]}
            color="#ff8a40"
            intensity={2.4}
            distance={60}
          />
        )}
      </group>
    );
  }

  return null;
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
