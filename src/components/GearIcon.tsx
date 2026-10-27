import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

const TEETH = 8;

interface Props {
  color: string;
  size?: number;
}

/** Small gear glyph drawn with SVG so no icon font/library is needed. */
export default function GearIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {Array.from({ length: TEETH }, (_, i) => (
        <Rect
          key={i}
          x={10.6}
          y={1.6}
          width={2.8}
          height={5}
          rx={1.4}
          fill={color}
          rotation={(i * 360) / TEETH}
          originX={12}
          originY={12}
        />
      ))}
      <Circle cx={12} cy={12} r={6.6} fill="none" stroke={color} strokeWidth={2.4} />
      <Circle cx={12} cy={12} r={2.6} fill={color} />
    </Svg>
  );
}
