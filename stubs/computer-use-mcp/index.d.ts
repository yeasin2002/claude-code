export interface CuPermissionRequest {
  action: string;
  coordinate?: [number, number];
}

export interface CuPermissionResponse {
  granted: boolean;
}

export interface CuCallToolResult {
  success: boolean;
}

export interface ComputerUseSessionContext {
  sessionId: string;
}

export interface ScreenshotDims {
  width: number;
  height: number;
}

export interface CoordinateMode {
  type: string;
}

export interface CuSubGates {
  enabled: boolean;
}

export interface RunningApp {
  bundleId: string;
  name: string;
}

export interface ScreenshotResult {
  data: Buffer;
  width: number;
  height: number;
}

export const DEFAULT_GRANT_FLAGS: Record<string, boolean>;
export const API_RESIZE_PARAMS: Record<string, any>;

export function buildComputerUseTools(): any[];
export function createComputerUseMcpServer(): any;
export function bindSessionContext(context: ComputerUseSessionContext): any;
export function getSentinelCategory(bundleId: string): string;
export function targetImageSize(dims: ScreenshotDims): ScreenshotDims;
