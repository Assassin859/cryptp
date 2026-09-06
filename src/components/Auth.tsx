import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getErrorMessage } from '../utils/errorMessage';
import { Zap, Shield, Flame, Cpu, Layers, Twitter } from 'lucide-react';

interface AuthProps {
  onSignedIn: (userId: string) => void;
}

// ── Feature chip data ─────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Cpu,    label: 'In-Browser EVM' },
  { icon: Shield, label: 'AI Security Auditor' },
  { icon: Flame,  label: 'Gas Heatmap' },
  { icon: Layers, label: 'Token Factory' },
] as const;

// ── Stats strip data ──────────────────────────────────────────────────────────
const STATS = [
  { value: '15+',   label: 'Security Rules' },
  { value: '3',     label: 'AI Models' },
  { value: 'Zero',  label: 'Config' },
] as const;

// ── Footer links ──────────────────────────────────────────────────────────────
const FOOTER_LINKS = [
  { label: 'Docs',     href: '#',                                   icon: null },
  { label: 'Twitter',  href: 'https://twitter.com/assassin_859',    icon: Twitter },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

const Auth: React.FC<AuthProps> = ({ onSignedIn }) => {
  const [loading, setLoading]       = useState(false);
  const [userEmail, setUserEmail]   = useState<string | null>(null);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isSignUp, setIsSignUp]     = useState(false);
  const [authError, setAuthError]   = useState<string | null>(null);

  // ── Session bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data?.session?.user;
      if (user) {
        setUserEmail(user.email ?? null);
        onSignedIn(user.id);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setUserEmail(user.email ?? null);
        onSignedIn(user.id);
      } else {
        setUserEmail(null);
        onSignedIn('');
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [onSignedIn]);

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('cryptp-new-user', 'true');
        }
        setAuthError('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setAuthError(getErrorMessage(err) || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const signInOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);      // disables ALL buttons immediately — no double-trigger
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      setLoading(false);   // re-enable only on error; on success tab navigates away
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      // Preserve *-keys* (AI/RPC + cryptp-graph-keys Studio prefs)
      Object.keys(window.localStorage)
        .filter(k =>
          k.startsWith('cryptp-') &&
          !k.includes('-keys') &&
          !k.includes('new-user') &&
          !k.includes('dismiss-link-modal')
        )
        .forEach(k => window.localStorage.removeItem(k));
    }
    setLoading(false);
    setUserEmail(null);
    onSignedIn('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#05070f] text-white font-sans flex flex-col relative overflow-hidden">

      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 20% -10%, rgba(99,102,241,0.13) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 110%, rgba(139,92,246,0.10) 0%, transparent 55%)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 dot-grid opacity-100" />

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 grid lg:grid-cols-[1fr_440px]">

        {/* ── LEFT — Hero ──────────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center px-8 py-14 lg:py-0 lg:px-16 xl:px-24">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-8 w-fit">
            <Zap className="size-3" />
            Browser-Native DeFi Workbench
          </div>

          {/* Headline */}
          <div className="space-y-1 mb-6">
            <h1 className="text-5xl lg:text-[4.5rem] font-black leading-[0.95] tracking-tighter">
              <span className="block bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-200 to-indigo-400">
                Build.
              </span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-br from-white via-purple-200 to-purple-400">
                Audit.
              </span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-200 to-blue-400">
                Deploy.
              </span>
            </h1>
          </div>

          {/* Sub-copy */}
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            A professional-grade Solidity environment that runs entirely in your browser.
            No local toolchains, no server-side compilation — write, profile, and ship DeFi contracts in minutes.
          </p>

          {/* Feature chips */}
          <div className="mt-8 flex flex-wrap gap-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/40 text-slate-300 text-[11px] font-bold transition-colors hover:border-indigo-500/40 hover:bg-slate-800/80"
              >
                <Icon className="size-3 text-indigo-400 shrink-0" />
                {label}
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-10 flex items-center gap-8">
            {STATS.map(({ value, label }, i) => (
              <React.Fragment key={label}>
                <div>
                  <div className="text-2xl font-black text-white tabular-nums">{value}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{label}</div>
                </div>
                {i < STATS.length - 1 && (
                  <div className="h-8 w-px bg-slate-800" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── RIGHT — Login card ────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center items-center px-6 py-12 lg:py-0 lg:border-l border-slate-800/40">
          <div className="w-full max-w-sm">

            {/* Glow wrapper (pure CSS animation from index.css) */}
            <div className="rounded-2xl glow-pulse">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl">

                {/* Card header */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center gap-2.5 mb-3">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Zap className="size-4 text-white" />
                    </div>
                    <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-tighter">
                      Aethon
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
                    {userEmail
                      ? 'Workspace Active'
                      : isSignUp
                        ? 'Create Your Account'
                        : 'Sign In to Console'}
                  </p>
                </div>

                {/* ── Signed-in state ──────────────────────────────────────── */}
                {userEmail ? (
                  <div className="text-center">
                    <div className="size-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-black text-indigo-400 uppercase">{userEmail[0]}</span>
                    </div>
                    <p className="mb-6 text-sm text-slate-400">
                      Signed in as{' '}
                      <span className="text-slate-100 font-mono text-xs">{userEmail}</span>
                    </p>
                    <button
                      onClick={signOut}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 transition-all font-bold text-[11px] uppercase tracking-widest active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'Signing Out…' : 'Secure Sign Out'}
                    </button>
                  </div>

                ) : (
                  <>
                    {/* ── Email / password form ─────────────────────────── */}
                    <form onSubmit={handleEmailAuth} className="space-y-4 mb-5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">
                          Email Address
                        </label>
                        <input
                          id="auth-email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                          placeholder="name@company.com"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">
                          Password
                        </label>
                        <input
                          id="auth-password"
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                          placeholder="••••••••"
                          required
                        />
                      </div>

                      {/* Auth error / success banner */}
                      {authError && (
                        <div
                          className={`p-3 rounded-lg border text-[10px] font-bold ${
                            authError.toLowerCase().includes('check your email')
                              ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400'
                              : 'bg-red-500/8 border-red-500/25 text-red-400'
                          }`}
                        >
                          {authError}
                        </div>
                      )}

                      <button
                        id="auth-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading
                          ? 'Authenticating…'
                          : isSignUp
                            ? 'Create Workspace Account'
                            : 'Sign In To Console'}
                      </button>

                      <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                        className="w-full text-[10px] text-slate-500 hover:text-indigo-400 font-bold uppercase tracking-tighter transition-colors"
                      >
                        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative mb-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800" />
                      </div>
                      <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-600 tracking-[0.4em]">
                        <span className="bg-slate-900/70 px-3 backdrop-blur-md">Or Continue With</span>
                      </div>
                    </div>

                    {/* OAuth buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {/* GitHub */}
                      <button
                        id="auth-github"
                        disabled={loading}
                        onClick={() => signInOAuth('github')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* GitHub SVG */}
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.071 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.03-2.688-.103-.254-.447-1.273.098-2.655 0 0 .84-.27 2.75 1.025A9.563 9.563 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.295 2.748-1.025 2.748-1.025.546 1.382.202 2.401.1 2.655.641.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.944.359.309.678.919.678 1.852 0 1.337-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2Z"/>
                        </svg>
                        {loading ? '…' : 'GitHub'}
                      </button>

                      {/* Google */}
                      <button
                        id="auth-google"
                        disabled={loading}
                        onClick={() => signInOAuth('google')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* Google SVG */}
                        <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {loading ? '…' : 'Google'}
                      </button>
                    </div>

                    {/* Return to home */}
                    <div className="flex justify-center">
                      <a
                        href="/"
                        className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        ← Return to Home
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* end glow-pulse wrapper */}

          </div>
        </div>
        {/* end right column */}

      </div>
      {/* end main grid */}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/50 py-5 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            {FOOTER_LINKS.map(({ label, href, icon: Icon }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="text-slate-800 select-none">·</span>}
                <a
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {Icon && <Icon className="size-3" />}
                  {label}
                </a>
              </React.Fragment>
            ))}
          </div>
          <p className="text-[10px] text-slate-700 font-bold">
            © 2026 Aethon · Built for the DeFi Developer Community
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Auth;
