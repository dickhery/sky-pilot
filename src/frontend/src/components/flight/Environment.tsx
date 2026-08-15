import type { Weather } from "@/types/game";
import { Cloud, Clouds, ContactShadows, Sky, Stars } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

interface EnvironmentProps {
  weather: Weather;
}

/**
 * Sky + lighting environment driven by the flight plan's weather.
 *
 * Kept lightweight (no HDRI fetch) so the frontend stays cheap to host
 * and Caffeine reimport does not pick up extra network assets.
 */
export function Environment({ weather }: EnvironmentProps) {
  const sunPosition = useMemo<[number, number, number]>(
    () =>
      weather === "Nighttime"
        ? [-40, 8, -80]
        : weather === "PartlyCloudy"
          ? [30, 90, 40]
          : [18, 90, 28],
    [weather],
  );

  return (
    <>
      {weather === "Daytime" && (
        <>
          <color attach="background" args={["#5aa8e6"]} />
          <Sky
            distance={450000}
            sunPosition={[18, 90, 28]}
            turbidity={1.6}
            rayleigh={2.6}
            mieCoefficient={0.002}
            mieDirectionalG={0.8}
          />
          <fog attach="fog" args={["#7eb8e8", 320, 2200]} />
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
        </>
      )}

      {weather === "Nighttime" && (
        <>
          <color attach="background" args={["#0c1830"]} />
          <fog attach="fog" args={["#101c36", 140, 1400]} />
          <Stars
            radius={280}
            depth={60}
            count={2200}
            factor={3.6}
            saturation={0.15}
            fade
            speed={0.35}
          />
        </>
      )}

      {weather === "PartlyCloudy" && (
        <>
          <Sky
            distance={450000}
            sunPosition={sunPosition}
            inclination={0.55}
            azimuth={0.2}
            turbidity={8}
            rayleigh={0.45}
            mieCoefficient={0.008}
            mieDirectionalG={0.7}
          />
          <fog attach="fog" args={["#9aa8b6", 160, 1300]} />
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
        </>
      )}

      {weather === "Daytime" && (
        <>
          <ambientLight intensity={0.55} color="#d6ecff" />
          <hemisphereLight args={["#8ec4f0", "#5a7048", 0.7]} />
          <directionalLight
            position={[18, 90, 28]}
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
            position={sunPosition}
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
            position={sunPosition}
            intensity={0.7}
            color="#e6ebf0"
            castShadow={false}
          />
        </>
      )}

      {weather !== "Nighttime" && (
        <ContactShadows
          position={[0, 0.01, -40]}
          opacity={0.35}
          scale={220}
          blur={2.4}
          far={12}
          frames={1}
        />
      )}
    </>
  );
}
