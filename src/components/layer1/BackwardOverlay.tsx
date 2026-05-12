// Backward-pass arrows. Drawn as orange dashed strokes pointing in the reverse direction of the
// forward edges, with summary labels rendered between layers. The overlay reads from the
// Layer1State; it never invents math values.

import type { Layer1State } from '../../state/layer1Store';

const ARROW_COLOR = '#b04a16';

interface BackwardOverlayProps {
  state: Layer1State;
  /** Layout coordinates passed in from NetworkGraph so the overlay stays consistent with nodes. */
  layout: {
    inputX: number;
    hiddenX: number;
    outputX: number;
    lossX: number;
    cardHalfWidth: number;
    inputY: number[];
    hiddenY: number[];
    outputY: number[];
    lossY: number;
  };
}

export function BackwardOverlay({ state, layout }: BackwardOverlayProps) {
  const { visibility, back } = state;
  const { inputX, hiddenX, outputX, lossX, cardHalfWidth, inputY, hiddenY, outputY, lossY } =
    layout;

  // Each arrow is drawn parallel to (and below) the matching forward edge so they coexist
  // visually without overlap. We offset the y endpoints by a few pixels.
  const offset = 12;

  const showLossToOutput = visibility.backwardOutput;
  const showOutputToHidden = visibility.outputGrads;
  const showHiddenGate = visibility.hiddenGate;
  const showHiddenToInput = visibility.hiddenGrads;

  return (
    <g aria-label="backward pass overlay">
      <defs>
        <marker
          id="layer1-back-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ARROW_COLOR} />
        </marker>
      </defs>

      {/* loss -> output, dL/dyHat */}
      {showLossToOutput
        ? outputY.map((oy, k) => (
            <g key={`loss-back-${k}`}>
              <line
                x1={lossX - 36}
                y1={lossY + offset}
                x2={outputX + cardHalfWidth + 4}
                y2={oy + offset}
                stroke={ARROW_COLOR}
                strokeWidth={1.4}
                strokeDasharray="5 4"
                markerEnd="url(#layer1-back-arrow)"
                opacity={0.9}
              />
              <text
                x={(lossX - 36 + outputX + cardHalfWidth) / 2}
                y={(lossY + oy) / 2 + offset - 4}
                textAnchor="middle"
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fill={ARROW_COLOR}
              >
                {`dL/dyHat[${k}]=${(back.dyHat[k] >= 0 ? '+' : '') + back.dyHat[k].toFixed(2)}`}
              </text>
            </g>
          ))
        : null}

      {/* output -> hidden, dL/dh_1 (one summary arrow per output, to keep the canvas readable) */}
      {showOutputToHidden
        ? outputY.map((oy, k) => (
            <line
              key={`out-back-${k}`}
              x1={outputX - cardHalfWidth - 4}
              y1={oy + offset}
              x2={hiddenX + cardHalfWidth + 4}
              y2={hiddenY[Math.min(k, hiddenY.length - 1)] + offset}
              stroke={ARROW_COLOR}
              strokeWidth={1.2}
              strokeDasharray="5 4"
              markerEnd="url(#layer1-back-arrow)"
              opacity={0.6}
            />
          ))
        : null}

      {/* hidden gate badge: render dL/dz_1[k] near each hidden node */}
      {showHiddenGate
        ? hiddenY.map((hy, k) => (
            <g key={`hidden-gate-${k}`}>
              <rect
                x={hiddenX - cardHalfWidth - 60}
                y={hy + 22}
                width={56}
                height={16}
                rx={3}
                ry={3}
                fill="#fff7f0"
                stroke="#f5e2d2"
                strokeWidth={0.75}
              />
              <text
                x={hiddenX - cardHalfWidth - 60 + 28}
                y={hy + 33}
                textAnchor="middle"
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fill={ARROW_COLOR}
              >
                {`dL/dz_1[${k}]=${(back.dz[0][k] >= 0 ? '+' : '') + back.dz[0][k].toFixed(2)}`}
              </text>
            </g>
          ))
        : null}

      {/* hidden -> input, dL/dx */}
      {showHiddenToInput
        ? inputY.map((iy, i) => (
            <line
              key={`hid-back-${i}`}
              x1={hiddenX - cardHalfWidth - 4}
              y1={hiddenY[Math.min(i, hiddenY.length - 1)] + offset}
              x2={inputX + cardHalfWidth + 4}
              y2={iy + offset}
              stroke={ARROW_COLOR}
              strokeWidth={1.2}
              strokeDasharray="5 4"
              markerEnd="url(#layer1-back-arrow)"
              opacity={0.6}
            />
          ))
        : null}

    </g>
  );
}
