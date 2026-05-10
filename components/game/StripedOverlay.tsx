import React from 'react';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

interface Props {
  width: number;
  height: number;
  /** Stripe stroke color (the dotted diagonal lines). */
  color: string;
  /** Pixel spacing between adjacent stripes. */
  spacing?: number;
  /** Stroke width of each stripe. */
  thickness?: number;
  /** Border radius to clip the pattern with — match the patch radius. */
  radius?: number;
  /** Unique pattern id; required because SVG ids are document-global. */
  patternId: string;
}

/**
 * Diagonal dotted-line pattern used to indicate a wrongly placed patch.
 * The stripes run at 45° and use a small dasharray so each stripe reads as
 * a chain of dots rather than a solid line.
 */
function StripedOverlayImpl({
  width,
  height,
  color,
  spacing = 9,
  thickness = 1.6,
  radius = 8,
  patternId,
}: Props) {
  return (
    <Svg width={width} height={height} style={{ borderRadius: radius }}>
      <Defs>
        <Pattern
          id={patternId}
          x={0}
          y={0}
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <Line
            x1={0}
            y1={0}
            x2={0}
            y2={spacing}
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray="2,2"
            strokeLinecap="round"
          />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${patternId})`} rx={radius} ry={radius} />
    </Svg>
  );
}

export const StripedOverlay = React.memo(StripedOverlayImpl);
