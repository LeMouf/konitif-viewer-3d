export interface ProjectilePointerHost {
  element: HTMLElement;
  enabled(): boolean;
  begin(event: PointerEvent): boolean;
  launch(): void;
  cancel(): void;
}

/** Transient pointer ownership only. The host retains commands, aim and time. */
export class ProjectilePointerController {
  private pointerId: number | null = null;
  private readonly capture = { capture: true };

  constructor(private readonly host: ProjectilePointerHost) {
    host.element.addEventListener('pointerdown', this.down, this.capture);
    host.element.addEventListener('pointerup', this.up, this.capture);
    host.element.addEventListener('pointercancel', this.cancelEvent, this.capture);
    host.element.addEventListener('lostpointercapture', this.cancelEvent, this.capture);
    host.element.addEventListener('contextmenu', this.contextMenu, this.capture);
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  cancel(): void {
    if (!this.active) return;
    this.release();
    this.host.cancel();
  }

  dispose(): void {
    this.cancel();
    this.host.element.removeEventListener('pointerdown', this.down, this.capture);
    this.host.element.removeEventListener('pointerup', this.up, this.capture);
    this.host.element.removeEventListener('pointercancel', this.cancelEvent, this.capture);
    this.host.element.removeEventListener('lostpointercapture', this.cancelEvent, this.capture);
    this.host.element.removeEventListener('contextmenu', this.contextMenu, this.capture);
  }

  private release(): void {
    const pointer = this.pointerId;
    this.pointerId = null;
    if (pointer !== null && this.host.element.hasPointerCapture(pointer)) {
      this.host.element.releasePointerCapture(pointer);
    }
  }

  private down = (event: PointerEvent): void => {
    if (event.button !== 2 || !this.host.enabled()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.active || !this.host.begin(event)) return;
    this.pointerId = event.pointerId;
    this.host.element.setPointerCapture(event.pointerId);
  };

  private up = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || event.button !== 2) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.release();
    this.host.launch();
  };

  private cancelEvent = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.cancel();
  };

  private contextMenu = (event: MouseEvent): void => {
    if (this.host.enabled()) event.preventDefault();
  };
}
