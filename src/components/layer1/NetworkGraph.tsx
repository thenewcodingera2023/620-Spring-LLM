// SVG network for the locked [2, 3, 2] sample. Renders nodes and forward edges from a
// Layer1State; backward arrows live in BackwardOverlay. The component does NOT compute math:
// it formats values that came from the tested forward/backward functions.

import type { Layer1State, SelectedElement } from '../../state/layer1Store';
import { BackwardOverlay } from './BackwardOverlay';
import { EdgeWeightLabel } from './EdgeWeightLabel';
import { NodeForwardCard } from './NodeForwardCard';

const W = 880;
const H = 540;

const COLUMN_X = {
  input: 95,
  hidden: 350,
  output: 605,
  loss: 800,
} as const;

const INPUT_Y = [200, 340];
const HIDDEN_Y = [120, 260, 400];
const OUTPUT_Y = [200, 340];
const LOSS_Y = 270;

const CARD_HALF_W = 55;

interface NetworkGraphProps {
  state: Layer1State;
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return (value >= 0 ? '+' : '') + value.toFixed(3);
}

function isSelected(selected: SelectedElement | null, candidate: SelectedElement): boolean {
  if (!selected || selected.kind !== candidate.kind) return false;
  if (selected.kind === 'input' && candidate.kind === 'input')
    return selected.index === candidate.index;
  if (selected.kind === 'hidden' && candidate.kind === 'hidden')
    return selected.index === candidate.index;
  if (selected.kind === 'output' && candidate.kind === 'output')
    return selected.index === candidate.index;
  if (selected.kind === 'loss' && candidate.kind === 'loss') return true;
  if (selected.kind === 'edge-fwd' && candidate.kind === 'edge-fwd')
    return (
      selected.layer === candidate.layer &&
      selected.row === candidate.row &&
      selected.col === candidate.col
    );
  return false;
}

export function NetworkGraph({ state }: NetworkGraphProps) {
  const { spec, x, fwd, visibility, selected, select, sigmaPrime, back } = state;
  const W1 = spec.layers[0].W;
  const W2 = spec.layers[1].W;

  const inputCount = Math.min(x.length, INPUT_Y.length);
  const hiddenCount = Math.min(spec.layers[0].b.length, HIDDEN_Y.length);
  const outputCount = Math.min(spec.layers[1].b.length, OUTPUT_Y.length);

  // Forward edges with their static weight values.
  const edges: {
    key: string;
    layer: 0 | 1 | 2;
    row: number;
    col: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    weight: number;
  }[] = [];

  for (let j = 0; j < hiddenCount; j++) {
    for (let i = 0; i < inputCount; i++) {
      edges.push({
        key: `i${i}-h${j}`,
        layer: 0,
        row: j,
        col: i,
        x1: COLUMN_X.input + CARD_HALF_W,
        y1: INPUT_Y[i],
        x2: COLUMN_X.hidden - CARD_HALF_W,
        y2: HIDDEN_Y[j],
        weight: W1[j][i],
      });
    }
  }
  for (let k = 0; k < outputCount; k++) {
    for (let j = 0; j < hiddenCount; j++) {
      edges.push({
        key: `h${j}-o${k}`,
        layer: 1,
        row: k,
        col: j,
        x1: COLUMN_X.hidden + CARD_HALF_W,
        y1: HIDDEN_Y[j],
        x2: COLUMN_X.output - CARD_HALF_W,
        y2: OUTPUT_Y[k],
        weight: W2[k][j],
      });
    }
  }

  return (
    <div className="w-full overflow-x-auto" aria-label="Network graph viewport">
      <svg
        role="img"
        aria-label="Two-three-two feedforward network"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ minWidth: 640 }}
      >
      <defs>
        <marker
          id="layer1-fwd-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e4fb6" opacity={0.7} />
        </marker>
      </defs>

      {/* Column headers */}
      <g fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" fontSize={11}>
        <text x={COLUMN_X.input} y={36} textAnchor="middle" fill="#7a828d">
          input  x
        </text>
        <text x={COLUMN_X.hidden} y={36} textAnchor="middle" fill="#7a828d">
          hidden  z_1 / h_1
        </text>
        <text x={COLUMN_X.output} y={36} textAnchor="middle" fill="#7a828d">
          output  yHat
        </text>
        <text x={COLUMN_X.loss} y={36} textAnchor="middle" fill="#7a828d">
          loss  L
        </text>
        <text x={COLUMN_X.loss} y={52} textAnchor="middle" fill="#b04a16" fontSize={10}>
          target y = [+1, 0]
        </text>
      </g>

      {/* Forward edges */}
      <g>
        {edges.map((edge) => {
          const sel = isSelected(selected, {
            kind: 'edge-fwd',
            layer: edge.layer as 0 | 1,
            row: edge.row,
            col: edge.col,
          });
          return (
            <line
              key={`line-${edge.key}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={sel ? '#1e4fb6' : '#1e4fb6'}
              strokeOpacity={sel ? 1 : 0.35}
              strokeWidth={sel ? 2 : 1.25}
              markerEnd="url(#layer1-fwd-arrow)"
            />
          );
        })}
      </g>

      {/* output -> loss arrows (the loss aggregates yHat) */}
      <g>
        {Array.from({ length: outputCount }).map((_, k) => (
          <line
            key={`out-loss-${k}`}
            x1={COLUMN_X.output + CARD_HALF_W}
            y1={OUTPUT_Y[k]}
            x2={COLUMN_X.loss - 36}
            y2={LOSS_Y}
            stroke="#1e4fb6"
            strokeOpacity={0.35}
            strokeWidth={1.25}
            markerEnd="url(#layer1-fwd-arrow)"
          />
        ))}
      </g>

      {/* Edge weight labels */}
      <g>
        {edges.map((edge) => {
          const mx = (edge.x1 + edge.x2) / 2;
          const my = (edge.y1 + edge.y2) / 2;
          const sel = isSelected(selected, {
            kind: 'edge-fwd',
            layer: edge.layer as 0 | 1,
            row: edge.row,
            col: edge.col,
          });
          return (
            <EdgeWeightLabel
              key={`label-${edge.key}`}
              x={mx}
              y={my}
              weight={edge.weight}
              selected={sel}
              ariaLabel={`Weight W_${edge.layer + 1}[${edge.row}, ${edge.col}] = ${edge.weight.toFixed(3)}`}
              onClick={() =>
                select({ kind: 'edge-fwd', layer: edge.layer as 0 | 1, row: edge.row, col: edge.col })
              }
            />
          );
        })}
      </g>

      {/* Backward overlay */}
      <BackwardOverlay
        state={state}
        layout={{
          inputX: COLUMN_X.input,
          hiddenX: COLUMN_X.hidden,
          outputX: COLUMN_X.output,
          lossX: COLUMN_X.loss,
          cardHalfWidth: CARD_HALF_W,
          inputY: INPUT_Y.slice(0, inputCount),
          hiddenY: HIDDEN_Y.slice(0, hiddenCount),
          outputY: OUTPUT_Y.slice(0, outputCount),
          lossY: LOSS_Y,
        }}
      />

      {/* Input nodes */}
      {x.slice(0, inputCount).map((value, i) => {
        const sel = isSelected(selected, { kind: 'input', index: i });
        const grad =
          visibility.hiddenGrads && back.dxIn[i] !== undefined
            ? `dL/dx[${i}]=${fmt(back.dxIn[i])}`
            : null;
        return (
          <NodeForwardCard
            key={`input-${i}`}
            cx={COLUMN_X.input}
            cy={INPUT_Y[i]}
            role="input"
            label={`x[${i}]`}
            primary={fmt(value)}
            selected={sel}
            gradientText={grad}
            onClick={() => select({ kind: 'input', index: i })}
            ariaLabel={`Input x[${i}] = ${value.toFixed(3)}`}
          />
        );
      })}

      {/* Hidden nodes */}
      {Array.from({ length: hiddenCount }).map((_, j) => {
        const z = visibility.z1 ? fwd.z[0][j] : null;
        const h = visibility.h1 ? fwd.h[0][j] : null;
        const gate = visibility.h1 ? ((sigmaPrime[0][j] === 1 ? 1 : 0) as 0 | 1) : null;
        const sel = isSelected(selected, { kind: 'hidden', index: j });
        return (
          <NodeForwardCard
            key={`hidden-${j}`}
            cx={COLUMN_X.hidden}
            cy={HIDDEN_Y[j]}
            role="hidden"
            label={`z_1[${j}] / h_1[${j}]`}
            primary={fmt(z)}
            secondary={fmt(h)}
            reluGate={gate}
            selected={sel}
            dimmed={!visibility.z1}
            onClick={() => select({ kind: 'hidden', index: j })}
            ariaLabel={`Hidden node ${j}`}
          />
        );
      })}

      {/* Output nodes (with teaching labels rendered alongside) */}
      {Array.from({ length: outputCount }).map((_, k) => {
        const v = visibility.yHat ? fwd.yHat[k] : null;
        const sel = isSelected(selected, { kind: 'output', index: k });
        const teachingLabel = state.outputLabels[k] ?? '';
        return (
          <g key={`output-${k}`}>
            <NodeForwardCard
              cx={COLUMN_X.output}
              cy={OUTPUT_Y[k]}
              role="output"
              label={`yHat[${k}]`}
              primary={fmt(v)}
              selected={sel}
              dimmed={!visibility.yHat}
              onClick={() => select({ kind: 'output', index: k })}
              ariaLabel={`Output yHat[${k}]`}
            />
            {teachingLabel ? (
              <text
                x={COLUMN_X.output}
                y={OUTPUT_Y[k] + 50}
                textAnchor="middle"
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fill="#7a828d"
                opacity={visibility.yHat ? 1 : 0.55}
              >
                "{teachingLabel}"
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Loss node */}
      <NodeForwardCard
        cx={COLUMN_X.loss}
        cy={LOSS_Y}
        role="loss"
        label="L"
        primary={visibility.loss ? fmt(fwd.loss) : '—'}
        selected={isSelected(selected, { kind: 'loss' })}
        dimmed={!visibility.loss}
        width={92}
        onClick={() => select({ kind: 'loss' })}
        ariaLabel="Loss node L"
      />
      </svg>
    </div>
  );
}
