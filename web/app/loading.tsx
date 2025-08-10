export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-10 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 bg-secondary" />
        <div className="absolute -bottom-10 -right-10 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 bg-accent" />
      </div>
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border border-white/10 glass grid place-items-center">
            <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <div className="absolute inset-0 animate-pulse pointer-events-none" />
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-wide">Argus Admissions</div>
          <div className="text-white/60 mt-1">Booting up your AI counselor...</div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

