import type { FlightState } from "@/components/flight/flightPhysics";
import type { PlaneId } from "@/types/game";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";

interface ControlAxesLike {
  throttle: number;
}

interface PlaneModelProps {
  planeId: PlaneId;
  /** Live control axes — read each frame so the prop disc tracks throttle. */
  axes: React.MutableRefObject<ControlAxesLike>;
  /** Live flight state — gear and lights follow airborne / speed. */
  flightState: React.MutableRefObject<FlightState>;
}

interface Palette {
  body: string;
  accent: string;
  trim: string;
  glass: string;
  wing: string;
  stripe: string;
  spinner: string;
  interior: string;
}

function makeFuselage(isCessna: boolean): THREE.LatheGeometry {
  const pts = isCessna
    ? [
        [0.01, -2.55],
        [0.16, -2.38],
        [0.28, -2.12],
        [0.36, -1.7],
        [0.4, -1.15],
        [0.42, -0.45],
        [0.43, 0.15],
        [0.41, 0.75],
        [0.36, 1.35],
        [0.28, 1.9],
        [0.2, 2.3],
        [0.12, 2.62],
        [0.04, 2.82],
      ]
    : [
        [0.01, -2.45],
        [0.14, -2.28],
        [0.24, -2.02],
        [0.3, -1.55],
        [0.33, -0.95],
        [0.34, -0.25],
        [0.33, 0.4],
        [0.3, 1.0],
        [0.24, 1.55],
        [0.17, 2.05],
        [0.1, 2.42],
        [0.03, 2.65],
      ];
  const vectors = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(vectors, 28);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function makeWing(
  span: number,
  rootChord: number,
  tipChord: number,
  thickness: number,
  sweep: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const half = span / 2;
  const rootLe = rootChord * 0.32;
  const rootTe = -rootChord * 0.68;
  const tipLe = tipChord * 0.22 - sweep;
  const tipTe = -tipChord * 0.78 - sweep;
  shape.moveTo(0, rootLe);
  shape.lineTo(half, tipLe);
  shape.quadraticCurveTo(half + 0.08, (tipLe + tipTe) * 0.5, half, tipTe);
  shape.lineTo(0, rootTe);
  shape.lineTo(-half, tipTe);
  shape.quadraticCurveTo(-half - 0.08, (tipLe + tipTe) * 0.5, -half, tipLe);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.45,
    bevelSize: Math.min(0.1, thickness * 0.8),
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thickness * 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

function makeFin(
  height: number,
  root: number,
  tip: number,
  thickness: number,
  sweep: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(root * 0.25, 0);
  shape.lineTo(-sweep + tip * 0.2, height);
  shape.lineTo(-sweep - tip * 0.8, height * 0.92);
  shape.lineTo(-root * 0.75, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.3,
    bevelSize: 0.03,
    bevelSegments: 1,
    steps: 1,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(thickness * 0.5, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural single-engine aircraft built from lathed / extruded surfaces
 * rather than boxes, so the silhouette reads as a real airframe.
 *
 * CessnaSkyhawk: high-wing trainer, strut-braced, tricycle gear, white/teal.
 * Extra300: low-wing aerobat, clipped wings, dark/gold livery.
 */
export const PlaneModel = forwardRef<THREE.Group, PlaneModelProps>(
  function PlaneModel({ planeId, axes, flightState }, ref) {
    const isCessna = planeId === "CessnaSkyhawk";
    const propRef = useRef<THREE.Group>(null);
    const discRef = useRef<THREE.Mesh>(null);
    const bladesRef = useRef<THREE.Group>(null);
    const gearRef = useRef<THREE.Group>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const shakeRef = useRef<THREE.Group>(null);

    const colors = useMemo<Palette>(
      () =>
        isCessna
          ? {
              body: "#f4f7fb",
              accent: "#1a8fa4",
              trim: "#0c4e59",
              glass: "#8fd4e8",
              wing: "#eef3f8",
              stripe: "#d4532a",
              spinner: "#1a8fa4",
              interior: "#2a3340",
            }
          : {
              body: "#161c28",
              accent: "#e8a030",
              trim: "#6e4418",
              glass: "#6a8094",
              wing: "#1c2434",
              stripe: "#f0b040",
              spinner: "#e8a030",
              interior: "#0e1218",
            },
      [isCessna],
    );

    const fuselage = useMemo(() => makeFuselage(isCessna), [isCessna]);
    const wing = useMemo(
      () =>
        isCessna
          ? makeWing(8.4, 1.55, 0.95, 0.11, 0.12)
          : makeWing(6.5, 1.45, 0.72, 0.1, 0.28),
      [isCessna],
    );
    const stab = useMemo(
      () =>
        isCessna
          ? makeWing(2.85, 0.95, 0.62, 0.07, 0.18)
          : makeWing(2.45, 0.85, 0.5, 0.065, 0.22),
      [isCessna],
    );
    const fin = useMemo(
      () =>
        isCessna
          ? makeFin(1.35, 1.05, 0.55, 0.08, 0.28)
          : makeFin(1.15, 0.95, 0.48, 0.075, 0.32),
      [isCessna],
    );

    const wingY = isCessna ? 0.78 : -0.18;
    const wingZ = isCessna ? 0.05 : 0.12;
    const bladeCount = isCessna ? 2 : 3;
    const bladeLen = isCessna ? 1.15 : 1.02;

    useFrame((state, delta) => {
      const throttle = axes.current.throttle;
      const airborne = flightState.current.airborne;
      const rpm = 3 + throttle * 52;

      if (propRef.current) {
        propRef.current.rotation.z += delta * rpm;
      }
      if (bladesRef.current && discRef.current) {
        const blurred = throttle > 0.22;
        bladesRef.current.visible = !blurred;
        discRef.current.visible = blurred;
        const mat = discRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.18 + throttle * 0.28;
      }
      if (gearRef.current) {
        gearRef.current.visible = !airborne;
      }
      if (lightRef.current) {
        lightRef.current.intensity = airborne ? 0.15 : 0.55;
      }
      if (shakeRef.current) {
        const shake = throttle * 0.006;
        shakeRef.current.position.y =
          Math.sin(state.clock.elapsedTime * 67) * shake;
      }
    });

    return (
      <group ref={ref}>
        <group ref={shakeRef}>
          {/* Fuselage */}
          <mesh geometry={fuselage} castShadow>
            <meshStandardMaterial
              color={colors.body}
              metalness={0.22}
              roughness={0.38}
              envMapIntensity={0.6}
            />
          </mesh>

          {/* Nose cowl ring */}
          <mesh position={[0, 0.02, -2.18]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.045, 10, 24]} />
            <meshStandardMaterial
              color={colors.accent}
              metalness={0.45}
              roughness={0.32}
            />
          </mesh>

          {/* Spinner */}
          <mesh position={[0, 0.02, -2.42]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry
              args={[0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]}
            />
            <meshStandardMaterial
              color={colors.spinner}
              metalness={0.55}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, 0.02, -2.55]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.09, 0.22, 14]} />
            <meshStandardMaterial
              color={colors.spinner}
              metalness={0.55}
              roughness={0.25}
            />
          </mesh>

          {/* Propeller */}
          <group ref={propRef} position={[0, 0.02, -2.5]}>
            <group ref={bladesRef}>
              {(isCessna ? ["port", "starboard"] : ["a", "b", "c"]).map(
                (id, i) => (
                  <mesh
                    key={`blade-${id}`}
                    rotation={[0, 0, (i * Math.PI * 2) / bladeCount]}
                    position={[0, bladeLen * 0.42, 0]}
                  >
                    <boxGeometry args={[0.09, bladeLen, 0.025]} />
                    <meshStandardMaterial
                      color="#2c3036"
                      metalness={0.55}
                      roughness={0.35}
                    />
                  </mesh>
                ),
              )}
            </group>
            <mesh ref={discRef} visible={false} rotation={[0, 0, 0]}>
              <circleGeometry args={[bladeLen * 0.95, 32]} />
              <meshBasicMaterial
                color="#c8d0d8"
                transparent
                opacity={0.28}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>

          {/* Cockpit interior (dark, so the glass reads as a canopy) */}
          <mesh position={[0, 0.22, -0.15]}>
            <capsuleGeometry args={[0.22, 0.7, 4, 10]} />
            <meshStandardMaterial color={colors.interior} roughness={0.9} />
          </mesh>

          {/* Canopy */}
          <mesh
            position={[0, isCessna ? 0.48 : 0.42, isCessna ? -0.15 : -0.05]}
            rotation={[0.06, 0, 0]}
            scale={[1, 0.72, isCessna ? 1.15 : 1.05]}
          >
            <sphereGeometry
              args={[0.5, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]}
            />
            <meshStandardMaterial
              color={colors.glass}
              metalness={0.85}
              roughness={0.06}
              transparent
              opacity={0.48}
              envMapIntensity={1.2}
            />
          </mesh>
          {/* Windshield frame */}
          <mesh position={[0, 0.46, -0.58]} rotation={[0.55, 0, 0]}>
            <torusGeometry args={[0.32, 0.018, 6, 18, Math.PI]} />
            <meshStandardMaterial color={colors.trim} metalness={0.3} />
          </mesh>

          {/* Fuselage stripe */}
          <mesh position={[0, 0.02, 0.15]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.88, 0.07, 3.4]} />
            <meshStandardMaterial
              color={colors.stripe}
              metalness={0.25}
              roughness={0.45}
            />
          </mesh>
          <mesh position={[0, 0.02, 0.15]}>
            <boxGeometry args={[0.9, 0.035, 3.42]} />
            <meshStandardMaterial
              color={colors.accent}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>

          {/* Main wing */}
          <group position={[0, wingY, wingZ]}>
            <mesh geometry={wing} castShadow>
              <meshStandardMaterial
                color={colors.wing}
                metalness={0.18}
                roughness={0.46}
              />
            </mesh>
            {/* Leading-edge accent */}
            <mesh position={[0, 0.07, 0.42]}>
              <boxGeometry args={[isCessna ? 7.6 : 5.8, 0.02, 0.12]} />
              <meshStandardMaterial color={colors.accent} metalness={0.35} />
            </mesh>
            {/* Wingtip lights */}
            <mesh position={[isCessna ? 4.05 : 3.12, 0.08, 0.05]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#ff3030" />
            </mesh>
            <mesh position={[isCessna ? -4.05 : -3.12, 0.08, 0.05]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#30ff60" />
            </mesh>
          </group>

          {/* Cessna wing struts + jury struts */}
          {isCessna && (
            <>
              <mesh position={[1.55, 0.38, 0.1]} rotation={[0.05, 0, -0.42]}>
                <cylinderGeometry args={[0.03, 0.035, 1.15, 6]} />
                <meshStandardMaterial
                  color="#c5ccd3"
                  metalness={0.55}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[-1.55, 0.38, 0.1]} rotation={[0.05, 0, 0.42]}>
                <cylinderGeometry args={[0.03, 0.035, 1.15, 6]} />
                <meshStandardMaterial
                  color="#c5ccd3"
                  metalness={0.55}
                  roughness={0.3}
                />
              </mesh>
            </>
          )}

          {/* Horizontal stabilizer */}
          <group position={[0, isCessna ? 0.28 : 0.22, 2.42]}>
            <mesh geometry={stab} castShadow>
              <meshStandardMaterial
                color={colors.wing}
                metalness={0.18}
                roughness={0.46}
              />
            </mesh>
          </group>

          {/* Vertical fin + rudder stripe */}
          <group position={[0, 0.22, 2.38]}>
            <mesh geometry={fin} castShadow>
              <meshStandardMaterial
                color={colors.accent}
                metalness={0.28}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, 0.7, 0.28]}>
              <boxGeometry args={[0.04, 0.7, 0.12]} />
              <meshStandardMaterial color={colors.stripe} metalness={0.3} />
            </mesh>
          </group>

          {/* Exhaust stacks */}
          <mesh position={[0.2, -0.12, -1.55]} rotation={[1.2, 0, 0.15]}>
            <cylinderGeometry args={[0.035, 0.04, 0.28, 8]} />
            <meshStandardMaterial
              color="#3a3a3a"
              metalness={0.7}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[-0.2, -0.12, -1.55]} rotation={[1.2, 0, -0.15]}>
            <cylinderGeometry args={[0.035, 0.04, 0.28, 8]} />
            <meshStandardMaterial
              color="#3a3a3a"
              metalness={0.7}
              roughness={0.35}
            />
          </mesh>

          {/* Antenna */}
          <mesh position={[0, 0.72, 0.85]}>
            <cylinderGeometry args={[0.012, 0.012, 0.45, 5]} />
            <meshStandardMaterial color="#222" />
          </mesh>

          {/* Landing light */}
          <mesh position={[0.18, -0.05, -1.95]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#fff6d0" />
          </mesh>
          <pointLight
            ref={lightRef}
            position={[0, 0.1, -2.2]}
            color="#fff4d8"
            intensity={0.4}
            distance={18}
          />

          {/* Landing gear */}
          <group ref={gearRef}>
            <LandingGear
              x={isCessna ? 1.15 : 0.95}
              z={0.15}
              strutH={isCessna ? 0.92 : 0.88}
              colors={colors}
            />
            <LandingGear
              x={isCessna ? -1.15 : -0.95}
              z={0.15}
              strutH={isCessna ? 0.92 : 0.88}
              colors={colors}
            />
            <LandingGear x={0} z={-1.55} strutH={0.72} colors={colors} nose />
          </group>
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
  colors: Palette;
  nose?: boolean;
}) {
  const wheelR = nose ? 0.13 : 0.175;
  const contact = 1.05;
  const wheelY = -contact + wheelR;
  const strutLen = strutH;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, wheelY + wheelR + strutLen / 2, 0]}>
        <cylinderGeometry args={[0.028, 0.04, strutLen, 8]} />
        <meshStandardMaterial
          color="#b8c0c8"
          metalness={0.65}
          roughness={0.28}
        />
      </mesh>
      {!nose && (
        <mesh position={[x > 0 ? 0.06 : -0.06, wheelY + wheelR + 0.08, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.16]} />
          <meshStandardMaterial color={colors.trim} roughness={0.6} />
        </mesh>
      )}
      <mesh position={[0, wheelY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wheelR, wheelR, 0.11, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.92} />
      </mesh>
      <mesh position={[0, wheelY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wheelR * 0.45, wheelR * 0.45, 0.13, 10]} />
        <meshStandardMaterial
          color="#6a7078"
          metalness={0.55}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
