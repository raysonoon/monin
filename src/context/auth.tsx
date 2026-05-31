import * as React from "react";
import { useState, useRef, useEffect, useContext, createContext } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  AuthError,
  AuthRequestConfig,
  DiscoveryDocument,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { tokenCache } from "../../utils/cache";
import { Platform } from "react-native";
import { BASE_URL, REFRESH_BEFORE_EXPIRY_SEC } from "../../utils/constants";
import * as jose from "jose";

WebBrowser.maybeCompleteAuthSession();

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: string;
  provider?: string;
  exp?: number;
};

const AuthContext = createContext({
  user: null as AuthUser | null,
  signIn: () => {},
  signOut: () => {},
  fetchWithAuth: (url: string, options: RequestInit) =>
    Promise.resolve(new Response()),
  isLoading: false,
  error: null as AuthError | string | null,
  ensureGoogleAccessToken: async () => null as string | null,
  authStatusMessage: null as string | null,
});

const config: AuthRequestConfig = {
  clientId: "google",
  scopes: [
    "openid",
    "profile",
    "email",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  redirectUri: makeRedirectUri(),
};

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${BASE_URL}/api/auth/authorize`,
  tokenEndpoint: `${BASE_URL}/api/auth/token`,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(
    null
  );
  const [googleAccessTokenExpiresAt, setGoogleAccessTokenExpiresAt] = useState<
    number | null
  >(null);
  const [googleRefreshToken, setGoogleRefreshToken] = useState<string | null>(
    null
  );
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(
    null
  );

  const [request, response, promptAsync] = useAuthRequest(config, discovery);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const isWeb = Platform.OS === "web";
  const refreshInProgressRef = useRef(false);
  const googleRefreshInProgressRef = useRef(false);

  // Function to refresh Google access token - declared early for use in useEffect

  useEffect(() => {
    handleResponse();
  }, [response]);

  // Check if user is authenticated
  useEffect(() => {
    const restoreSession = async () => {
      setIsLoading(true);
      try {
        if (isWeb) {
          // For web: Check if we have a session cookie by making a request to a session endpoint
          const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
            method: "GET",
            credentials: "include", // Important: This includes cookies in the request
          });

          if (sessionResponse.ok) {
            const userData = await sessionResponse.json();
            setUser(userData as AuthUser);
          } else {
            console.log("No active web session found");

            // Try to refresh the token using the refresh cookie
            try {
              await refreshAccessToken();
            } catch (e) {
              console.log("Failed to refresh token on startup", e);
            }
          }
        } else {
          // For native: Try to use the stored access token first
          const storedAccessToken = await tokenCache?.getToken("accessToken");
          const storedRefreshToken = await tokenCache?.getToken("refreshToken");
          const storedGoogleAccessToken =
            await tokenCache?.getToken("googleAccessToken");
          const storedGoogleAccessTokenExpiresAt = await tokenCache?.getToken(
            "googleAccessTokenExpiresAt"
          );
          const storedGoogleRefreshToken =
            await tokenCache?.getToken("googleRefreshToken");

          console.log(
            "Restoring session - Access token:",
            storedAccessToken ? "exists" : "missing"
          );
          console.log(
            "Restoring session - Refresh token:",
            storedRefreshToken ? "exists" : "missing"
          );
          console.log(
            "Google - Access token:",
            storedGoogleAccessToken ? "exists" : "missing"
          );
          console.log(
            "Google - Refresh token:",
            storedGoogleRefreshToken ? "exists" : "missing"
          );

          if (storedAccessToken) {
            try {
              // Check if the access token is still valid
              const decoded = jose.decodeJwt(storedAccessToken);
              const exp = (decoded as any).exp;
              const now = Math.floor(Date.now() / 1000);

              if (exp && exp > now) {
                // Access token is still valid
                console.log("Access token is still valid, using it");
                setAccessToken(storedAccessToken);

                if (storedRefreshToken) {
                  setRefreshToken(storedRefreshToken);
                }

                setUser(decoded as AuthUser);
              } else if (storedRefreshToken) {
                // Access token expired, but we have a refresh token
                console.log("Access token expired, using refresh token");
                setRefreshToken(storedRefreshToken);
                await refreshAccessToken(storedRefreshToken);
              }
            } catch (e) {
              console.error("Error decoding stored token:", e);

              // Try to refresh using the refresh token
              if (storedRefreshToken) {
                console.log("Error with access token, trying refresh token");
                setRefreshToken(storedRefreshToken);
                await refreshAccessToken(storedRefreshToken);
              }
            }
          } else if (storedRefreshToken) {
            // No access token, but we have a refresh token
            console.log("No access token, using refresh token");
            setRefreshToken(storedRefreshToken);
            await refreshAccessToken(storedRefreshToken);
          } else {
            console.log("User is not authenticated");
          }

          if (storedGoogleAccessToken && storedGoogleAccessTokenExpiresAt) {
            try {
              const expiresAt = Number(storedGoogleAccessTokenExpiresAt);
              if (
                !Number.isNaN(expiresAt) &&
                Date.now() < expiresAt - REFRESH_BEFORE_EXPIRY_SEC * 1000
              ) {
                setGoogleAccessToken(storedGoogleAccessToken);
                setGoogleAccessTokenExpiresAt(expiresAt);
              } else if (storedGoogleRefreshToken) {
                console.log("Google access token expired, using refresh token");
                setGoogleRefreshToken(storedGoogleRefreshToken);
                await refreshGoogleAccessToken(storedGoogleRefreshToken);
              }
            } catch (e) {
              console.error("Error retrieving google access token expiry:", e);

              // Try to refresh using the refresh token
              if (storedGoogleRefreshToken) {
                console.log(
                  "Error with Google access token, trying refresh token"
                );
                setGoogleRefreshToken(storedGoogleRefreshToken);
                await refreshGoogleAccessToken(storedGoogleRefreshToken);
              }
            }
          } else if (storedGoogleRefreshToken) {
            console.log("No Google access token, using refresh token");
            setGoogleRefreshToken(storedGoogleRefreshToken);
            await refreshGoogleAccessToken(storedGoogleRefreshToken);
          } else {
            console.error("Error refreshing Google access token");
          }
        }
      } catch (error) {
        console.error("Error restoring session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [isWeb]);

  // Function to refresh the access token
  const refreshAccessToken = async (tokenToUse?: string | null) => {
    // Prevent multiple simultaneous refresh attempts
    if (refreshInProgressRef.current) {
      console.log("Token refresh already in progress, skipping");
      return null;
    }

    refreshInProgressRef.current = true;

    try {
      console.log("Refreshing access token...");

      // Use the provided token or fall back to the state
      const currentRefreshToken = tokenToUse || refreshToken;

      console.log(
        "Current refresh token:",
        currentRefreshToken ? "exists" : "missing"
      );

      if (isWeb) {
        // For web: Use JSON for the request
        const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ platform: "web" }),
          credentials: "include",
        });

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.json();
          console.error("Token refresh failed:", errorData);

          // If refresh fails due to expired token, sign out
          if (refreshResponse.status === 401) {
            signOut();
          }
          return null;
        }

        // Fetch the session to get updated user data
        const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
          method: "GET",
          credentials: "include",
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setUser(sessionData as AuthUser);
        }

        return null; // Web doesn't use access token directly
      } else {
        // For native: Use the refresh token
        if (!currentRefreshToken) {
          console.error("No refresh token available");
          signOut();
          return null;
        }

        console.log("Using refresh token to get new tokens");
        const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: "native",
            refreshToken: currentRefreshToken,
          }),
        });

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.json();
          console.error("Token refresh failed:", errorData);

          // If refresh fails due to expired token, sign out
          if (refreshResponse.status === 401) {
            signOut("Error restoring session. Please reconnect Gmail");
          }
          return null;
        }

        // For native: Update tokens
        const tokens = await refreshResponse.json();
        const newAccessToken = tokens.accessToken;
        const newRefreshToken = tokens.refreshToken;
        // const newGoogleAccessToken = tokens.googleAccessToken;

        console.log(
          "Received new access token:",
          newAccessToken ? "exists" : "missing"
        );
        console.log(
          "Received new refresh token:",
          newRefreshToken ? "exists" : "missing"
        );

        if (newAccessToken) setAccessToken(newAccessToken);
        if (newRefreshToken) setRefreshToken(newRefreshToken);
        // if (newGoogleAccessToken) setGoogleAccessToken(newGoogleAccessToken);

        // Save tokens to cache
        if (newAccessToken)
          await tokenCache?.saveToken("accessToken", newAccessToken);
        if (newRefreshToken)
          await tokenCache?.saveToken("refreshToken", newRefreshToken);
        // if (newGoogleAccessToken)
        //   await tokenCache?.saveToken(
        //     "googleAccessToken",
        //     newGoogleAccessToken
        //   );

        // Update user data from the new access token
        if (newAccessToken) {
          const decoded = jose.decodeJwt(newAccessToken);
          console.log("Decoded user data:", decoded);
          // Check if we have all required user fields
          const hasRequiredFields =
            decoded &&
            (decoded as any).name &&
            (decoded as any).email &&
            (decoded as any).picture;

          if (!hasRequiredFields) {
            console.warn(
              "Refreshed token is missing some user fields:",
              decoded
            );
          }

          setUser(decoded as AuthUser);
        }

        return newAccessToken; // Return the new access token
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      // If there's an error refreshing, we should sign out
      signOut("Error restoring session. Please reconnect Gmail");
      return null;
    } finally {
      refreshInProgressRef.current = false;
    }
  };

  const refreshGoogleAccessToken = async (
    tokenToUse?: string | null
  ): Promise<string | null> => {
    // Prevent multiple simultaneous refresh attempts
    if (googleRefreshInProgressRef.current) {
      console.log("Google token refresh already in progress, skipping");
      return null;
    }

    googleRefreshInProgressRef.current = true;

    const url = `${BASE_URL}/api/auth/google/refresh`;
    console.log("DEBUG refreshGoogleAccessToken start", {
      googleRefreshToken,
      googleRefreshInProgress: googleRefreshInProgressRef.current,
      url,
    });

    try {
      console.log("Refreshing Google access token");
      // Use the provided token or fall back to the state
      const currentGoogleRefreshToken = tokenToUse || googleRefreshToken;
      console.log("Current google refresh token:", currentGoogleRefreshToken);

      if (!currentGoogleRefreshToken) {
        console.log("No Google refresh token available");
        signOut("Gmail session expired. Please reconnect Gmail.");
        return null;
      }

      const response = await fetch(`${BASE_URL}/api/auth/google/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleRefreshToken: currentGoogleRefreshToken,
        }),
      });

      if (!response.ok) {
        console.log("Error refreshing Google token");
        signOut("Error restoring session. Please reconnect Gmail.");
        return null;
      }

      const data = await response.json();
      setGoogleAccessToken(data.googleAccessToken);

      if (data.expiresIn) {
        const expiresAt = Date.now() + data.expiresIn * 1000;
        setGoogleAccessTokenExpiresAt(expiresAt);
        await tokenCache?.saveToken(
          "googleAccessTokenExpiresAt",
          String(expiresAt)
        );
      }

      await tokenCache?.saveToken("googleAccessToken", data.googleAccessToken);
      console.log(
        `New google access token updated raw: ${data.googleAccessToken}, state: ${googleAccessToken}, expiry: ${googleAccessTokenExpiresAt}`
      );
      return data.googleAccessToken;
    } catch (error) {
      console.error("Error refreshing Google token:", error);
      // If there's an error refreshing, we should sign out
      signOut("Error restoring session. Please reconnect Gmail.");
      return null;
    } finally {
      googleRefreshInProgressRef.current = false;
    }
  };

  const isGoogleAccessTokenValid = () => {
    return (
      !!googleAccessToken &&
      !!googleAccessTokenExpiresAt &&
      Date.now() < googleAccessTokenExpiresAt - REFRESH_BEFORE_EXPIRY_SEC * 1000
    );
  };

  const ensureGoogleAccessToken = async () => {
    if (isGoogleAccessTokenValid()) {
      return googleAccessToken;
    }

    return await refreshGoogleAccessToken(googleRefreshToken);
  };

  const handleNativeTokens = async (tokens: {
    accessToken: string;
    refreshToken: string;
    googleAccessToken: string;
    googleAccessTokenExpiry: number;
    googleRefreshToken: string;
  }) => {
    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      googleAccessToken: newGoogleAccessToken,
      googleAccessTokenExpiry: newGoogleAccessTokenExpiry,
      googleRefreshToken: newGoogleRefreshToken,
    } = tokens;

    console.log("Inital access token:", newAccessToken);

    console.log("Initial refresh token:", newRefreshToken);

    console.log("Initial google access token:", newGoogleAccessToken);

    console.log("Initial google refresh token:", newGoogleRefreshToken);

    // Store tokens in state
    if (newAccessToken) setAccessToken(newAccessToken);
    if (newRefreshToken) setRefreshToken(newRefreshToken);
    if (newGoogleAccessToken) setGoogleAccessToken(newGoogleAccessToken);
    if (newGoogleRefreshToken) setGoogleRefreshToken(newGoogleRefreshToken);

    // Save tokens to secure storage for persistence
    if (newAccessToken)
      await tokenCache?.saveToken("accessToken", newAccessToken);
    if (newRefreshToken)
      await tokenCache?.saveToken("refreshToken", newRefreshToken);
    if (newGoogleAccessToken) {
      await tokenCache?.saveToken("googleAccessToken", newGoogleAccessToken);
    }
    if (newGoogleAccessTokenExpiry) {
      const expiresAt = Date.now() + newGoogleAccessTokenExpiry * 1000;
      setGoogleAccessTokenExpiresAt(expiresAt);
      await tokenCache?.saveToken(
        "googleAccessTokenExpiresAt",
        String(expiresAt)
      );
    }
    if (newGoogleRefreshToken) {
      await tokenCache?.saveToken("googleRefreshToken", newGoogleRefreshToken);
    }

    // Decode the JWT access token to get user information
    if (newAccessToken) {
      const decoded = jose.decodeJwt(newAccessToken);
      setUser(decoded as AuthUser);
    }
  };

  const handleResponse = async () => {
    // This function is called when Google redirects back to our app
    // The response contains the authorization code that we'll exchange for tokens
    if (response?.type === "success") {
      try {
        setIsLoading(true);
        // Extract the authorization code from the response
        // This code is what we'll exchange for access and refresh tokens
        const { code } = response.params;
        console.log("Auth code:", code);

        // Create form data to send to our token endpoint
        // We include both the code and platform information
        // The platform info helps our server handle web vs native differently
        const formData = new FormData();
        formData.append("code", code);

        // Add platform information for the backend to handle appropriately
        if (isWeb) {
          formData.append("platform", "web");
        }

        console.log("request", request);

        // Get the code verifier from the request object
        // This is the same verifier that was used to generate the code challenge
        if (request?.codeVerifier) {
          formData.append("code_verifier", request.codeVerifier);
        } else {
          console.warn("No code verifier found in request object");
        }

        // Send the authorization code to our token endpoint
        // The server will exchange this code with Google for access and refresh tokens
        // For web: credentials are included to handle cookies
        // For native: we'll receive the tokens directly in the response
        const tokenResponse = await fetch(`${BASE_URL}/api/auth/token`, {
          method: "POST",
          body: formData,
          credentials: isWeb ? "include" : "same-origin", // Include cookies for web
        });

        if (isWeb) {
          // For web: The server sets the tokens in HTTP-only cookies
          // We just need to get the user data from the response
          const userData = await tokenResponse.json();
          if (userData.success) {
            // Fetch the session to get user data
            // This ensures we have the most up-to-date user information
            const sessionResponse = await fetch(
              `${BASE_URL}/api/auth/session`,
              {
                method: "GET",
                credentials: "include",
              }
            );
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              setUser(sessionData as AuthUser);
            }
          }
        } else {
          // For native: The server returns both tokens in the response
          // We need to store these tokens securely and decode the user data
          const tokens = await tokenResponse.json();
          console.log("Tokens received from token endpoint:", tokens);
          await handleNativeTokens(tokens);
        }
      } catch (e) {
        console.error("Error handling auth response:", e);
      } finally {
        setIsLoading(false);
      }
    } else if (response?.type === "cancel") {
      alert("Sign in cancelled");
    } else if (response?.type === "error") {
      setError(response?.error as AuthError);
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit) => {
    if (isWeb) {
      // For web: Include credentials to send cookies
      const response = await fetch(url, {
        ...options,
        credentials: "include",
      });

      // If the response indicates an authentication error, try to refresh the token
      if (response.status === 401) {
        console.log("API request failed with 401, attempting to refresh token");

        // Try to refresh the token
        await refreshAccessToken();

        // If we still have a user after refresh, retry the request
        if (user) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        }
      }

      return response;
    } else {
      // For native: Use token in Authorization header
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // If the response indicates an authentication error, try to refresh the token
      if (response.status === 401) {
        console.log("API request failed with 401, attempting to refresh token");

        // Try to refresh the token and get the new token directly
        const newToken = await refreshAccessToken();

        // If we got a new token, retry the request with it
        if (newToken) {
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        }
      }

      return response;
    }
  };

  const signIn = async () => {
    try {
      setIsLoading(true);
      if (!request) {
        console.log("No request");
        return;
      }

      await promptAsync();
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  };

  const signOut = async (reason?: string) => {
    if (isWeb) {
      // For web: Call logout endpoint to clear the cookie
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error during web logout:", error);
      }
    } else {
      // For native: Clear all tokens from cache
      await tokenCache?.deleteToken("accessToken");
      await tokenCache?.deleteToken("refreshToken");
      await tokenCache?.deleteToken("googleAccessToken");
      await tokenCache?.deleteToken("googleAccessTokenExpiresAt");
      await tokenCache?.deleteToken("googleRefreshToken");
    }

    // Clear state
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setGoogleAccessToken(null);
    setGoogleAccessTokenExpiresAt(null);
    setGoogleRefreshToken(null);
    setAuthStatusMessage(reason ?? null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        isLoading,
        error,
        fetchWithAuth,
        ensureGoogleAccessToken,
        authStatusMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
