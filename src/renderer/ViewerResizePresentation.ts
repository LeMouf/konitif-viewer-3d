export interface ViewerResizePresentationInput {
  sizeChanged: boolean;
  viewportVisible: boolean;
  hasContinuousWork: boolean;
}

export interface ViewerResizePresentation {
  renderImmediately: boolean;
  requestNextFrame: boolean;
}

/**
 * Resizing a WebGL drawing buffer clears its presented pixels. Repaint the
 * current scene in the same resize frame, even when intersection visibility is
 * briefly stale, so workspace resizing never exposes the cleared canvas.
 */
export function resolveViewerResizePresentation(
  input: ViewerResizePresentationInput
): ViewerResizePresentation {
  return {
    renderImmediately: input.sizeChanged,
    requestNextFrame: input.sizeChanged && input.viewportVisible && input.hasContinuousWork
  };
}
