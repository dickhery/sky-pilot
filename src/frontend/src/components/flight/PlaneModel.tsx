import type { PlaneId } from "@/types/game";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import type * as THREE from "three";

interface PlaneModelProps {
  planeId: PlaneId;
  /** 0..1 — drives propeller speed and exhaust glow. */
  throttle?: number;
  /** True when wheels are off the ground. */
  airborne?: boolean;
}

/**
 * Procedural single-engine aircraft built from primitives.
 *
 * CessnaSkyhawk: high-wing trainer with dihedral, strut bracing, tricycle gear.
 * Extra300: low-wing aerobatic with clipped wings and bold livery.
 */
export const PlaneModel = forwardRef<THREE.Group, PlaneModelProps>(
  function PlaneModel({ planeId, throttle = 0, airborne = false }, ref) {
    const isCessna = planeId === "CessnaSkyhawk";
    const propRef = useRef<THREE.Group>(null);

    const colors = useMemo(
      () =>
        isCessna
          ? {
              body: "#f2f6fa",
              accent: "#1e9cb0",
              trim: "#0d5a66",
              glass: "#7ec8dc",
              wing: "#e8eef4",
              stripe: "#e85d2c",
            }
          : {
              body: "#1a2030",
              accent: "#f0a030",
              trim: "#8a5520",
              glass: "#4a5568",
              wing: "#222a3a",
              stripe: "#f0a030",
            },
      [isCessna],
    );

    const wingSpan = isCessna ? 8.2 : 6.4;
    const wingY = isCessna ? 0.75 : -0.2;
    const tailSpan = isCessna ? 2.8 : 2.4;
    const gearDown = !airborne;

    useFrame((_, delta) => {
      if (propRef.current) {
        propRef.current.rotation.z += delta * (4 + throttle * 28);
      }
    });

    return (
      <group ref={ref}>
        {/* Fuselage — tapered body */}
        <mesh
          castShadow
          position={[0, 0.05, 0.3]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[0.38, 3.6, 8, 16]} />
          <meshStandardMaterial
            color={colors.body}
            metalness={0.35}
            roughness={0.4}
          />
        </mesh>
        {/* Belly fairing */}
        <mesh position={[0, -0.18, 0.5]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.55, 0.25, 2.8]} />
          <meshStandardMaterial
            color={colors.trim}
            metalness={0.2}
            roughness={0.55}
          />
        </mesh>

        {/* Nose / spinner */}
        <mesh position={[0, 0.05, -2.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.36, 0.7, 16]} />
          <meshStandardMaterial
            color={colors.accent}
            metalness={0.55}
            roughness={0.3}
          />
        </mesh>

        {/* Propeller */}
        <group ref={propRef} position={[0, 0.05, -2.65]}>
          <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[wingSpan * 0.22, 0.06, 0.12]} />
            <meshStandardMaterial
              color="#2a3038"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[wingSpan * 0.22, 0.06, 0.12]} />
            <meshStandardMaterial
              color="#2a3038"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.15, 10]} />
            <meshStandardMaterial
              color="#444"
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
        </group>

        {/* Cockpit canopy */}
        <mesh position={[0, 0.42, -0.2]} rotation={[0.08, 0, 0]}>
          <sphereGeometry
            args={[0.48, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]}
          />
          <meshStandardMaterial
            color={colors.glass}
            metalness={0.7}
            roughness={0.08}
            transparent
            opacity={0.72}
          />
        </mesh>
        {/* Side windows */}
        <mesh position={[0.28, 0.35, -0.1]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.04, 0.22, 0.5]} />
          <meshStandardMaterial
            color={colors.glass}
            transparent
            opacity={0.65}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[-0.28, 0.35, -0.1]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.04, 0.22, 0.5]} />
          <meshStandardMaterial
            color={colors.glass}
            transparent
            opacity={0.65}
            metalness={0.5}
          />
        </mesh>

        {/* Main wings with dihedral */}
        <group
          position={[0, wingY, 0.15]}
          rotation={[0, 0, isCessna ? 0.12 : 0]}
        >
          <mesh castShadow>
            <boxGeometry args={[wingSpan, 0.14, 1.5]} />
            <meshStandardMaterial
              color={colors.wing}
              metalness={0.25}
              roughness={0.48}
            />
          </mesh>
          {/* Wing tips */}
          <mesh position={[wingSpan / 2 - 0.15, 0.08, 0]}>
            <boxGeometry args={[0.3, 0.18, 1.52]} />
            <meshStandardMaterial color={colors.accent} metalness={0.3} />
          </mesh>
          <mesh position={[-wingSpan / 2 + 0.15, 0.08, 0]}>
            <boxGeometry args={[0.3, 0.18, 1.52]} />
            <meshStandardMaterial color={colors.accent} metalness={0.3} />
          </mesh>
          {/* Livery stripe */}
          <mesh position={[0, 0.09, 0.1]}>
            <boxGeometry args={[wingSpan * 0.7, 0.03, 1.55]} />
            <meshStandardMaterial color={colors.stripe} metalness={0.4} />
          </mesh>
        </group>

        {/* Wing struts (Cessna high-wing) */}
        {isCessna && (
          <>
            <mesh position={[1.6, 0.35, 0.2]} rotation={[0, 0, -0.35]}>
              <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
              <meshStandardMaterial color={colors.trim} />
            </mesh>
            <mesh position={[-1.6, 0.35, 0.2]} rotation={[0, 0, 0.35]}>
              <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
              <meshStandardMaterial color={colors.trim} />
            </mesh>
          </>
        )}

        {/* Tail assembly */}
        <mesh position={[0, 0.4, 2.45]} castShadow>
          <boxGeometry args={[tailSpan, 0.1, 1.0]} />
          <meshStandardMaterial
            color={colors.wing}
            metalness={0.25}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 1.15, 2.55]} castShadow>
          <boxGeometry args={[0.12, 1.2, 0.95]} />
          <meshStandardMaterial
            color={colors.accent}
            metalness={0.35}
            roughness={0.42}
          />
        </mesh>
        {/* Rudder */}
        <mesh position={[0, 1.15, 2.95]}>
          <boxGeometry args={[0.08, 1.0, 0.35]} />
          <meshStandardMaterial color={colors.stripe} metalness={0.3} />
        </mesh>

        {/* Engine exhaust */}
        <mesh position={[0.22, -0.05, 2.85]}>
          <cylinderGeometry args={[0.06, 0.08, 0.25, 8]} />
          <meshBasicMaterial
            color={throttle > 0.5 ? "#ff9a40" : "#4a5568"}
            transparent
            opacity={0.5 + throttle * 0.4}
          />
        </mesh>

        {/* Landing gear — retracts visually when airborne */}
        <group visible={gearDown}>
          <LandingGear x={1.5} z={-0.3} strutH={0.75} colors={colors} />
          <LandingGear x={-1.5} z={-0.3} strutH={0.75} colors={colors} />
          <LandingGear x={0} z={2.1} strutH={0.55} colors={colors} nose />
        </group>
      </group>
    );
  },
);

function LandingGear({
  x,
  z,
  strutH,
  colors,
  nose = false,
}: {
  x: number;
  z: number;
  strutH: number;
  colors: { trim: string };
  nose?: boolean;
}) {
  const wheelR = nose ? 0.14 : 0.17;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, -strutH / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, strutH, 8]} />
        <meshStandardMaterial color={colors.trim} metalness={0.4} />
      </mesh>
      <mesh position={[0, -strutH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelR, wheelR, 0.14, 14]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}
