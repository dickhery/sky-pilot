import type { Weather } from "@/types/game";
import { Cloud, Clouds, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface EnvironmentProps {
  weather: Weather;
}

interface SkyPalette {
  zenith: string;
  mid: string;
  horizon: string;
  ground: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sun: [number, number, number];
  sunColor: string;
  sunRadius: number;
}

const PALETTES: Record<Weather, SkyPalette> = {
  Daytime: {
    zenith: "#1f6bb8",
    mid: "#4a9fde",
    horizon: "#b7d8f2",
    ground: "#8aa56a",
    fog: "#9ec6e6",
    fogNear: 380,
    fogFar: 2800,
    sun: [18, 90, 28],
    sunColor: "#fff4c8",
    sunRadius: 14,
  },
  Nighttime: {
    zenith: "#050914",
    mid: "#0c1830",
    horizon: "#1a2a48",
    ground: "#0a1220",
    fog: "#101c36",
    fogNear: 160,
    fogFar: 1600,
    sun: [-40, 8, -80],
    sunColor: "#d8e4ff",
    sunRadius: 6,
  },
  PartlyCloudy: {
    zenith: "#5c7388",
    mid: "#8fa0b0",
    horizon: "#c8d0d8",
    ground: "#6a7060",
    fog: "#9aa8b6",
    fogNear: 180,
    fogFar: 1600,
    sun: [30, 90, 40],
    sunColor: "#f0f2f4",
    sunRadius: 10,
  },
};

/**
 * Vertical canvas gradient mapped onto a sphere. SphereGeometry stores
 * uv.y = 1 at the +Y pole; with flipY off that pole samples the bottom
 * of the image, so zenith is painted at the bottom of the canvas.
 */
function makeSkyGradient(p: SkyPalette): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(c);
  }
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, p.ground);
  g.addColorStop(0.42, p.horizon);
  g.addColorStop(0.5, p.horizon);
  g.addColorStop(0.64, p.mid);
  g.addColorStop(1, p.zenith);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Keeps children centered on the camera so the dome never becomes a distant wall. */
function CameraFollower({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Full-sky dome just inside the camera far plane. Replaces drei `<Sky>`,
 * whose unit box scaled to 450000 sits beyond a ~2800 far clip and reads
 * as a blue rectangle with a white void around it.
 *
 * Runtime canvas texture — no HDRI fetch — so Caffeine reimport stays
 * offline-friendly and the asset canister stays small.
 */
function SkyDome({ palette }: { palette: SkyPalette }) {
  const texture = useMemo(() => makeSkyGradient(palette), [palette]);
  const sunPos = useMemo(() => {
    const v = new THREE.Vector3(...palette.sun).normalize().multiplyScalar(700);
    return v;
  }, [palette]);

  return (
    <CameraFollower>
      <mesh renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[1600, 32, 24]} />
        <meshBasicMaterial
          map={texture}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={sunPos} renderOrder={-999} frustumCulled={false}>
        <sphereGeometry args={[palette.sunRadius, 12, 12]} />
        <meshBasicMaterial
          color={palette.sunColor}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </CameraFollower>
  );
}

/**
 * Sky + lighting environment driven by the flight plan's weather.
 *
 * Kept lightweight (no HDRI fetch) so the frontend stays cheap to host
 * and Caffeine reimport does not pick up extra network assets.
 */
export function Environment({ weather }: EnvironmentProps) {
  const palette = PALETTES[weather];

  return (
    <>
      <color attach="background" args={[palette.mid]} />
      <fog attach="fog" args={[palette.fog, palette.fogNear, palette.fogFar]} />
      <SkyDome palette={palette} />

      {weather === "Nighttime" && (
        <CameraFollower>
          <Stars
            radius={520}
            depth={80}
            count={1800}
            factor={3.2}
            saturation={0.15}
            fade
            speed={0.35}
          />
        </CameraFollower>
      )}

      {weather === "Daytime" && (
        <Clouds material={THREE.MeshLambertMaterial} limit={24}>
          <Cloud
            seed={4}
            segments={16}
            bounds={[80, 8, 50]}
            volume={14}
            opacity={0.32}
            color="#f4f7fb"
            position={[-90, 55, -180]}
          />
          <Cloud
            seed={18}
            segments={14}
            bounds={[70, 7, 40]}
            volume={10}
            opacity={0.26}
            color="#eef2f6"
            position={[110, 48, -80]}
          />
        </Clouds>
      )}

      {weather === "PartlyCloudy" && (
        <Clouds material={THREE.MeshLambertMaterial} limit={36}>
          <Cloud
            seed={7}
            segments={22}
            bounds={[140, 14, 120]}
            volume={24}
            opacity={0.62}
            color="#c8d0d8"
            position={[0, 42, -50]}
          />
          <Cloud
            seed={21}
            segments={16}
            bounds={[100, 10, 90]}
            volume={16}
            opacity={0.48}
            color="#b7c0ca"
            position={[-70, 34, 30]}
          />
        </Clouds>
      )}

      {weather === "Daytime" && (
        <>
          <ambientLight intensity={0.55} color="#d6ecff" />
          <hemisphereLight args={["#8ec4f0", "#5a7048", 0.7]} />
          <directionalLight
            position={palette.sun}
            intensity={1.85}
            color="#fff7e6"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={420}
            shadow-camera-left={-90}
            shadow-camera-right={90}
            shadow-camera-top={90}
            shadow-camera-bottom={-90}
            shadow-bias={-0.0004}
          />
        </>
      )}

      {weather === "Nighttime" && (
        <>
          <ambientLight intensity={0.32} color="#6a82b0" />
          <hemisphereLight args={["#6d86b8", "#1a2438", 0.48]} />
          <directionalLight
            position={palette.sun}
            intensity={0.55}
            color="#c4d4f0"
          />
        </>
      )}

      {weather === "PartlyCloudy" && (
        <>
          <ambientLight intensity={0.55} color="#d5dbe2" />
          <hemisphereLight args={["#c5ccd4", "#5a6458", 0.45]} />
          <directionalLight
            position={palette.sun}
            intensity={0.7}
            color="#e6ebf0"
            castShadow={false}
          />
        </>
      )}
    </>
  );
}
