import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface AuthProps {
  onSignedIn: (userId: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onSignedIn }) => {
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [onSignedIn]);

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
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const signInOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider, 
      options: { redirectTo: window.location.origin } 
    });
    if (error) setAuthError(error.message);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('cryptp-') && !key.endsWith('-keys') && !key.includes('new-user') && !key.includes('dismiss-link-modal'))
        .forEach((key) => window.localStorage.removeItem(key));
    }
    setLoading(false);
    setUserEmail(null);
    onSignedIn('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-gray-900 text-white p-5 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 uppercase tracking-tighter">CryptP</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Developer Portal</p>
        </div>

        {userEmail ? (
          <div className="text-center">
            <div className="size-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-blue-400 uppercase">{userEmail[0]}</span>
            </div>
            <p className="mb-6 text-sm text-slate-400">Signed in as <span className="text-slate-100 font-mono text-xs">{userEmail}</span></p>
            <button onClick={signOut} className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 transition-all font-bold text-[11px] uppercase tracking-widest active:scale-95">
              Secure Sign Out
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {authError && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-500 text-[10px] font-bold">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-500/20"
              >
                {loading ? 'Authenticating...' : (isSignUp ? 'Create Workspace Account' : 'Sign In To Console')}
              </button>

              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-[10px] text-slate-500 hover:text-blue-400 font-bold uppercase tracking-tighter transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign up'}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-600 tracking-[0.4em]"><span className="bg-slate-950/20 px-2 backdrop-blur-md">Or Continue With</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => signInOAuth('github')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold border border-slate-700 transition-all active:scale-95"
              >
                GitHub
              </button>
              <button
                disabled={loading}
                onClick={() => signInOAuth('google')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold border border-slate-700 transition-all active:scale-95"
              >
                Google
              </button>
            </div>

          </>
        )}
      </div>
    </div>
  );
};


export default Auth;
