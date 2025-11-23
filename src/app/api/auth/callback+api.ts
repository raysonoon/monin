import { BASE_URL, APP_SCHEME } from "../../../../utils/constants";

// Redirect back to web/native after getting auth code from Google
export async function GET(request: Request) {
  const incomingParams = new URLSearchParams(request.url.split("?")[1]);
  const combinedPlatformAndState = incomingParams.get("state");
  if (!combinedPlatformAndState) {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }
  // strip platform to return redirectPath and state as it was set on the client
  const [platform, state, redirectPath] = combinedPlatformAndState.split("|");

  const outgoingParams = new URLSearchParams({
    code: incomingParams.get("code")?.toString() || "",
    state,
  });

  const base = platform === "web" ? BASE_URL : APP_SCHEME;
  const path = redirectPath || ""; // fallback to root if not present

  // Build redirect URI
  return Response.redirect(`${base}${path}?${outgoingParams.toString()}`);
}
