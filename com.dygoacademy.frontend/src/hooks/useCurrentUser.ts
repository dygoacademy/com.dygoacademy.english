'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

/**
 * The signed-in caller's own Supabase user id, client-side. Nothing needed
 * this before this pass — `(dashboard)/layout.tsx` (a Server Component)
 * already resolves the user for the Navbar's email, but nothing client-side
 * did. RosterPanel needs it to label "(you)" on the caller's own row, since
 * `GroupRosterMember` is `user_id`/`role`/`joined_at` only — no session
 * context of its own.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });
}
