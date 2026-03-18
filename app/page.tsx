import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Link
        href="/login"
        className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl shadow-sm transition-colors"
      >
        Login
      </Link>
    </div>
  );
}
