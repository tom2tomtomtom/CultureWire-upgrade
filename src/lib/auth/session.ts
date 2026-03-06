import { cookies } from 'next/headers';
import { verifyGatewayJWT } from '@/lib/gateway-jwt';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('aiden-gw')?.value;
  if (!token) return null;
  return verifyGatewayJWT(token);
}
