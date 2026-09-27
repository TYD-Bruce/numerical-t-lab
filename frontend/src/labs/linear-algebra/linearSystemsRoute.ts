import type {
  LabLifecycleCallbacks,
  LabTutorBinding,
  ResumeSummary,
} from "../../app/contracts";
import {
  mountLinearSystemsApp,
  type MountedLinearSystemsApp,
} from "./linearSystemsApp";
import {
  createLinearSystemsSession,
  type LinearSystemsSessionState,
} from "./linearSystemsSession";

export function createBeginnerStarterSession(): LinearSystemsSessionState {
  return createLinearSystemsSession();
}

export interface LinearSystemsMountOptions {
  readonly target: HTMLElement;
  readonly session: LinearSystemsSessionState;
  readonly navigate: (path: string) => void;
  readonly lifecycle?: LabLifecycleCallbacks<LinearSystemsSessionState>;
}

export interface MountedLinearSystemsRoute {
  getSession(): LinearSystemsSessionState;
  getResumeSummary(): ResumeSummary | undefined;
  getTutorBinding(): LabTutorBinding;
  dispose(): void;
}

export function mount(
  options: LinearSystemsMountOptions
): MountedLinearSystemsRoute {
  const mounted: MountedLinearSystemsApp = mountLinearSystemsApp({
    target: options.target,
    initialSession: options.session,
    navigate: options.navigate,
    lifecycle: options.lifecycle,
  });
  return mounted;
}
