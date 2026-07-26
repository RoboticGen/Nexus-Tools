interface KeycloakLogoutOptions {
  origin: string;
  idToken?: string;
  redirectPath?: string;
  keycloakUrl?: string;
  realm?: string;
  clientId?: string;
}

function getRequiredValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function buildKeycloakLogoutUrl({
  origin,
  idToken,
  redirectPath = "/login",
  keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL,
  realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
  clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
}: KeycloakLogoutOptions): string {
  const resolvedKeycloakUrl = trimTrailingSlash(
    getRequiredValue("NEXT_PUBLIC_KEYCLOAK_URL", keycloakUrl)
  );
  const resolvedRealm = getRequiredValue("NEXT_PUBLIC_KEYCLOAK_REALM", realm);
  const resolvedClientId = getRequiredValue("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID", clientId);

  const postLogoutRedirectUrl = new URL(redirectPath, origin).toString();
  const logoutUrl = new URL(
    `${resolvedKeycloakUrl}/realms/${resolvedRealm}/protocol/openid-connect/logout`
  );

  logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUrl);
  logoutUrl.searchParams.set("client_id", resolvedClientId);

  if (idToken) {
    logoutUrl.searchParams.set("id_token_hint", idToken);
  }

  return logoutUrl.toString();
}
