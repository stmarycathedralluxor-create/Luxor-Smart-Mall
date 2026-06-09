export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-luxor-sand border-t-luxor-gold animate-spin" />
        <p className="text-luxor-navy/60 text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}
