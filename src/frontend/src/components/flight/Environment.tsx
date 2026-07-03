import type { Weather } from "@/types/game";
import { Cloud, Clouds, Sky, Stars } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

interface EnvironmentProps {
  weather: Weather;
}

/**
 * Sky + lighting environment driven by the flight plan's weather.
 *
 * - Daytime: bright drei <Sky> with a high sun and warm directional light.
 * - Nighttime: dark sky, drei <Stars>, cool dim lighting, runway strobes
 *   are handled by the runway mesh itself.
 * - PartlyCloudy: overcast — drei <Clouds> layer + soft ambient/directional.
 *
 * Kept intentionally lightweight (no HDRI fetch) for performance.
 */
export function Environment({ weather }: EnvironmentProps) {
  const sunPosition = useMemo<[number, number, number]>(
    () => (weather === "Nighttime" ? [-0.3, 0.05, -1] : [0.6, 0.8, 0.4]),
    [weather],
  );

  return (
    <>
      {weather === "Daytime" && (
        <Sky
          distance={4500}
          sunPosition={sunPosition}
          inclination={0.52}
          azimuth={0.25}
          turbidity={6}
          rayleigh={1.2}
          mieCoefficient={0.005}
          mieDirectionalG={0.85}
        />
      )}

      {weather === "Nighttime" && (
        <>
          <color attach="background" args={["#05070f"]} />
          <fog attach="fog" args={["#05070f", 60, 320]} />
          <Stars
            radius={200}
            depth={50}
            count={1800}
            factor={4}
            saturation={0}
            fade
            speed={0.5}
          />
        </>
      )}

      {weather === "PartlyCloudy" && (
        <>
          <color attach="background" args={["#9aa6b5"]} />
          <fog attach="fog" args={["#9aa6b5", 80, 360]} />
          <Clouds material={THREE.MeshBasicMaterial} limit={40}>
            <Cloud
              seed={7}
              segments={28}
              bounds={[120, 12, 120]}
              volume={26}
              opacity={0.7}
              color="#c4ccd6"
              position={[0, 38, -40]}
            />
            <Cloud
              seed={21}
              segments={20}
              bounds={[100, 8, 100]}
              volume={18}
              opacity={0.55}
              color="#b3bcc8"
              position={[-60, 30, 40]}
            />
          </Clouds>
        </>
      )}

      {/* Lighting tuned per weather */}
      {weather === "Daytime" && (
        <>
          <ambientLight intensity={0.55} color="#eaf4ff" />
          <directionalLight
            position={sunPosition}
            intensity={1.4}
            color="#fff4e0"
            castShadow={false}
          />
          <hemisphereLight args={["#bfe3ff", "#3a4a5a", 0.4]} />
        </>
      )}

      {weather === "Nighttime" && (
        <>
          <ambientLight intensity={0.18} color="#243049" />
          <directionalLight
            position={sunPosition}
            intensity={0.25}
            color="#6f86b8"
          />
          <hemisphereLight args={["#1a2440", "#05070f", 0.25]} />
        </>
      )}

      {weather === "PartlyCloudy" && (
        <>
          <ambientLight intensity={0.7} color="#cfd6de" />
          <directionalLight
            position={[0.2, 0.9, 0.5]}
            intensity={0.6}
            color="#e8edf2"
          />
          <hemisphereLight args={["#bcc4ce", "#5a6470", 0.5]} />
        </>
      )}
    </>
  );
}
