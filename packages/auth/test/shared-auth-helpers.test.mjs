import test from "node:test";
import assert from "node:assert/strict";

import { buildKeycloakLogoutUrl } from "../dist/logout.js";
import {
  isAuthorizedRequest,
  isAuthorizedToken,
  isPublicRoute,
} from "../dist/middleware-utils.js";

test("buildKeycloakLogoutUrl builds expected URL with id_token_hint", () => {
  const url = buildKeycloakLogoutUrl({
    origin: "https://obo.example.com",
    idToken: "id-token",
    keycloakUrl: "https://auth.example.com/",
    realm: "example",
    clientId: "obo-client",
  });

  const parsed = new URL(url);

  assert.equal(
    parsed.origin + parsed.pathname,
    "https://auth.example.com/realms/example/protocol/openid-connect/logout"
  );
  assert.equal(
    parsed.searchParams.get("post_logout_redirect_uri"),
    "https://obo.example.com/login"
  );
  assert.equal(parsed.searchParams.get("client_id"), "obo-client");
  assert.equal(parsed.searchParams.get("id_token_hint"), "id-token");
});

test("buildKeycloakLogoutUrl omits id_token_hint when id token is missing", () => {
  const url = buildKeycloakLogoutUrl({
    origin: "https://obo.example.com",
    keycloakUrl: "https://auth.example.com",
    realm: "example",
    clientId: "obo-client",
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.has("id_token_hint"), false);
});

test("buildKeycloakLogoutUrl throws if required env values are missing", () => {
  assert.throws(() => buildKeycloakLogoutUrl({ origin: "https://obo.example.com" }), {
    message: /NEXT_PUBLIC_KEYCLOAK_URL environment variable is required/,
  });
});

test("isPublicRoute matches configured public routes", () => {
  assert.equal(isPublicRoute("/login"), true);
  assert.equal(isPublicRoute("/api/auth/signin"), true);
  assert.equal(isPublicRoute("/unauthorized"), true);
  assert.equal(isPublicRoute("/dashboard"), false);
});

test("isAuthorizedToken rejects errored tokens", () => {
  assert.equal(isAuthorizedToken(undefined), false);
  assert.equal(isAuthorizedToken(null), false);
  assert.equal(isAuthorizedToken({ sub: "123" }), true);
  assert.equal(isAuthorizedToken({ sub: "123", error: "RefreshAccessTokenError" }), false);
});

test("isAuthorizedRequest always allows public routes", () => {
  assert.equal(isAuthorizedRequest("/login", undefined), true);
  assert.equal(isAuthorizedRequest("/api/auth/signin", undefined), true);
});

test("isAuthorizedRequest requires non-errored token for private routes", () => {
  assert.equal(isAuthorizedRequest("/dashboard", undefined), false);
  assert.equal(isAuthorizedRequest("/dashboard", { sub: "123" }), true);
  assert.equal(
    isAuthorizedRequest("/dashboard", { sub: "123", error: "RefreshAccessTokenError" }),
    false
  );
});
