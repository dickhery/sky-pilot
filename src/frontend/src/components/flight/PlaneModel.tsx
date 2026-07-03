import type { PlaneId } from "@/types/game";
import { forwardRef, useMemo } from "react";
import type * as THREE from "three";

interface PlaneModelProps {
  planeId: PlaneId;
  /** 0..1 — used to tint the exhaust glow when at full throttle. */
  throttle?: number;
}

/**
 * A lightweight procedural aircraft built from primitives.
 *
 * Two visual variants keyed by `planeId`:
 *  - CessnaSkyhawk: high-wing trainer, white + cyan livery, wider wingspan.
 *  - Extra300: low-wing aerobatic, amber + dark livery, shorter wings.
 *
 * The mesh is authored facing -Z (nose toward -Z), wings along X, up +Y,
 * so the flight loop can rotate it with intuitive Euler angles.
 */
export const PlaneModel = forwardRef<THREE.Group, PlaneModelProps>(
  function PlaneModel({ planeId, throttle = 0 }, ref) {
    const isCessna = planeId === "CessnaSkyhawk";

    const colors = useMemo(
      () =>
        isCessna
          ? {
              body: "#eef4fb",
              accent: "#2bb8c9",
              trim: "#1a6f7a",
              glass: "#9fd6e6",
            }
          : {
              body: "#1c2230",
              accent: "#e89a3c",
              trim: "#b56a1e",
              glass: "#3a4258",
            },
      [isCessna],
    );

    const wingSpan = isCessna ? 7.2 : 5.6;
    const wingY = isCessna ? 0.55 : -0.15;
    const tailSpan = isCessna ? 2.6 : 2.2;

    return (
      <group ref={ref}>
        {/* Fuselage */}
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.42, 4.2, 6, 12]} />
          <meshStandardMaterial
            color={colors.body}
            metalness={0.3}
            roughness={0.45}
          />
        </mesh>

        {/* Nose cone accent */}
        <mesh position={[0, 0, -2.7]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.42, 0.9, 16]} />
          <meshStandardMaterial
            color={colors.accent}
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>

        {/* Cockpit canopy */}
        <mesh position={[0, 0.32, -0.4]} rotation={[0.1, 0, 0]}>
          <sphereGeometry
            args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial
            color={colors.glass}
            metalness={0.6}
            roughness={0.1}
            transparent
            opacity={0.75}
          />
        </mesh>

        {/* Main wings */}
        <mesh position={[0, wingY, 0.2]} castShadow>
          <boxGeometry args={[wingSpan, 0.12, 1.3]} />
          <meshStandardMaterial
            color={colors.body}
            metalness={0.25}
            roughness={0.5}
          />
        </mesh>
        {/* Wing accent stripes */}
        <mesh position={[0, wingY + 0.07, 0.2]}>
          <boxGeometry args={[wingSpan, 0.02, 1.32]} />
          <meshStandardMaterial
            color={colors.accent}
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>

        {/* Tail — horizontal stabilizer */}
        <mesh position={[0, 0.35, 2.3]} castShadow>
          <boxGeometry args={[tailSpan, 0.1, 0.9]} />
          <meshStandardMaterial
            color={colors.body}
            metalness={0.25}
            roughness={0.5}
          />
        </mesh>
        {/* Vertical stabilizer */}
        <mesh position={[0, 1.0, 2.4]} castShadow>
          <boxGeometry args={[0.1, 1.1, 0.9]} />
          <meshStandardMaterial
            color={colors.accent}
            metalness={0.35}
            roughness={0.45}
          />
        </mesh>

        {/* Engine exhaust glow — scales with throttle */}
        <mesh position={[0, 0, 3.05]}>
          <sphereGeometry args={[0.18 + throttle * 0.22, 10, 8]} />
          <meshBasicMaterial
            color={throttle > 0.6 ? "#ff8a3c" : "#5fd0e0"}
            transparent
            opacity={0.35 + throttle * 0.5}
          />
        </mesh>

        {/* Landing gear — simple struts so takeoff/landing reads visually */}
        <group>
          <mesh position={[1.4, -0.55, -0.4]}>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
            <meshStandardMaterial color={colors.trim} />
          </mesh>
          <mesh position={[1.4, -0.85, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.18, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[-1.4, -0.55, -0.4]}>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
            <meshStandardMaterial color={colors.trim} />
          </mesh>
          <mesh position={[-1.4, -0.85, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.18, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, -0.5, 2.3]}>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color={colors.trim} />
          </mesh>
          <mesh position={[0, -0.72, 2.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.14, 10]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      </group>
    );
  },
);
