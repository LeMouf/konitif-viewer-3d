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
