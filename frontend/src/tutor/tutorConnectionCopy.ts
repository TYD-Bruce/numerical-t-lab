import type { TutorConnectionMetadata } from "@numerical-t-lab/contracts/tutor";
import { TutorClientError } from "./tutorConnectionProtocol";

export function describeTutorConnection(connection?: TutorConnectionMetadata): string {
  return connection ? `${connection.provider}${connection.region ? ` (${connection.region})` : ""} · ${connection.model ?? "No model selected"} · ${connection.baseUrl}` : "Default Tutor service";
}

/** Never reflect provider bodies, credentials, fetch causes or arbitrary Error text. */
export function tutorConnectionFailure(error: unknown): string {
  if (!(error instanceof TutorClientError)) return "The connection request could not finish. Try again explicitly.";
  switch (error.code) {
    case "local_required": return "Personal connections require T-Lab's frontend and backend on this computer. No key can be entered here.";
    case "session_expired": case "invalid_session": return "Your local session expired or was lost. Enable personal connections again.";
    case "connection_changed": case "history_changed": return "The connection or conversation changed. Review your choice again.";
    case "history_required": return "Choose whether to start fresh or transfer this Lab's conversation before sending.";
    case "connection_unverified": return "Test this connection before using it.";
    case "connection_required": return "Save and test a personal connection first.";
    case "credential_required": return "Enter a valid API key for the selected destination.";
    case "model_required": return "Select an exact model ID before testing.";
    case "invalid_endpoint": return "Use http://localhost:port, http://127.0.0.1:port or http://[::1]:port, optionally ending in /v1.";
    case "invalid_configuration": return "Check the provider, region, server address and model ID.";
    case "provider_auth": return "The selected server rejected the credential. Save the connection with a valid key.";
    case "provider_busy": case "request_busy": return "The selected connection is busy or has reached its limit. Wait, or cancel the current request.";
    case "model_unavailable": return "The selected model is not available. Start and load it in your model server, then test again.";
    case "model_unsupported": return "This model requires preserved reasoning history, which Tutor does not support. Choose another model.";
    case "discovery_unsupported": return "This server does not support model discovery. Enter an exact model ID.";
    case "timeout": return "The request timed out. No automatic retry was made.";
    case "request_cancelled": return "Request cancelled.";
    case "input_too_large": return "The conversation and experiment context exceed the input limit. Start a shorter conversation.";
    case "invalid_context": return "Run a valid experiment before sending a grounded question.";
    case "profile_unsupported": return "Personal Tutor chat is not available for this Lab yet.";
    case "response_refused": return "The model declined the request or blocked the answer.";
    case "response_incomplete": return "The model did not complete its answer. No partial answer was added.";
    case "response_invalid": return "The server returned an unsupported response. Check that the local backend and model API are compatible.";
    case "response_too_large": return "The server response exceeded the supported size.";
    case "redirect_rejected": return "The server redirected the request. Tutor did not follow the redirect.";
    default: return "The selected service is unavailable. Check the server and try again explicitly.";
  }
}
