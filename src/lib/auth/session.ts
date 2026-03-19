import { createServerClient } from '@/lib/supabase/server';

export async function getSession() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { sub: user.id, email: user.email || '' };
}
