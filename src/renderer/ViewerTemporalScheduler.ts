import {
  createTemporalSchedulerCore,
  type TemporalScheduler,
  type TemporalSchedulerHost,
  type TemporalSchedulerOptions
} from '@konitif/temporal';

/** Browser visibility adapter; AnimationLoop owns frame scheduling, not this host. */
export function createViewerTemporalSchedulerHost(): TemporalSchedulerHost {
  return {
    isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
  };
}

/** The viewer drives frame() explicitly and must never allocate a second RAF loop. */
export function createViewerTemporalScheduler(
  options: Omit<TemporalSchedulerOptions, 'externalLoop'>,
  host: TemporalSchedulerHost = createViewerTemporalSchedulerHost()
): TemporalScheduler {
  return createTemporalSchedulerCore({ ...options, externalLoop: true }, host);
}
