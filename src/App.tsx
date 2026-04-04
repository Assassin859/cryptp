import { useEffect, useState } from 'react';

import IDELayout from './components/IDELayout';
import Auth from './components/Auth';
import { supabase } from './utils/supabaseClient';

function App() {
  const [userId, setUserId] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Constants for security
  const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes


  const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const handleLogout = async () => {
       console.log('Inactivity timeout reached. Signing out...');
       await supabase.auth.signOut();
       setUserId('');
       // Clear any lingering project data from storage for safety but maintain API Keys
       Object.keys(localStorage)
         .filter(key => key.startsWith('cryptp-') && !key.endsWith('-keys') && !key.includes('new-user') && !key.includes('dismiss-link-modal'))
         .forEach(key => localStorage.removeItem(key));
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(handleLogout, IDLE_TIMEOUT);
    };

    const checkSession = async () => {
      // 1. "Zombie Session" Protection:
      // If this is a brand new browser tab/session, we usually force a logout 
      // however, if they are arriving via an email confirmation link (?code= or #access_token=),
      // we MUST NOT log them out, because they are bringing a fresh verified token.
      const hasAuthCode = window.location.search.includes('code=') || window.location.hash.includes('access_token=');
      const isSessionFresh = sessionStorage.getItem('cryptp-session-init');
      
      if (!isSessionFresh && !hasAuthCode) {
        console.log('New browser session detected. Forcing fresh start...');
        await supabase.auth.signOut();
        sessionStorage.setItem('cryptp-session-init', 'true');
      } else if (!isSessionFresh && hasAuthCode) {
        console.log('Auth callback detected in new session. Allowing...');
        sessionStorage.setItem('cryptp-session-init', 'true');
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

        resetIdleTimer(); // Start the timer if user is already logged in
      } else {
        setUserId('');
      }
      setIsLoadingSession(false);
    };

    checkSession();

    // 2. Auth State Listener
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
        
        resetIdleTimer();
      } else {
        setUserId('');
      }
      setIsLoadingSession(false);
    });

    // 3. Activity Listeners for Idle Timeout
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      listener.subscription.unsubscribe();
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, []);


  if (isLoadingSession) {
    return <div className="h-screen flex items-center justify-center">Loading session...</div>;
  }

  if (!userId) {
    return <Auth onSignedIn={(uid) => setUserId(uid)} />;
  }

  return <IDELayout userId={userId} isNewUser={isNewUser} />;
}

export default App;