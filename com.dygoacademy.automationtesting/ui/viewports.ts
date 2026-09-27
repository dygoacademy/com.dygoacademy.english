/**
 * The 8 QA viewports of the design system, §16.1
 * (dygo_academy_ui_ux_design_system.md). One Playwright project each.
 */
export interface QaViewport {
  name: string;
  width: number;
  height: number;
  /** Phones and iPads get touch; all run at device scale factor 2. */
  hasTouch: boolean;
}

export const QA_VIEWPORTS: readonly QaViewport[] = [
  { name: 'iphone-se', width: 375, height: 667, hasTouch: true },
  { name: 'iphone-16', width: 393, height: 852, hasTouch: true },
  { name: 'iphone-16-pro-max', width: 440, height: 956, hasTouch: true },
  { name: 'iphone-landscape', width: 852, height: 393, hasTouch: true },
  { name: 'ipad-slide-over', width: 320, height: 1000, hasTouch: true },
  { name: 'ipad-portrait', width: 820, height: 1180, hasTouch: true },
  { name: 'ipad-landscape', width: 1180, height: 820, hasTouch: true },
  { name: 'ipad-13-landscape', width: 1376, height: 1032, hasTouch: true },
];
