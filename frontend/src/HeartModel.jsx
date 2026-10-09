import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/heart_anatomy.glb";
useGLTF.preload(MODEL_URL);

// Which GLB nodes the ML layer is allowed to drive. Anything not listed here
// renders as inert tissue. Keep this list in sync with vessel_map.json.
const VESSEL_NODES = ["LAD", "LCX", "RCA"];
const NEUTRAL = "#c8c8cd";
const EMPTY_VESSEL_COLOR = "#b98b84";

// Everything the ML output does NOT drive. Veins get their own blue so nobody
// mistakes the great cardiac vein for a diseased artery, and the muscle stays
// translucent so the coronaries read clearly against it.
const STATIC_COLORS = {
  LeftMain:   { color: "#b85c52", opacity: 1.00 },
  Veins:      { color: "#3b6fb5", opacity: 0.95 },
  Conduction: { color: "#e0c070", opacity: 0.90 },
  Heart:      { color: "#b98b84", opacity: 0.38 },
};
const DEFAULT_STATIC = { color: "#b98b84", opacity: 0.45 };

/**
 * One cardiac cycle, t in [0,1).
 * Not a sine wave — a real beat is a fast ventricular squeeze followed by a
 * long relaxation, plus a small atrial kick just before the next beat.
 * That asymmetry is what makes it read as "alive" instead of "breathing".
 */
function beatEnvelope(t) {
  const ventricular = Math.exp(-Math.pow((t - 0.18) / 0.085, 2));
  const atrial = 0.22 * Math.exp(-Math.pow((t - 0.9) / 0.045, 2));
  return ventricular + atrial;
}

function Part({ geometry, color, opacity, isVessel, risk, name, onHover, onSelect, selected, hasPrediction }) {
  const matRef = useRef();
  const target = useMemo(() => new THREE.Color(color), [color]);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const m = matRef.current;
    if (!m) return;

    // Ease toward the predicted color instead of snapping.
    m.color.lerp(target, 1 - Math.pow(0.001, delta));

    // High-risk vessels glow in time with the beat only when a prediction exists
    if (isVessel && hasPrediction) {
      const t = (state.clock.elapsedTime % 1.2) / 1.2;
      const pulse = beatEnvelope(t);
      const strength = risk === "High" ? 0.85 : risk === "Moderate" ? 0.35 : 0.0;
      m.emissive.copy(target);
      m.emissiveIntensity = strength * pulse + (hovered ? 0.4 : 0) + (selected ? 0.3 : 0);
    } else {
      m.emissiveIntensity = 0;
    }
  });

  return (
    <mesh
      geometry={geometry}
      onPointerOver={isVessel ? (e) => { e.stopPropagation(); setHovered(true); onHover?.(name); } : undefined}
      onPointerOut={isVessel ? () => { setHovered(false); onHover?.(null); } : undefined}
      onClick={isVessel ? (e) => { e.stopPropagation(); onSelect?.(name, e.nativeEvent.clientX, e.nativeEvent.clientY); } : undefined}
    >
      <meshStandardMaterial
        ref={matRef}
        color={color}
        roughness={isVessel ? 0.35 : 0.72}
        metalness={0.05}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity > 0.9}
      />
    </mesh>
  );
}

export default function HeartModel({ prediction, bpm = 72, onHover, onSelect, selected, onHeartHover }) {
  const group = useRef();
  const { nodes } = useGLTF(MODEL_URL);

  useFrame((state) => {
    if (!group.current) return;
    if (!prediction || !bpm) {
      group.current.scale.set(1, 1, 1);
      return;
    }
    const period = 60 / bpm;
    const t = (state.clock.elapsedTime % period) / period;
    const s = 1 - 0.045 * beatEnvelope(t);
    group.current.scale.set(s, s, s);
  });

  const parts = useMemo(
    () => Object.entries(nodes).filter(([, n]) => n.isMesh && n.geometry),
    [nodes]
  );

  return (
<<<<<<< Updated upstream
    <group ref={group} dispose={null}>
=======
    <group
      ref={group}
      position={[0.25, 0, 0]}
      rotation={[-Math.PI / 2, Math.PI / 2, 0]}
      dispose={null}
      onPointerOver={(e) => { e.stopPropagation(); onHeartHover?.(true); }}
      onPointerOut={() => onHeartHover?.(false)}
    >
>>>>>>> Stashed changes
      {parts.map(([name, node]) => {
        const isVessel = VESSEL_NODES.includes(name);
        const v = prediction?.vessels?.[name];
        const stat = STATIC_COLORS[name] ?? DEFAULT_STATIC;
        const vesselColor = prediction ? (v?.color_hex ?? NEUTRAL) : EMPTY_VESSEL_COLOR;

        return (
          <Part
            key={name}
            name={name}
            geometry={node.geometry}
            isVessel={isVessel}
            hasPrediction={Boolean(prediction)}
            color={isVessel ? vesselColor : stat.color}
            opacity={isVessel ? (prediction ? 1 : 0.7) : stat.opacity}
            risk={v?.risk_level}
            onHover={onHover}
            onSelect={onSelect}
            selected={selected === name}
          />
        );
      })}
    </group>
  );
}
