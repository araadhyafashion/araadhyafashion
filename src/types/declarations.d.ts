declare module 'qrcode-terminal' {
  interface GenerateOptions {
    small?: boolean;
  }
  export function generate(input: string, options?: GenerateOptions | ((qrcode: string) => void), callback?: (qrcode: string) => void): void;
  export function setErrorLevel(errorLevel: 'L' | 'M' | 'Q' | 'H'): void;
}
