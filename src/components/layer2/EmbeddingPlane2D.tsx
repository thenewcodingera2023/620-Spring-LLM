// 2D embedding plane. Renders documents, query, gradient arrow, and the level-set ray pair from
// the live Layer 2 state. The query tip is draggable via pointer events; the magnitude clamp is
// applied in the store, so this component never reasons about [0.1, 3.0] itself — it just hands
// the candidate math vector to setQuery and re-reads the (possibly clamped) value.

import { useRef } from 'react';
import { norm, vecScale } from '../../math/linalg';
import type { Vector } from '../../math/types';
import type { Layer2State } from '../../state/layer2Store';

const PIXEL_SIZE = 440;
const HALF = PIXEL_SIZE / 2;
const EXTENT = 3.4; // math half-extent: keeps q at max magnitude (3.0) visible with a small margin
const SCALE = HALF / EXTENT;

const GRADIENT_TARGET_LEN = 0.8; // math units; visualized gradient length
const RAY_DRAW_LEN_MULT = 1.1 * EXTENT; // extend rays slightly past the visible extent

interface EmbeddingPlane2DProps {
  state: Layer2State;
  /** Caption rendered below the plane. */
  caption?: string;
}

function mathToScreen(v: Vector): { x: number; y: number } {
  return { x: HALF + v[0] * SCALE, y: HALF - v[1] * SCALE };
}

function screenToMath(px: number, py: number): Vector {
  return [(px - HALF) / SCALE, (HALF - py) / SCALE];
}

export function EmbeddingPlane2D({ state, caption }: EmbeddingPlane2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    documents,
    documentLabels,
    query,
    selectedIndex,
    selectedDocument,
    selectedGradient,
    selectedLevelSetRays,
    showLevelSet,
    dragging,
    setQuery,
    selectDocument,
    startDragging,
    stopDragging,
    clamp,
    angles,
  } = state;

  const origin = mathToScreen([0, 0]);
  const qTip = mathToScreen(query);

  // Compute scaled gradient arrow tip.
  let gradArrow: { tip: { x: number; y: number }; scale: number } | null = null;
  if (selectedGradient) {
    const gMag = norm(selectedGradient);
    if (gMag > 1e-9 && Number.isFinite(gMag)) {
      const arrowScale = GRADIENT_TARGET_LEN / gMag;
      const scaled = vecScale(selectedGradient, arrowScale);
      const tipMath: Vector = [query[0] + scaled[0], query[1] + scaled[1]];
      gradArrow = { tip: mathToScreen(tipMath), scale: arrowScale };
    }
  }

  // Level-set ray endpoints.
  let levelSet: { p1: { x: number; y: number }; p2: { x: number; y: number } } | null = null;
  if (showLevelSet && selectedLevelSetRays) {
    const r = RAY_DRAW_LEN_MULT;
    levelSet = {
      p1: mathToScreen([selectedLevelSetRays.ray1[0] * r, selectedLevelSetRays.ray1[1] * r]),
      p2: mathToScreen([selectedLevelSetRays.ray2[0] * r, selectedLevelSetRays.ray2[1] * r]),
    };
  }

  // Pointer event helpers.
  function pointerToMath(event: React.PointerEvent<Element>): Vector | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const px = ((event.clientX - rect.left) / rect.width) * PIXEL_SIZE;
    const py = ((event.clientY - rect.top) / rect.height) * PIXEL_SIZE;
    return screenToMath(px, py);
  }

  function handlePointerDown(event: React.PointerEvent<SVGElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startDragging();
    const m = pointerToMath(event);
    if (m) setQuery(m);
  }

  function handlePointerMove(event: React.PointerEvent<SVGElement>) {
    if (!dragging) return;
    const m = pointerToMath(event);
    if (m) setQuery(m);
  }

  function handlePointerUp(event: React.PointerEvent<SVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopDragging();
  }

  // Grid lines.
  const gridIndices: number[] = [];
  const maxInt = Math.floor(EXTENT);
  for (let i = -maxInt; i <= maxInt; i++) gridIndices.push(i);
  const gridStep = SCALE; // one math unit in pixels

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label="2D embedding plane"
        viewBox={`0 0 ${PIXEL_SIZE} ${PIXEL_SIZE}`}
        className="w-full h-auto select-none"
      >
        <defs>
          <marker
            id="l2-doc-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4a5360" />
          </marker>
          <marker
            id="l2-doc-arrow-selected"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#117a6a" />
          </marker>
          <marker
            id="l2-query-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e4fb6" />
          </marker>
          <marker
            id="l2-grad-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#117a6a" />
          </marker>
        </defs>

        <rect x={0} y={0} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#ffffff" />

        {/* Grid */}
        <g aria-hidden="true">
          {gridIndices.map((i) =>
            i === 0 ? null : (
              <g key={`grid-${i}`}>
                <line
                  x1={0}
                  x2={PIXEL_SIZE}
                  y1={HALF - i * gridStep}
                  y2={HALF - i * gridStep}
                  stroke="#f0ece4"
                  strokeWidth={1}
                />
                <line
                  x1={HALF + i * gridStep}
                  x2={HALF + i * gridStep}
                  y1={0}
                  y2={PIXEL_SIZE}
                  stroke="#f0ece4"
                  strokeWidth={1}
                />
              </g>
            ),
          )}
        </g>

        {/* Axes */}
        <g aria-hidden="true">
          <line x1={0} y1={HALF} x2={PIXEL_SIZE} y2={HALF} stroke="#c8c2b6" strokeWidth={1} />
          <line x1={HALF} y1={0} x2={HALF} y2={PIXEL_SIZE} stroke="#c8c2b6" strokeWidth={1} />
          <text
            x={PIXEL_SIZE - 6}
            y={HALF - 6}
            textAnchor="end"
            fontSize={11}
            fill="#7a828d"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          >
            x_1
          </text>
          <text
            x={HALF + 6}
            y={12}
            fontSize={11}
            fill="#7a828d"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          >
            x_2
          </text>
        </g>

        {/* Magnitude clamp guides */}
        <g aria-hidden="true">
          <circle
            cx={HALF}
            cy={HALF}
            r={clamp.min * SCALE}
            fill="none"
            stroke="#7a828d"
            strokeOpacity={0.45}
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <circle
            cx={HALF}
            cy={HALF}
            r={clamp.max * SCALE}
            fill="none"
            stroke="#7a828d"
            strokeOpacity={0.25}
            strokeDasharray="2 5"
            strokeWidth={1}
          />
          <text
            x={HALF + clamp.min * SCALE + 6}
            y={HALF + 12}
            fontSize={9}
            fill="#7a828d"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          >
            ||q|| ≥ {clamp.min}
          </text>
        </g>

        {/* Level-set rays (drawn behind documents) */}
        {levelSet ? (
          <g aria-label="level set rays">
            <line
              x1={origin.x}
              y1={origin.y}
              x2={levelSet.p1.x}
              y2={levelSet.p1.y}
              stroke="#117a6a"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <line
              x1={origin.x}
              y1={origin.y}
              x2={levelSet.p2.x}
              y2={levelSet.p2.y}
              stroke="#117a6a"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            {state.selectedCosine !== null ? (
              <text
                x={12}
                y={PIXEL_SIZE - 14}
                fontSize={10}
                fill="#117a6a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              >
                level set: cos = {state.selectedCosine.toFixed(3)}
              </text>
            ) : null}
          </g>
        ) : null}

        {/* Document arrows */}
        {documents.map((d, i) => {
          const tip = mathToScreen(d);
          const selected = i === selectedIndex;
          return (
            <g
              key={`doc-${i}`}
              onClick={() => selectDocument(i)}
              role="button"
              tabIndex={0}
              aria-label={`Document ${documentLabels[i]}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectDocument(i);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <line
                x1={origin.x}
                y1={origin.y}
                x2={tip.x}
                y2={tip.y}
                stroke={selected ? '#117a6a' : '#4a5360'}
                strokeWidth={selected ? 2.25 : 1.5}
                markerEnd={selected ? 'url(#l2-doc-arrow-selected)' : 'url(#l2-doc-arrow)'}
              />
              <circle cx={tip.x} cy={tip.y} r={5} fill={selected ? '#117a6a' : '#4a5360'} />
              <text
                x={tip.x + 8}
                y={tip.y + (tip.y > HALF ? 14 : -6)}
                fontSize={11}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fill={selected ? '#117a6a' : '#4a5360'}
                fontWeight={selected ? 600 : 400}
              >
                {documentLabels[i]}
                {selected ? `  θ=${((angles[i] * 180) / Math.PI).toFixed(0)}°` : ''}
              </text>
            </g>
          );
        })}

        {/* Query arrow */}
        <g aria-label="query vector">
          <line
            x1={origin.x}
            y1={origin.y}
            x2={qTip.x}
            y2={qTip.y}
            stroke="#1e4fb6"
            strokeWidth={2.25}
            markerEnd="url(#l2-query-arrow)"
          />
          <text
            x={qTip.x + 10}
            y={qTip.y - 10}
            fontSize={12}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fill="#1e4fb6"
            fontWeight={600}
          >
            q
          </text>
        </g>

        {/* Gradient arrow */}
        {gradArrow ? (
          <g aria-label="gradient arrow">
            <line
              x1={qTip.x}
              y1={qTip.y}
              x2={gradArrow.tip.x}
              y2={gradArrow.tip.y}
              stroke="#117a6a"
              strokeWidth={2}
              markerEnd="url(#l2-grad-arrow)"
            />
            <text
              x={(qTip.x + gradArrow.tip.x) / 2 + 6}
              y={(qTip.y + gradArrow.tip.y) / 2 - 6}
              fontSize={10}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              fill="#117a6a"
            >
              ∇q cos · ×{gradArrow.scale.toFixed(2)}
            </text>
          </g>
        ) : null}
        {selectedDocument && !gradArrow ? (
          <text
            x={qTip.x + 10}
            y={qTip.y + 18}
            fontSize={9}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fill="#117a6a"
          >
            ∇q cos ≈ 0
          </text>
        ) : null}

        {/* Drag handle for q tip (visible circle + larger transparent hit area) */}
        <circle
          aria-label="query drag handle"
          cx={qTip.x}
          cy={qTip.y}
          r={16}
          fill="transparent"
          style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <circle
          cx={qTip.x}
          cy={qTip.y}
          r={6}
          fill="#1e4fb6"
          stroke="#ffffff"
          strokeWidth={2}
          pointerEvents="none"
        />

        {/* Origin dot */}
        <circle cx={origin.x} cy={origin.y} r={2.5} fill="#4a5360" pointerEvents="none" />
      </svg>

      {caption ? <p className="mt-2 text-xs text-ink-subtle">{caption}</p> : null}
    </div>
  );
}
