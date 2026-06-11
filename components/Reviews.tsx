'use client';

/**
 * Reviews — real-time feedback + star ratings for a product or a store.
 *
 * - Anyone can read reviews.
 * - Logged-in users can leave ONE review (rating + optional comment), then edit
 *   or delete it.
 * - Supabase Realtime keeps the list and the average rating live for everyone
 *   viewing the page — no refresh needed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, Pencil, Trash2, Send, User, LogIn, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import StarRating from './StarRating';

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
};

export default function Reviews({
  productId,
  storeId,
  title = 'التقييمات والآراء',
}: {
  productId?: string;
  storeId?: string;
  title?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const targetCol = productId ? 'product_id' : 'store_id';
  const targetId = (productId ?? storeId)!;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingMine, setEditingMine] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [error, setError] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myReview = userId ? reviews.find((r) => r.user_id === userId) : undefined;

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, user_id, rating, comment, created_at, updated_at, profile:profiles(full_name, avatar_url)')
      .eq(targetCol, targetId)
      .order('created_at', { ascending: false });
    setReviews((data as unknown as Review[]) ?? []);
    setLoaded(true);
  }, [supabase, targetCol, targetId]);

  // initial load + auth
  useEffect(() => {
    fetchReviews();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [fetchReviews, supabase]);

  // pre-fill my form when my review arrives
  useEffect(() => {
    if (myReview && !editingMine) {
      setMyRating(myReview.rating);
      setMyComment(myReview.comment ?? '');
    }
  }, [myReview, editingMine]);

  // ───── REAL-TIME subscription ─────
  useEffect(() => {
    const channel = supabase
      .channel(`reviews-${targetCol}-${targetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `${targetCol}=eq.${targetId}` },
        () => {
          // re-fetch to get the joined profile data
          fetchReviews();
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, targetCol, targetId, fetchReviews]);

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  // rating distribution 5→1
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || myRating < 1) {
      setError('من فضلك اختر عدد النجوم أولاً');
      return;
    }
    setSubmitting(true);
    setError('');

    const payload: Record<string, unknown> = {
      rating: myRating,
      comment: myComment.trim() || null,
    };

    let err;
    if (myReview) {
      ({ error: err } = await supabase.from('reviews').update(payload).eq('id', myReview.id));
    } else {
      ({ error: err } = await supabase.from('reviews').insert({
        ...payload,
        user_id: userId,
        [targetCol]: targetId,
      }));
    }

    if (err) {
      setError(err.message);
    } else {
      setEditingMine(false);
      fetchReviews(); // optimistic refresh (realtime also fires)
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!myReview) return;
    if (!confirm('حذف تقييمك؟')) return;
    await supabase.from('reviews').delete().eq('id', myReview.id);
    setMyRating(0);
    setMyComment('');
    setEditingMine(false);
    fetchReviews();
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const showForm = userId && (!myReview || editingMine);

  return (
    <section className="mt-12" id="reviews">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-luxor-gold/15 text-luxor-darkgold rounded-xl p-2">
          <MessageSquare size={20} />
        </div>
        <h2 className="text-xl md:text-2xl font-black text-luxor-navy">{title}</h2>
        <span className="inline-flex items-center gap-1 bg-luxor-gold/10 border border-luxor-gold/30 text-luxor-darkgold text-xs font-bold px-2.5 py-1 rounded-full ms-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          مباشر
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Summary card ── */}
        <div className="card p-6 h-fit">
          <div className="text-center mb-4">
            <div className="text-5xl font-black text-luxor-navy">{avg.toFixed(1)}</div>
            <StarRating value={avg} size={20} className="mt-2" />
            <div className="text-sm text-luxor-navy/60 mt-1">
              {reviews.length === 0 ? 'لا توجد تقييمات بعد' : `${reviews.length} تقييم`}
            </div>
          </div>
          <div className="space-y-1.5">
            {dist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-luxor-navy/70 font-semibold">{star}</span>
                <Star size={11} className="text-luxor-gold fill-luxor-gold shrink-0" />
                <div className="flex-1 h-2 bg-luxor-sandlight rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-luxor-gold to-luxor-darkgold rounded-full transition-all duration-500"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-end text-luxor-navy/50">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form + list ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* leave / edit review */}
          {!userId && loaded && (
            <div className="card p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-luxor-navy/70">سجّل دخولك لتترك تقييمك ورأيك</p>
              <Link
                href={`/login?next=${typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : ''}`}
                className="btn-primary !py-2 !px-5 !text-sm"
              >
                <LogIn size={15} />
                تسجيل الدخول
              </Link>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="card p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-luxor-navy mb-2">تقييمك *</label>
                <StarRating value={myRating} onChange={setMyRating} size={28} />
              </div>
              <div>
                <label className="block text-sm font-bold text-luxor-navy mb-2">رأيك (اختياري)</label>
                <textarea
                  rows={3}
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  maxLength={1000}
                  className="input-field"
                  placeholder="شاركنا تجربتك..."
                />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={submitting} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-50">
                  <Send size={15} />
                  {submitting ? 'جاري الإرسال...' : myReview ? 'تحديث التقييم' : 'إرسال التقييم'}
                </button>
                {editingMine && (
                  <button
                    type="button"
                    onClick={() => setEditingMine(false)}
                    className="text-sm text-luxor-navy/60 hover:text-luxor-navy font-semibold"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          )}

          {/* my review (collapsed) */}
          {userId && myReview && !editingMine && (
            <div className="card p-5 border-2 !border-luxor-gold/40 bg-luxor-gold/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-luxor-darkgold mb-1">تقييمك</div>
                  <StarRating value={myReview.rating} size={16} />
                  {myReview.comment && <p className="text-sm text-luxor-navy/80 mt-2 whitespace-pre-wrap">{myReview.comment}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingMine(true)}
                    title="تعديل"
                    className="p-2 rounded-full hover:bg-luxor-gold/20 text-luxor-navy/60 hover:text-luxor-darkgold transition"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    title="حذف"
                    className="p-2 rounded-full hover:bg-red-50 text-luxor-navy/60 hover:text-red-600 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* all reviews */}
          {!loaded ? (
            <div className="card p-8 text-center text-luxor-navy/50 text-sm">جارٍ التحميل...</div>
          ) : reviews.filter((r) => r.user_id !== userId).length === 0 && !myReview ? (
            <div className="card p-8 text-center">
              <MessageSquare size={32} className="text-luxor-gold/40 mx-auto mb-2" />
              <p className="text-luxor-navy/60 text-sm">كن أول من يقيّم!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews
                .filter((r) => r.user_id !== userId)
                .map((r) => (
                  <div key={r.id} className="card p-5 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-luxor-sandlight shrink-0 relative">
                        {r.profile?.avatar_url ? (
                          <Image src={r.profile.avatar_url} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-luxor-navy/30">
                            <User size={18} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-luxor-navy text-sm">
                            {r.profile?.full_name || 'مستخدم'}
                          </span>
                          <span className="text-[11px] text-luxor-navy/40">{fmtDate(r.created_at)}</span>
                        </div>
                        <StarRating value={r.rating} size={13} className="mt-1" />
                        {r.comment && (
                          <p className="text-sm text-luxor-navy/80 mt-2 whitespace-pre-wrap leading-relaxed">{r.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
