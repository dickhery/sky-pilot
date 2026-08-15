import type { FlightState } from "@/components/flight/flightPhysics";
import type { PlaneId } from "@/types/game";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface CockpitInteriorProps {
  planeId: PlaneId;
  flightState: React.MutableRefObject<FlightState>;
  axes: React.MutableRefObject<{
    pitch: number;
    roll: number;
    throttle: number;
  }>;
}

/**
 * Pilot-seat interior. Built from primitives so we stay Caffeine-friendly
 * (no extra GLB downloads). Gauges read the live flight-state ref each frame.
 */
export function CockpitInterior({
  planeId,
  flightState,
  axes,
}: CockpitInteriorProps) {
  const isCessna = planeId === "CessnaSkyhawk";
  const dash = isCessna ? "#2a323c" : "#1a1c22";
  const leather = isCessna ? "#4a3224" : "#2a1c18";
  const yokeRef = useRef<THREE.Group>(null);
  const thrRef = useRef<THREE.Mesh>(null);
  const asi = useRef<THREE.Group>(null);
  const alt = useRef<THREE.Group>(null);
  const hdg = useRef<THREE.Group>(null);
  const vsi = useRef<THREE.Group>(null);
  const ai = useRef<THREE.Group>(null);

  useFrame(() => {
    const s = flightState.current;
    const input = axes.current;
    if (yokeRef.current) {
      yokeRef.current.rotation.x = -input.pitch * 0.28;
      yokeRef.current.rotation.z = -input.roll * 0.35;
    }
    if (thrRef.current) {
      thrRef.current.position.z = 0.08 - input.throttle * 0.14;
    }
    const kts = s.speed * 1.94;
    const altFt = Math.max(0, (s.position.y - 1.07) * 3.28);
    const hdgDeg = THREE.MathUtils.radToDeg(s.rotation.y);
    const fpm = s.verticalSpeed * 196.85;
    if (asi.current)
      asi.current.rotation.z = -THREE.MathUtils.degToRad(kts * 1.8);
    if (alt.current)
      alt.current.rotation.z = -THREE.MathUtils.degToRad((altFt / 10) * 3.6);
    if (hdg.current) hdg.current.rotation.z = THREE.MathUtils.degToRad(hdgDeg);
    if (vsi.current)
      vsi.current.rotation.z = -THREE.MathUtils.clamp(fpm / 2000, -1, 1) * 2.2;
    if (ai.current) {
      ai.current.rotation.x = -s.rotation.x * 0.85;
      ai.current.rotation.z = s.rotation.z * 0.85;
    }
  });

  return (
    <group position={[0, 0.12, 0.05]}>
      {/* Cabin walls */}
      <mesh position={[0, 0.18, 0.35]}>
        <boxGeometry args={[1.05, 0.72, 1.4]} />
        <meshStandardMaterial color={dash} roughness={0.85} />
      </mesh>
      {/* Seats */}
      <mesh position={[0.16, -0.02, 0.42]}>
        <boxGeometry args={[0.34, 0.12, 0.38]} />
        <meshStandardMaterial color={leather} roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 0.16, 0.55]}>
        <boxGeometry args={[0.34, 0.28, 0.1]} />
        <meshStandardMaterial color={leather} roughness={0.9} />
      </mesh>
      <mesh position={[-0.22, -0.02, 0.42]}>
        <boxGeometry args={[0.3, 0.12, 0.36]} />
        <meshStandardMaterial color={leather} roughness={0.92} />
      </mesh>

      {/* Glareshield + dash */}
      <mesh position={[0, 0.12, -0.22]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.98, 0.08, 0.42]} />
        <meshStandardMaterial color="#1c2228" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, -0.18]}>
        <boxGeometry args={[0.96, 0.22, 0.36]} />
        <meshStandardMaterial color={dash} roughness={0.65} metalness={0.15} />
      </mesh>

      {/* Instrument row */}
      <Gauge faceRef={asi} x={-0.32} label="#1a1a1a" />
      <Gauge faceRef={ai} x={-0.1} label="#102030" ball />
      <Gauge faceRef={alt} x={0.12} label="#1a1a1a" />
      <Gauge faceRef={hdg} x={0.32} label="#141814" />
      <Gauge faceRef={vsi} x={0.0} y={-0.08} z={-0.02} scale={0.78} />

      {/* Yoke */}
      <group ref={yokeRef} position={[0.16, -0.02, -0.02]}>
        <mesh position={[0, 0, 0.08]}>
          <cylinderGeometry args={[0.025, 0.03, 0.22, 8]} />
          <meshStandardMaterial color="#2c3036" metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.02, -0.04]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.11, 0.018, 8, 20]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.6} />
        </mesh>
      </group>

      {/* Throttle quadrant */}
      <mesh position={[0.38, -0.06, 0.08]}>
        <boxGeometry args={[0.12, 0.06, 0.22]} />
        <meshStandardMaterial color="#3a3f46" />
      </mesh>
      <mesh ref={thrRef} position={[0.38, 0.0, 0.08]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#c43c2c" />
      </mesh>

      {/* Windshield opening — empty so the world shows through */}
      <mesh position={[0, 0.38, -0.42]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[0.92, 0.42]} />
        <meshBasicMaterial
          color="#7ec8e8"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Side windows */}
      <mesh position={[0.5, 0.28, 0.05]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.28]} />
        <meshBasicMaterial
          color="#7ec8e8"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-0.5, 0.28, 0.05]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.28]} />
        <meshBasicMaterial
          color="#7ec8e8"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Gauge({
  faceRef,
  x,
  y = 0.06,
  z = -0.28,
  scale = 1,
  label = "#111",
  ball = false,
}: {
  faceRef: React.RefObject<THREE.Group | null>;
  x: number;
  y?: number;
  z?: number;
  scale?: number;
  label?: string;
  ball?: boolean;
}) {
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh rotation={[0, 0, 0]}>
        <circleGeometry args={[0.08, 24]} />
        <meshStandardMaterial color={label} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <ringGeometry args={[0.072, 0.082, 24]} />
        <meshStandardMaterial color="#c8ccd0" metalness={0.5} roughness={0.3} />
      </mesh>
      {ball ? (
        <group ref={faceRef}>
          <mesh>
            <sphereGeometry args={[0.055, 16, 12]} />
            <meshStandardMaterial color="#2a6a9a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.11, 0.006, 0.002]} />
            <meshBasicMaterial color="#e8e0c8" />
          </mesh>
        </group>
      ) : (
        <group ref={faceRef} position={[0, 0, 0.008]}>
          <mesh position={[0, 0.028, 0]}>
            <boxGeometry args={[0.008, 0.055, 0.004]} />
            <meshBasicMaterial color="#e8c040" />
          </mesh>
        </group>
      )}
    </group>
  );
}
