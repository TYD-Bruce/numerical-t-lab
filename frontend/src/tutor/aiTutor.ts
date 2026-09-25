/** Compatibility exports. Production context projection belongs to the ODE Lab. */
export { buildOdeLabContext } from "../labs/ode/odeTutorContext";
export { ODE_TUTOR_SUGGESTED_QUESTIONS as SUGGESTED_QUESTIONS } from "../labs/ode/odeTutorBinding";
export type { OdeTutorProblemInputs as ProblemInputs } from "../labs/ode/odeTutorTypes";
export { sanitizeTutorText, isChartInstruction } from "./tutorPresentation";
export { sendTutorMessage as sendChatMessage } from "./tutorClient";
export type { TutorMessage, OdeLabContext, ChartInstruction } from "@numerical-t-lab/contracts/tutor";
