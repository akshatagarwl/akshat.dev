/** seedbed's mark: a 3x3 dot grid where one dot has grown into a flower. Dots in the ink, the flower in the accent. */
export function Mark({ size = 22 }: { size?: number }) {
  const dots = [[4, 4], [12, 4], [20, 4], [4, 12], [20, 12], [4, 20], [12, 20], [20, 20]];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill="currentColor" />)}
      <g fill="var(--accent, #2f5a2f)">
        {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="12" cy="9.1" rx="1.9" ry="2.9" transform={`rotate(${r} 12 12)`} />)}
      </g>
      <circle cx="12" cy="12" r="1.8" fill="var(--bg, #f4f0e6)" />
    </svg>
  );
}
