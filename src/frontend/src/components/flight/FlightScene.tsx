import { Environment } from "@/components/flight/Environment";
import { PlaneModel } from "@/components/flight/PlaneModel";
import {
  AirportBuildings,
  DistantMountains,
  Fields,
  Terrain,
  TreeField,
  WaterBody,
} from "@/components/flight/Scenery";
import {
  type FlightState,
  type SceneLayout,
  buildSceneLayout,
  stepFlight,
} from "@/components/flight/flightPhysics";
import type { FlightPhase, Plane as PlaneType, Weather } from "@/types/game";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export interface FlightSceneProps {
  plane: PlaneType;
  weather: Weather;
  /** Live control axes ref from useFlightControls. */
  controlsAxes: React.MutableRefObject<{
    pitch: number;
    roll: number;
    throttle: number;
    brakes: boolean;
  }>;
  /** Shared mutable flight state — the page reads this for scoring/HUD. */
  flightState: React.MutableRefObject<FlightState>;
  /** Called when the flight phase changes so the page can update the store. */
  onPhaseChange: (phase: FlightPhase) => void;
}

/**
 * react-three-fiber Canvas hosting the plane, environment, runways, and
 * the waypoint marker. The render loop integrates flight physics each
 * frame and chases the plane with a follow camera.
 */
export function FlightScene({
  plane,
  weather,
  controlsAxes,
  flightState,
  onPhaseChange,
}: FlightSceneProps) {
  const layout = useMemo(buildSceneLayout, []);

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 6, 50] }}
    >
      <Environment weather={weather} />
      <Terrain />
      <Fields />
      <WaterBody />
      <TreeField />
      <DistantMountains />
      <AirportBuildings />
      <Runway
        start={layout.departureStart}
        end={layout.departureEnd}
        weather={weather}
      />
      <Runway
        start={layout.landingThreshold}
        end={layout.landingEnd}
        weather={weather}
        isLanding
        label="LAND"
      />
      <LandingRunwayMarker position={layout.landingThreshold} />
      <WaypointMarker position={layout.waypoint} />
      <FlightRig
        plane={plane}
        layout={layout}
        controlsAxes={controlsAxes}
        flightState={flightState}
        onPhaseChange={onPhaseChange}
      />
    </Canvas>
  );
}

// ── Scene pieces ────────────────────────────────────────────────────────────

function Runway({
  start,
  end,
  weather,
  isLanding = false,
  label,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  weather: Weather;
  isLanding?: boolean;
  label?: string;
}) {
  const length = start.distanceTo(end);
  const center = start.clone().add(end).multiplyScalar(0.5);
  const heading = Math.atan2(end.x - start.x, end.z - start.z);

  const isNight = weather === "Nighttime";

  // Centerline dashes
  const dashes = useMemo(() => {
    const arr: number[] = [];
    const count = Math.floor(length / 8);
    for (let i = 0; i < count; i++) {
      arr.push(-length / 2 + 4 + i * 8);
    }
    return arr;
  }, [length]);

  return (
    <group position={center} rotation={[0, heading, 0]}>
      {/* Tarmac */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[10, length]} />
        <meshStandardMaterial color="#1c1f24" roughness={0.9} />
      </mesh>
      {/* Edge stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.8, 0.03, 0]}>
        <planeGeometry args={[0.4, length]} />
        <meshStandardMaterial
          color={isNight ? "#3a4250" : "#c9ccd2"}
          emissive={isNight ? "#1a2230" : "#000"}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.8, 0.03, 0]}>
        <planeGeometry args={[0.4, length]} />
        <meshStandardMaterial
          color={isNight ? "#3a4250" : "#c9ccd2"}
          emissive={isNight ? "#1a2230" : "#000"}
        />
      </mesh>
      {/* Centerline dashes */}
      {dashes.map((z) => (
        <mesh
          key={`dash-${z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, z]}
        >
          <planeGeometry args={[0.3, 3]} />
          <meshStandardMaterial
            color="#e8e8e8"
            emissive={isNight ? "#444" : "#000"}
          />
        </mesh>
      ))}
      {/* Landing threshold — green approach lights (always visible) */}
      {isLanding && (
        <>
          <mesh position={[-3.5, 0.4, -length / 2 + 3]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial color="#3dff7a" />
            <pointLight
              color="#3dff7a"
              intensity={isNight ? 2.5 : 1.2}
              distance={25}
            />
          </mesh>
          <mesh position={[3.5, 0.4, -length / 2 + 3]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial color="#3dff7a" />
            <pointLight
              color="#3dff7a"
              intensity={isNight ? 2.5 : 1.2}
              distance={25}
            />
          </mesh>
        </>
      )}
      {label && (
        <mesh
          position={[0, 0.5, -length / 2 + 8]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[6, 1.5]} />
          <meshBasicMaterial color="#3dff7a" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

function LandingRunwayMarker({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      ref.current.scale.setScalar(pulse);
    }
  });
  return (
    <group ref={ref} position={[position.x, position.y + 8, position.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10, 12, 32]} />
        <meshBasicMaterial
          color="#3dff7a"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <coneGeometry args={[0.6, 2.5, 4]} />
        <meshBasicMaterial color="#3dff7a" />
      </mesh>
      <pointLight color="#3dff7a" intensity={1.2} distance={50} />
    </group>
  );
}

function WaypointMarker({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.6;
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <torusGeometry args={[6, 0.4, 8, 24]} />
        <meshBasicMaterial color="#2bb8c9" transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6, 0.4, 8, 24]} />
        <meshBasicMaterial color="#2bb8c9" transparent opacity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#e89a3c" />
      </mesh>
      <pointLight color="#2bb8c9" intensity={1.5} distance={40} />
    </group>
  );
}

// ── Flight rig: plane + camera + physics loop ───────────────────────────────

function FlightRig({
  plane,
  layout,
  controlsAxes,
  flightState,
  onPhaseChange,
}: {
  plane: PlaneType;
  layout: SceneLayout;
  controlsAxes: FlightSceneProps["controlsAxes"];
  flightState: React.MutableRefObject<FlightState>;
  onPhaseChange: (phase: FlightPhase) => void;
}) {
  const planeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const lastPhase = useRef<FlightPhase>("takeoff");
  const camPos = useRef(new THREE.Vector3(0, 6, 50));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // clamp for stability
    const state = flightState.current;
    const input = controlsAxes.current;

    stepFlight(state, layout, plane, input, dt);

    if (state.phase !== lastPhase.current) {
      lastPhase.current = state.phase;
      onPhaseChange(state.phase);
    }

    // Apply transform to the visible mesh.
    if (planeRef.current) {
      planeRef.current.position.copy(state.position);
      planeRef.current.rotation.copy(state.rotation);
    }

    // Chase camera — eased follow behind and above the plane.
    const heading = state.rotation.y;
    const dist = state.airborne ? 11 : 8;
    const height = state.airborne ? 4.2 : 3;
    const back = new THREE.Vector3(
      Math.sin(heading) * dist,
      0,
      Math.cos(heading) * dist,
    );
    const target = state.position.clone().add(back);
    target.y += height;
    camPos.current.lerp(target, Math.min(1, dt * 2.8));
    camera.position.copy(camPos.current);
    const lookY = state.position.y + (state.airborne ? 0.8 : 0.4);
    camera.lookAt(state.position.x, lookY, state.position.z);
  });

  return (
    <group ref={planeRef}>
      <PlaneModel
        planeId={plane.id}
        throttle={controlsAxes.current.throttle}
        airborne={flightState.current.airborne}
      />
    </group>
  );
}
