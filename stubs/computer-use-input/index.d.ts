export interface ComputerUseInputAPI {
  isSupported: boolean;
  key(key: string): Promise<void>;
  keys(keys: string): Promise<void>;
  click(x: number, y: number): Promise<void>;
  scroll(x: number, y: number): Promise<void>;
  frontmostApp(): Promise<{ bundleId: string }>;
}

export interface ComputerUseInput {
  isSupported: boolean;
}

declare const computerUseInput: ComputerUseInputAPI;
export = computerUseInput;