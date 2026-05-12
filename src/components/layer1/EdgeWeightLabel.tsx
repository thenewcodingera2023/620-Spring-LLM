// Compact midpoint label for an edge. Shows the weight W_l[i, j]; selection thickens the badge
// and switches to the forward color so the user can see which edge the FormulaPanel is keyed to.

interface EdgeWeightLabelProps {
  x: number;
  y: number;
  weight: number;
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

export function EdgeWeightLabel({
  x,
  y,
  weight,
  selected = false,
  onClick,
  ariaLabel,
}: EdgeWeightLabelProps) {
  const w = 36;
  const h = 16;
  return (
    <g
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={3}
        ry={3}
        fill="#ffffff"
        stroke={selected ? '#1e4fb6' : '#e6e2db'}
        strokeWidth={selected ? 1.5 : 0.75}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        fill={selected ? '#1e4fb6' : '#4a5360'}
        fontWeight={selected ? 600 : 400}
      >
        {fmt(weight)}
      </text>
    </g>
  );
}
