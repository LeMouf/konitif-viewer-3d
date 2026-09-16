export type ViewerLedLayout = 'circle' | 'strip';

/** Numeric presentation calibration for an LED group; not physical LED state. */
export interface ViewerLedRingCalibration {
  /** Missing in legacy persisted values means `circle`. */
  layout: ViewerLedLayout;
  forwardOffset: number;
  verticalOffset: number;
  lateralOffset: number;
  separation: number;
  radius: number;
  stripLength: number;
  ledCount: number;
  ledSize: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  isVisible: boolean;
  mireVisible: boolean;
  variantCount: number;
  variantStep: number;
}

/** Resolve presentation values against an explicitly supplied subject profile. */
export function resolveViewerLedRingCalibration(value: unknown, defaults: Readonly<ViewerLedRingCalibration>): ViewerLedRingCalibration {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return {
    layout: source.layout === 'strip' || source.layout === 'circle' ? source.layout : defaults.layout === 'strip' ? 'strip' : 'circle',
    forwardOffset: finite(source.forwardOffset, defaults.forwardOffset),
    verticalOffset: finite(source.verticalOffset, defaults.verticalOffset),
    lateralOffset: finite(source.lateralOffset, defaults.lateralOffset ?? 0),
    separation: finite(source.separation, defaults.separation),
    radius: finite(source.radius, defaults.radius),
    stripLength: finite(source.stripLength, defaults.stripLength ?? defaults.radius * 2),
    ledCount: finite(source.ledCount, defaults.ledCount),
    ledSize: finite(source.ledSize, defaults.ledSize),
    rotationX: finite(source.rotationX, defaults.rotationX),
    rotationY: finite(source.rotationY ?? source.tiltY, defaults.rotationY),
    rotationZ: finite(source.rotationZ ?? source.tiltX, defaults.rotationZ),
    isVisible: typeof source.isVisible === 'boolean' ? source.isVisible : defaults.isVisible,
    mireVisible: typeof source.mireVisible === 'boolean' ? source.mireVisible : defaults.mireVisible,
    variantCount: finite(source.variantCount, defaults.variantCount),
    variantStep: finite(source.variantStep, defaults.variantStep)
  };
}
