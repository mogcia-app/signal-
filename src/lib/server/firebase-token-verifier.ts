import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

type CachedVerifier = {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  issuer: string;
  audience: string;
};

declare global {
  var __FIREBASE_TOKEN_VERIFIER__: CachedVerifier | undefined;
}

function getProjectId(): string {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.FIREBASE_PROJECT_ID ??
    "";

  if (!projectId) {
    throw new Error("Firebase project ID is not configured.");
  }

  return projectId;
}

function getVerifier(): CachedVerifier {
  if (!globalThis.__FIREBASE_TOKEN_VERIFIER__) {
    const projectId = getProjectId();
    const issuer = `https://securetoken.google.com/${projectId}`;
    const audience = projectId;
    const jwks = createRemoteJWKSet(
      new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
    );

    globalThis.__FIREBASE_TOKEN_VERIFIER__ = { jwks, issuer, audience };
  }

  return globalThis.__FIREBASE_TOKEN_VERIFIER__;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<JWTPayload> {
  const verifier = getVerifier();
  const { payload } = await jwtVerify(idToken, verifier.jwks, {
    audience: verifier.audience,
    issuer: verifier.issuer,
  });

  return payload;
}


