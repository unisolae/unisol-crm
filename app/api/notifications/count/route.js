import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Επιστρέφει τον αριθμό αδιάβαστων notifications του τρέχοντος χρήστη.
// Καλείται με polling από το TopBar.
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({ count: count ?? 0 });
}
