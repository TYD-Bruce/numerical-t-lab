import type {
  LabLifecycleCallbacks,
  LabTutorBinding,
  ResumeSummary,
} from "../../app/contracts";
import type { LabGlossaryBinding } from "../../glossary/glossaryController";
import {
  mountOdeApp,
  type MountedOdeApp,
} from "./odeApp";
import {
  createBeginnerStarterSession,
  createCurrentCompatibilitySession,
  type OdeSessionState,
} from "./odeSession";

export {
  createBeginnerStarterSession,
  createCurrentCompatibilitySession,
};

export interface InitialValueProblemsMountOptions {
  readonly target: HTMLElement;
  readonly session: OdeSessionState;
  readonly navigate: (path: string) => void;
  readonly lifecycle?: LabLifecycleCallbacks<OdeSessionState>;
}

export interface MountedInitialValueProblemsRoute {
  getSession(): OdeSessionState;
  getResumeSummary(): ResumeSummary | undefined;
  getTutorBinding(): LabTutorBinding;
  getGlossaryBinding(): LabGlossaryBinding;
  dispose(): void;
}

export function mount(
  options: InitialValueProblemsMountOptions
): MountedInitialValueProblemsRoute {
  const mounted: MountedOdeApp = mountOdeApp({
    target: options.target,
    initialSession: options.session,
    navigate: options.navigate,
    lifecycle: options.lifecycle,
  });
  return mounted;
}
