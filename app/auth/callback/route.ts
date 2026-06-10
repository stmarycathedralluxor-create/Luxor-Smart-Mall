import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';
  // Defensive: only allow relative redirects so we can never bounce off-site.
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard';

  // Some providers (or aborted sign-ins) come back with an explicit error
  // instead of a code. Bubble it up to the login page so the user sees it.
  const providerError =
    searchParams.get('error_description') || searchParams.get('error');
  if (providerError && !code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('missing_code')}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // After the session is set, optionally flip wants_to_sell on the profile
  // (used by the Google OAuth seller signup flow ?next=/dashboard?seller=1)
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const nextUrl = new URL(next, origin);
    const wantsSeller = nextUrl.searchParams.get('seller') === '1';

    if (user) {
      // Ensure a profile row exists (defense in depth)
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, wants_to_sell, is_seller_approved, role, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof) {
        await supabase.from('profiles').insert({
          id: user.id,
          full_name:
            (user.user_metadata as any)?.full_name ||
            (user.user_metadata as any)?.name ||
            user.email?.split('@')[0] ||
            '',
          phone: (user.user_metadata as any)?.phone || '',
          role: 'buyer',
          wants_to_sell: wantsSeller,
        });
      } else if (
        wantsSeller &&
        !prof.wants_to_sell &&
        !prof.is_seller_approved
      ) {
        await supabase
          .from('profiles')
          .update({ wants_to_sell: true })
          .eq('id', user.id);
      }
    }
  } catch {
    // best-effort
  }
  return NextResponse.redirect(`${origin}${next}`);
}
