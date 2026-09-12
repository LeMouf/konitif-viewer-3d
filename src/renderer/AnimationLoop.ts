export interface AnimationLoopHost {
  isDestroyed(): boolean;
  invalidate(): void;
  frame(): void;
}

export class AnimationLoop {
  needsRender = true;
  wasContinuousLoopActive = false;
  private animationFrame = 0;

  constructor(private readonly host: AnimationLoopHost) {}

  requestRender(): void {
    this.host.invalidate();
    this.needsRender = true;
    this.scheduleLoop();
  }

  scheduleLoop(): void {
    if (this.host.isDestroyed() || this.animationFrame !== 0 || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    this.animationFrame = requestAnimationFrame(this.host.frame);
  }

  cancel(): void {
    if (this.animationFrame === 0 || typeof cancelAnimationFrame === 'undefined') {
      this.animationFrame = 0;
      return;
    }

    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  beginFrame(): boolean {
    if (this.host.isDestroyed()) {
      return false;
    }

    this.animationFrame = 0;
    return true;
  }

  isIdle(): boolean {
    return this.animationFrame === 0;
  }
}
