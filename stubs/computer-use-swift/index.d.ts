export interface ComputerUseAPI {
  screenshot(): Promise<ScreenshotResult>;
  apps: {
    listInstalled(): Promise<RunningApp[]>;
  };
  resolvePrepareCapture(): Promise<void>;
  captureExcluding(excludeIds: string[]): Promise<ScreenshotResult>;
  captureRegion(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<ScreenshotResult>;
}

export interface ScreenshotResult {
  data: Buffer;
  width: number;
  height: number;
}

export interface RunningApp {
  bundleId: string;
  name: string;
}

declare const computerUseSwift: ComputerUseAPI;
export = computerUseSwift;
