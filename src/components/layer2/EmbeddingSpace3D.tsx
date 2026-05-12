// Stage 6 — 3D retrieval scene.
//
// React Three Fiber scene that renders origin, 3 labeled axes, 4 fixed document vectors, the
// query vector, and (when a document is selected) a gradient arrow at the query tip. Manipulation
// is via x/y/z sliders in QueryVectorControls3D — there is no in-canvas drag.
//
// The component is intentionally restrained: ambient + a single directional light, simple
// MeshStandardMaterial with no glow, sprite labels via a generated canvas texture (no drei).
// The math is computed in the store; this file is pure rendering.

import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { norm, vecScale } from '../../math/linalg';
import type { Layer2State } from '../../state/layer2Store';

const AXIS_LENGTH = 3.2;
const GRADIENT_TARGET_LEN = 0.8;

const COLOR_AXIS = '#7a828d';
const COLOR_AXIS_X = '#b04a16';
const COLOR_AXIS_Y = '#117a6a';
const COLOR_AXIS_Z = '#1e4fb6';
const COLOR_DOC = '#4a5360';
const COLOR_DOC_SELECTED = '#117a6a';
const COLOR_QUERY = '#1e4fb6';
const COLOR_GRADIENT = '#117a6a';

function makeLabelTexture(text: string, color: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.font = 'bold 56px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface LabelProps {
  position: [number, number, number];
  text: string;
  color?: string;
}

function Label({ position, text, color = '#111418' }: LabelProps) {
  const texture = useMemo(() => makeLabelTexture(text, color), [text, color]);
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);
  return (
    <sprite position={position} scale={[0.55, 0.55, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

interface ArrowProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  thickness?: number;
}

function Arrow({ from, to, color, thickness = 0.03 }: ArrowProps) {
  const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = dir.length();
  if (length < 1e-6) return null;
  dir.normalize();
  const headLen = Math.min(0.18, length * 0.3);
  const shaftLen = Math.max(length - headLen, 0.001);

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const rotation = new THREE.Euler().setFromQuaternion(quaternion);

  // Shaft is positioned so its base is at `from` and runs toward `to`.
  const shaftCenter = new THREE.Vector3().copy(dir).multiplyScalar(shaftLen / 2).add(new THREE.Vector3(...from));
  const headCenter = new THREE.Vector3().copy(dir).multiplyScalar(shaftLen + headLen / 2).add(new THREE.Vector3(...from));

  return (
    <group>
      <mesh position={[shaftCenter.x, shaftCenter.y, shaftCenter.z]} rotation={rotation}>
        <cylinderGeometry args={[thickness, thickness, shaftLen, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[headCenter.x, headCenter.y, headCenter.z]} rotation={rotation}>
        <coneGeometry args={[thickness * 2.6, headLen, 14]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </mesh>
    </group>
  );
}

function AxesAndGrid() {
  const tickValues = [-3, -2, -1, 1, 2, 3];
  return (
    <group>
      {/* origin marker */}
      <mesh>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#4a5360" />
      </mesh>

      {/* x-axis (red-ish) */}
      <Arrow from={[-AXIS_LENGTH, 0, 0]} to={[AXIS_LENGTH, 0, 0]} color={COLOR_AXIS_X} thickness={0.015} />
      {/* y-axis (teal) */}
      <Arrow from={[0, -AXIS_LENGTH, 0]} to={[0, AXIS_LENGTH, 0]} color={COLOR_AXIS_Y} thickness={0.015} />
      {/* z-axis (blue) */}
      <Arrow from={[0, 0, -AXIS_LENGTH]} to={[0, 0, AXIS_LENGTH]} color={COLOR_AXIS_Z} thickness={0.015} />

      <Label position={[AXIS_LENGTH + 0.3, 0, 0]} text="x_1" color={COLOR_AXIS_X} />
      <Label position={[0, AXIS_LENGTH + 0.3, 0]} text="x_2" color={COLOR_AXIS_Y} />
      <Label position={[0, 0, AXIS_LENGTH + 0.3]} text="x_3" color={COLOR_AXIS_Z} />

      {/* tick markers along each axis */}
      {tickValues.map((t) => (
        <group key={`tick-${t}`}>
          <mesh position={[t, 0, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={COLOR_AXIS} />
          </mesh>
          <mesh position={[0, t, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={COLOR_AXIS} />
          </mesh>
          <mesh position={[0, 0, t]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={COLOR_AXIS} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface SceneProps {
  state: Layer2State;
}

function Scene({ state }: SceneProps) {
  const documents = state.documents3D;
  const labels = state.documentLabels;
  const selectedIndex = state.selectedIndex;
  const q = state.query3D;
  const gradient = state.selectedGradient;

  let gradTip: [number, number, number] | null = null;
  let gradScale: number | null = null;
  if (gradient && gradient.length === 3) {
    const gMag = norm(gradient);
    if (gMag > 1e-9 && Number.isFinite(gMag)) {
      gradScale = GRADIENT_TARGET_LEN / gMag;
      const scaled = vecScale(gradient, gradScale);
      gradTip = [q[0] + scaled[0], q[1] + scaled[1], q[2] + scaled[2]];
    }
  }

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={0.55} />
      <AxesAndGrid />

      {documents.map((d, i) => {
        const selected = i === selectedIndex;
        return (
          <group
            key={`doc-${i}`}
            onClick={(e) => {
              e.stopPropagation();
              state.selectDocument(i);
            }}
          >
            <Arrow
              from={[0, 0, 0]}
              to={[d[0], d[1], d[2]]}
              color={selected ? COLOR_DOC_SELECTED : COLOR_DOC}
              thickness={selected ? 0.04 : 0.028}
            />
            <Label
              position={[d[0] * 1.12 + 0.1, d[1] * 1.12 + 0.1, d[2] * 1.12]}
              text={labels[i]}
              color={selected ? COLOR_DOC_SELECTED : COLOR_DOC}
            />
          </group>
        );
      })}

      {/* query arrow */}
      <Arrow from={[0, 0, 0]} to={[q[0], q[1], q[2]]} color={COLOR_QUERY} thickness={0.045} />
      <Label position={[q[0] * 1.08 + 0.1, q[1] * 1.08 + 0.15, q[2] * 1.08]} text="q" color={COLOR_QUERY} />

      {/* gradient arrow at q tip */}
      {gradTip ? (
        <Arrow
          from={[q[0], q[1], q[2]]}
          to={gradTip}
          color={COLOR_GRADIENT}
          thickness={0.035}
        />
      ) : null}
    </>
  );
}

interface EmbeddingSpace3DProps {
  state: Layer2State;
  caption?: string;
}

export function EmbeddingSpace3D({ state, caption }: EmbeddingSpace3DProps) {
  return (
    <div className="w-full">
      <div
        aria-label="3D embedding space"
        role="img"
        className="w-full bg-paper-panel rounded-md border border-paper-rule"
        style={{ height: 440 }}
      >
        <Canvas
          camera={{ position: [3.8, 2.8, 4.2], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#ffffff']} />
          <Scene state={state} />
        </Canvas>
      </div>
      {caption ? <p className="mt-2 text-xs text-ink-subtle">{caption}</p> : null}
    </div>
  );
}

export default EmbeddingSpace3D;
