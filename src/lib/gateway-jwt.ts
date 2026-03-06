import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyGatewayJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: 'aiden-gateway' });
    return { sub: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
