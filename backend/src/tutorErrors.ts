import type { TutorConnectionErrorCode } from "@numerical-t-lab/contracts/tutor";

const ERRORS: Record<TutorConnectionErrorCode, readonly [number, string]> = {
  invalid_configuration: [400, "Invalid connection configuration."],
  invalid_endpoint: [400, "Use an explicit supported HTTP loopback local endpoint."],
  credential_required: [400, "A valid explicit credential is required."],
  model_required: [400, "Choose a model before testing or activating this connection."],
  invalid_session: [403, "Local session proof is not valid."],
  session_expired: [401, "The local session expired. Reconnect to continue."],
  session_limit: [429, "Too many local sessions. Close a session or wait for expiry."],
  connection_changed: [409, "The connection changed. Review the current selection."],
  connection_unverified: [409, "Test this connection before activating it."],
  connection_required: [409, "Choose and test a connection first."],
  request_busy: [429, "The local Tutor is busy. Wait or cancel the current request."],
  request_cancelled: [409, "The request was cancelled."],
  provider_unavailable: [502, "The selected model server could not be reached."],
  redirect_rejected: [502, "The selected server redirected the request. No redirect was followed."],
  response_too_large: [502, "The model response exceeded the supported size."],
  response_invalid: [502, "The model server returned an unsupported response."],
  timeout: [504, "The model request timed out."],
  provider_auth: [401, "The selected model server rejected the credential."],
  provider_busy: [429, "The selected model server is busy or has reached its limit."],
  provider_unsupported: [400, "This provider is not available in this version."],
  discovery_unsupported: [422, "This server does not provide model discovery. Enter an exact model ID."],
  model_unavailable: [409, "The selected model is not reported as available. Load it in your model server before testing."],
  model_unsupported: [422, "This model requires preserved reasoning history, which Tutor does not support. Choose a different model."],
  response_refused: [422, "The model declined this request or its safety filter blocked the answer."],
  response_incomplete: [422, "The model did not finish its answer. No partial answer was accepted."],
  input_too_large: [413, "The conversation and context exceed the supported input size. Start a shorter conversation."],
  invalid_chat_request: [400, "The Tutor request is invalid. Reopen the Tutor and try again."],
  invalid_context: [400, "The Lab context is invalid or unsupported. Run a valid experiment before sending."],
  profile_unsupported: [400, "This Lab does not yet support personal Tutor chat."],
};

/** Fixed public messages only: never capture a URL, credential, body or cause. */
export class TutorConnectionError extends Error {
  readonly status: number;
  constructor(readonly code: TutorConnectionErrorCode) {
    super(ERRORS[code][1]);
    this.status = ERRORS[code][0];
  }
}
