import './guest.css';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="flex items-center gap-2 text-base font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-post text-ink">●</span>
          Citofono
        </div>
      </div>
      {children}
    </div>
  );
}
