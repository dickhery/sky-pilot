import { Environment } from "@/components/flight/Environment";
import { PlaneModel } from "@/components/flight/PlaneModel";
import {
  AirportBuildings,
  DistantMountains,
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
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 58, near: 0.15, far: 1400, position: [0, 6, 50] }}
    >
      <Environment weather={weather} />
      <Terrain />
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
      />
      <Taxiway
        from={new THREE.Vector3(0, 0.015, 55)}
        to={new THREE.Vector3(22, 0.015, 55)}
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

function Taxiway({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const length = from.distanceTo(to);
  const center = from.clone().add(to).multiplyScalar(0.5);
  const heading = Math.atan2(to.x - from.x, to.z - from.z);
  return (
    <mesh
      position={[center.x, center.y, center.z]}
      rotation={[-Math.PI / 2, 0, -heading]}
    >
      <planeGeometry args={[length, 6]} />
      <meshStandardMaterial color="#2a2e34" roughness={0.9} />
    </mesh>
  );
}

function Runway({
  start,
  end,
  weather,
  isLanding = false,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  weather: Weather;
  isLanding?: boolean;
}) {
  const length = start.distanceTo(end);
  const center = start.clone().add(end).multiplyScalar(0.5);
  const heading = Math.atan2(end.x - start.x, end.z - start.z);
  const isNight = weather === "Nighttime";

  const dashes = useMemo(() => {
    const arr: number[] = [];
    const count = Math.floor(length / 10);
    for (let i = 0; i < count; i++) {
      arr.push(-length / 2 + 6 + i * 10);
    }
    return arr;
  }, [length]);

  const thresholdBars = useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < 8; i++) {
      bars.push(-3.2 + i * 0.92);
    }
    return bars;
  }, []);

  return (
    <group position={center} rotation={[0, heading, 0]}>
      {/* Shoulders */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[16, length + 8]} />
        <meshStandardMaterial color="#3a3d36" roughness={0.95} />
      </mesh>
      {/* Tarmac */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <planeGeometry args={[12, length]} />
        <meshStandardMaterial color="#2a2d32" roughness={0.88} />
      </mesh>
      {/* Edge stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5.7, 0.035, 0]}>
        <planeGeometry args={[0.35, length]} />
        <meshStandardMaterial
          color={isNight ? "#d8c070" : "#e8e4d8"}
          emissive={isNight ? "#8a7030" : "#000"}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.7, 0.035, 0]}>
        <planeGeometry args={[0.35, length]} />
        <meshStandardMaterial
          color={isNight ? "#d8c070" : "#e8e4d8"}
          emissive={isNight ? "#8a7030" : "#000"}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>
      {/* Centerline dashes */}
      {dashes.map((z) => (
        <mesh
          key={`dash-${z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.036, z]}
        >
          <planeGeometry args={[0.28, 4]} />
          <meshStandardMaterial
            color="#f0f0ec"
            emissive={isNight ? "#555" : "#000"}
          />
        </mesh>
      ))}
      {/* Threshold bars */}
      {thresholdBars.map((x) => (
        <mesh
          key={`th-${x}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.037, -length / 2 + 8]}
        >
          <planeGeometry args={[0.38, 10]} />
          <meshStandardMaterial color="#f2f2ee" />
        </mesh>
      ))}
      {/* Aiming point */}
      {isLanding && (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-2.2, 0.037, -length / 2 + 36]}
          >
            <planeGeometry args={[1.6, 8]} />
            <meshStandardMaterial color="#f2f2ee" />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[2.2, 0.037, -length / 2 + 36]}
          >
            <planeGeometry args={[1.6, 8]} />
            <meshStandardMaterial color="#f2f2ee" />
          </mesh>
        </>
      )}
      {isLanding && (
        <>
          <ApproachLight x={-4.2} z={-length / 2 + 2} night={isNight} />
          <ApproachLight x={4.2} z={-length / 2 + 2} night={isNight} />
          <ApproachLight x={-4.2} z={-length / 2 + 14} night={isNight} />
          <ApproachLight x={4.2} z={-length / 2 + 14} night={isNight} />
        </>
      )}
    </group>
  );
}

function ApproachLight({
  x,
  z,
  night,
}: {
  x: number;
  z: number;
  night: boolean;
}) {
  return (
    <group position={[x, 0.15, z]}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.08, 0.3, 6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#5dff8a" />
      </mesh>
      <pointLight color="#5dff8a" intensity={night ? 1.8 : 0.6} distance={18} />
    </group>
  );
}

function LandingRunwayMarker({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.12;
      ref.current.scale.setScalar(pulse);
    }
  });
  return (
    <group ref={ref} position={[position.x, position.y + 10, position.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9, 11, 40]} />
        <meshBasicMaterial
          color="#3dff7a"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <coneGeometry args={[0.45, 2.2, 8]} />
        <meshBasicMaterial color="#3dff7a" />
      </mesh>
    </group>
  );
}

function WaypointMarker({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.45;
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <torusGeometry args={[6, 0.28, 10, 36]} />
        <meshBasicMaterial color="#2bb8c9" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6, 0.28, 10, 36]} />
        <meshBasicMaterial color="#2bb8c9" transparent opacity={0.45} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.85, 16, 16]} />
        <meshBasicMaterial color="#e89a3c" />
      </mesh>
    </group>
  );
}

// ── Flight rig: plane + camera + physics loop ───────────────────────────────

const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _up = new THREE.Vector3();

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
  const shadowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const lastPhase = useRef<FlightPhase>("takeoff");
  const camPos = useRef(new THREE.Vector3(0, 6, 50));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = flightState.current;
    const input = controlsAxes.current;

    stepFlight(state, layout, plane, input, dt);

    if (state.phase !== lastPhase.current) {
      lastPhase.current = state.phase;
      onPhaseChange(state.phase);
    }

    if (planeRef.current) {
      planeRef.current.position.copy(state.position);
      planeRef.current.rotation.copy(state.rotation);
    }

    if (shadowRef.current) {
      const agl = Math.max(0, state.position.y - 1.07);
      const scale = THREE.MathUtils.clamp(3.2 + agl * 0.35, 3.2, 10);
      const opacity = THREE.MathUtils.clamp(0.38 - agl * 0.018, 0.04, 0.38);
      shadowRef.current.position.set(state.position.x, 0.04, state.position.z);
      shadowRef.current.scale.set(scale, scale, 1);
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }

    // Chase camera in the aircraft's heading frame, with a fraction of bank.
    const dist = state.airborne ? 12.5 : 9;
    const height = state.airborne ? 3.6 : 2.6;
    const heading = state.rotation.y;
    const bankLean = state.rotation.z * 0.35;
    _camOffset.set(
      Math.sin(heading) * dist + Math.cos(heading) * bankLean * 2.2,
      height + Math.abs(state.rotation.x) * 1.4,
      Math.cos(heading) * dist - Math.sin(heading) * bankLean * 2.2,
    );
    const targetX = state.position.x + _camOffset.x;
    const targetY = state.position.y + _camOffset.y;
    const targetZ = state.position.z + _camOffset.z;
    camPos.current.lerp(
      _camTarget.set(targetX, targetY, targetZ),
      Math.min(1, dt * 3.1),
    );
    camera.position.copy(camPos.current);

    _lookAt.set(
      state.position.x - Math.sin(heading) * 10,
      state.position.y + 0.55 + state.rotation.x * 2.5,
      state.position.z - Math.cos(heading) * 10,
    );
    camera.lookAt(_lookAt);
    _up.set(-Math.sin(heading) * bankLean * 0.25, 1, 0).normalize();
    camera.up.lerp(_up, Math.min(1, dt * 4));
  });

  return (
    <>
      <group ref={planeRef}>
        <PlaneModel
          planeId={plane.id}
          axes={controlsAxes}
          flightState={flightState}
        />
      </group>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial
          color="#1a1a14"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
