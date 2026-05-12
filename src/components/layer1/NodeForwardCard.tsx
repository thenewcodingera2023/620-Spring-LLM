// Single network node, rendered as an SVG <g>. For a hidden ReLU node the card splits into a
// pre-activation row (z_l[k]) and an activation row (h_l[k]); other roles render a single value.
// Selection draws a thicker forward-color ring; click surfaces are keyboard accessible via
// SVG's native focusable behaviour from <g tabIndex>.

export type NodeRole = 'input' | 'hidden' | 'output' | 'loss';

interface NodeForwardCardProps {
  cx: number;
  cy: number;
  width?: number;
  height?: number;
  role: NodeRole;
  /** Header label, e.g. "x[0]", "z_1[0] / h_1[0]", "yHat[0]", "L". */
  label: string;
  /** Top-line value for non-hidden nodes; pre-activation z_l[k] for hidden nodes. */
  primary?: string;
  /** Activation h_l[k] for hidden nodes only. */
  secondary?: string;
  /** Optional ReLU' gate indicator (only meaningful for hidden role). 0 = dead, 1 = firing. */
  reluGate?: 0 | 1 | null;
  /** Optional gradient string rendered below the node (e.g. dL/dh_1[k]). */
  gradientText?: string | null;
  selected?: boolean;
  /** Visually dim the card (used when its value is not yet revealed by the current step). */
  dimmed?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

const roleStyles: Record<
  NodeRole,
  { fill: string; stroke: string; labelFill: string; valueFill: string; selectedStroke: string }
> = {
  input: {
    fill: '#ffffff',
    stroke: '#e6e2db',
    labelFill: '#7a828d',
    valueFill: '#0b0d10',
    selectedStroke: '#1e4fb6',
  },
  hidden: {
    fill: '#ffffff',
    stroke: '#dde6f6',
    labelFill: '#1e4fb6',
    valueFill: '#0b0d10',
    selectedStroke: '#1e4fb6',
  },
  output: {
    fill: '#ffffff',
    stroke: '#dde6f6',
    labelFill: '#1e4fb6',
    valueFill: '#0b0d10',
    selectedStroke: '#1e4fb6',
  },
  loss: {
    fill: '#fff7f0',
    stroke: '#f5e2d2',
    labelFill: '#b04a16',
    valueFill: '#0b0d10',
    selectedStroke: '#b04a16',
  },
};

export function NodeForwardCard({
  cx,
  cy,
  width = 110,
  height = 64,
  role,
  label,
  primary,
  secondary,
  reluGate = null,
  gradientText = null,
  selected = false,
  dimmed = false,
  onClick,
  ariaLabel,
}: NodeForwardCardProps) {
  const isHidden = role === 'hidden';
  const cardHeight = isHidden ? height + 22 : height;
  const x = cx - width / 2;
  const y = cy - cardHeight / 2;
  const tone = roleStyles[role];

  return (
    <g
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel ?? label}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      opacity={dimmed ? 0.55 : 1}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={cardHeight}
        rx={9}
        ry={9}
        fill={tone.fill}
        stroke={selected ? tone.selectedStroke : tone.stroke}
        strokeWidth={selected ? 2.25 : 1.25}
      />
      <text
        x={cx}
        y={y + 17}
        textAnchor="middle"
        fontSize={11}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        fill={tone.labelFill}
      >
        {label}
      </text>

      {isHidden ? (
        <>
          <text
            x={cx}
            y={y + 38}
            textAnchor="middle"
            fontSize={13}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fill={tone.valueFill}
          >
            {primary ?? '—'}
          </text>
          <line
            x1={x + 12}
            y1={y + 46}
            x2={x + width - 12}
            y2={y + 46}
            stroke="#e6e2db"
            strokeWidth={1}
          />
          <text
            x={cx}
            y={y + 62}
            textAnchor="middle"
            fontSize={13}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fill={tone.valueFill}
          >
            {secondary ?? '—'}
          </text>

          {reluGate !== null ? (
            <g aria-hidden="true">
              <circle
                cx={x + width - 10}
                cy={y + 52}
                r={6}
                fill={reluGate === 1 ? '#117a6a' : '#c8c2b6'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <text
                x={x + width - 10}
                y={y + 55}
                textAnchor="middle"
                fontSize={9}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fill="#ffffff"
                fontWeight={600}
              >
                {reluGate}
              </text>
            </g>
          ) : null}
        </>
      ) : (
        <text
          x={cx}
          y={y + 43}
          textAnchor="middle"
          fontSize={13}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          fill={tone.valueFill}
        >
          {primary ?? '—'}
        </text>
      )}

      {gradientText ? (
        <text
          x={cx}
          y={y + cardHeight + 14}
          textAnchor="middle"
          fontSize={10}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          fill="#b04a16"
        >
          {gradientText}
        </text>
      ) : null}
    </g>
  );
}
