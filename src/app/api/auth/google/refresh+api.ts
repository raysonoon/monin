import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_WEB_CLIENT_SECRET,
} from "../../../../../utils/constants";

/**
 * Google Refresh API endpoint
 *
 * This endpoint refreshes the Google's access token using their refresh token.
 * No new refresh token is returned
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const googleRefreshToken = body.googleRefreshToken as string | undefined;

    if (!googleRefreshToken) {
      return Response.json(
        { error: "Missing googleRefreshToken" },
        { status: 400 }
      );
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_WEB_CLIENT_ID,
        client_secret: GOOGLE_WEB_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: googleRefreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: data.error || "Failed to refresh Google access token",
          error_description: data.error_description,
        },
        { status: response.status }
      );
    }

    return Response.json({
      googleAccessToken: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error("Google refresh token error:", error);
    return Response.json(
      { error: "Failed to refresh Google token" },
      { status: 500 }
    );
  }
}
