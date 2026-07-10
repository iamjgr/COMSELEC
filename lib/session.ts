import { SignJWT, jwtVerify } from 'jose';

// Hard fail if secret is missing — no silent fallbacks
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start safely.');
}
const key = new TextEncoder().encode(rawSecret);

export type SessionStage = 'admin' | 'qr_verified' | 'pin_verified';

interface SignOptions {
  expiresIn?: string; // e.g. '8h', '10m'
}

export async function signSession(
  payload: Record<string, unknown>,
  options: SignOptions = {}
) {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  if (options.expiresIn) {
    builder.setExpirationTime(options.expiresIn);
  }

  return await builder.sign(key);
}

export async function verifySession(input: string) {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}
