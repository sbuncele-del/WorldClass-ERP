/**
 * FlowSpace mark: three ascending bars (progress/flow), per the brand
 * guidelines. `variant="reversed"` is the light-on-dark lockup for the
 * teal sidebar; `variant="primary"` is the teal-on-cream lockup.
 */

interface FlowSpaceLogoProps {
  variant?: 'reversed' | 'primary';
  showWordmark?: boolean;
  size?: number;
}

const FlowSpaceLogo: React.FC<FlowSpaceLogoProps> = ({ variant = 'reversed', showWordmark = true, size = 28 }) => {
  const bars = variant === 'reversed'
    ? ['#3f6f63', '#7fc4b4', '#f2f1ec']
    : ['#bcd9d2', '#5b998a', '#1b5e52'];
  const wordmarkColor = variant === 'reversed' ? '#f2f1ec' : '#172033';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ position: 'absolute', left: 0, top: size * 0.61, width: size * 0.7, height: size * 0.16, borderRadius: 3, background: bars[0] }} />
        <div style={{ position: 'absolute', left: size * 0.14, top: size * 0.36, width: size * 0.7, height: size * 0.16, borderRadius: 3, background: bars[1] }} />
        <div style={{ position: 'absolute', left: size * 0.29, top: size * 0.11, width: size * 0.7, height: size * 0.16, borderRadius: 3, background: bars[2] }} />
      </div>
      {showWordmark && (
        <span style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: size * 0.78, letterSpacing: '-0.02em', color: wordmarkColor }}>
          Flowspace
        </span>
      )}
    </div>
  );
};

export default FlowSpaceLogo;
