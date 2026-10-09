import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

/**
 * Minimal lucide-style stroke icons mirrored from the web preview
 * (apps/mobile-preview/app.js `paths`). Only the shell glyphs are included.
 */
export type IconName =
  | 'vault'
  | 'spark'
  | 'import'
  | 'devices'
  | 'lock'
  | 'shield'
  | 'plus';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 22,
  color = colors.text,
}) => {
  const stroke = {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'vault' && (
        <>
          <Rect x="4" y="4" width="16" height="16" rx="4" {...stroke} />
          <Circle cx="12" cy="12" r="3" {...stroke} />
          <Path d="M12 9v6M9 12h6M4 9H2M4 15H2" {...stroke} />
        </>
      )}
      {name === 'spark' && (
        <Path
          d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4M18 4h4"
          {...stroke}
        />
      )}
      {name === 'import' && (
        <Path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" {...stroke} />
      )}
      {name === 'devices' && (
        <>
          <Rect x="3" y="4" width="14" height="11" rx="2" {...stroke} />
          <Path d="M5 20h9M9 15v5" {...stroke} />
          <Rect x="16" y="10" width="5" height="10" rx="1.5" {...stroke} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="5" y="10" width="14" height="11" rx="3" {...stroke} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" {...stroke} />
        </>
      )}
      {name === 'shield' && (
        <>
          <Path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z" {...stroke} />
          <Path d="m8.5 11.5 2.5 2.5 4.5-5" {...stroke} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} />}
    </Svg>
  );
};
