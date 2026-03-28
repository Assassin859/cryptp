import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface AuthProps {
  onSignedIn: (userId: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onSignedIn }) => {
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data?.session?.user;
      if (user) {
        setUserEmail(user.email);
        onSignedIn(user.id);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (user) {
        setUserEmail(user.email);
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

  const signInOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('cryptp-'))
        .forEach((key) => window.localStorage.removeItem(key));
    }
    setLoading(false);
    setUserEmail(null);
    onSignedIn('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-gray-900 text-white p-5">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/80 p-6 backdrop-blur-sm shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Cryptp Sign In</h1>

        {userEmail ? (
          <div>
            <p className="mb-4 text-sm text-slate-300">Signed in as <strong>{userEmail}</strong></p>
            <button onClick={signOut} className="w-full px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-500 transition">
              Sign out
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-slate-300">Select your authentication provider:</p>
            <button
              disabled={loading}
              onClick={() => signInOAuth('github')}
              className="w-full mb-2 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition"
            >
              Continue with GitHub
            </button>
            <button
              disabled={loading}
              onClick={() => signInOAuth('google')}
              className="w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition"
            >
              Continue with Google
            </button>
          </>
        )}

        {loading && <p className="mt-3 text-xs text-slate-400">Redirecting to provider, please wait...</p>}
      </div>
    </div>
  );
};

export default Auth;
