import { useEffect, useState } from 'react';

import IDELayout from './components/IDELayout';
import Auth from './components/Auth';
import SetupRequired from './components/SetupRequired';
import { getSupabase, isSupabaseConfigured } from './utils/supabaseClient';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;

function App() {
  const [userId, setUserId] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoadingSession(false);
      return;
    }

    const supabase = getSupabase();

    const checkSession = async () => {
      const hasAuthCode =
        window.location.search.includes('code=') ||
        window.location.hash.includes('access_token=');
      const isSessionFresh = sessionStorage.getItem('cryptp-session-init');

      if (!isSessionFresh) {
        sessionStorage.setItem('cryptp-session-init', 'true');
        if (!hasAuthCode) {
          const preCheck = await supabase.auth.getSession();
          if (!preCheck.data?.session) {
            await supabase.auth.signOut();
          }
        }
      }

      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data?.session?.user;
      if (user) {
        setUserId(user.id);

        let localNewUser = false;
        if (typeof window !== 'undefined' && window.localStorage.getItem('cryptp-new-user') === 'true') {
          localNewUser = true;
          window.localStorage.removeItem('cryptp-new-user');
        }

        const created = new Date(user.created_at).getTime();
        const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
        const timeDiff = Math.abs(lastSignIn - created);

        if (timeDiff < 10000 || localNewUser) {
          setIsNewUser(true);
        }
      } else {
        setUserId('');
      }
      setIsLoadingSession(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setUserId(user.id);

        let localNewUser = false;
        if (typeof window !== 'undefined' && window.localStorage.getItem('cryptp-new-user') === 'true') {
          localNewUser = true;
          window.localStorage.removeItem('cryptp-new-user');
        }

        const created = new Date(user.created_at).getTime();
        const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
        const timeDiff = Math.abs(lastSignIn - created);

        if (timeDiff < 10000 || localNewUser) {
          setIsNewUser(true);
        }
      } else {
        setUserId('');
      }
      setIsLoadingSession(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    const supabase = getSupabase();
    let idleTimer: ReturnType<typeof setTimeout>;

    const handleLogout = async () => {
      console.log('Inactivity timeout reached. Signing out...');
      await supabase.auth.signOut();
      setUserId('');
      // Preserve *-keys* (AI/RPC + cryptp-graph-keys Studio prefs)
      Object.keys(localStorage)
        .filter(
          (key) =>
            key.startsWith('cryptp-') &&
            !key.includes('-keys') &&
            !key.includes('new-user') &&
            !key.includes('dismiss-link-modal')
        )
        .forEach((key) => localStorage.removeItem(key));
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(handleLogout, IDLE_TIMEOUT);
    };

    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [userId]);

  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  if (isLoadingSession) {
    return <div className="h-screen flex items-center justify-center">Loading session...</div>;
  }

  if (!userId) {
    return <Auth onSignedIn={(uid) => setUserId(uid)} />;
  }

  return <IDELayout userId={userId} isNewUser={isNewUser} />;
}

export default App;
