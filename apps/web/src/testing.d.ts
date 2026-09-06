/**
 * Fallback type declarations for @testing-library when not installed in the workspace.
 */
declare module '@testing-library/react' {
  export const render: any;
  export const screen: any;
  export const fireEvent: any;
  export const waitFor: any;
  export const act: any;
  export const cleanup: any;
  export const within: any;
}

declare module '@testing-library/user-event' {
  const userEvent: any;
  export default userEvent;
}

declare module '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveFocus(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: unknown): R;
    }
  }
}

export {};

