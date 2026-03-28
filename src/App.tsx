import React, { useEffect, useState } from 'react';
import IDELayout from './components/IDELayout';
import Auth from './components/Auth';
import { supabase } from './utils/supabaseClient';

function App() {
  const [userId, setUserId] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data?.session?.user;
      if (user) {
        setUserId(user.id);
      } else {
        setUserId('');
      }
      setIsLoadingSession(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setUserId(user?.id || '');
      setIsLoadingSession(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (isLoadingSession) {
    return <div className="h-screen flex items-center justify-center">Loading session...</div>;
  }

  if (!userId) {
    return <Auth onSignedIn={(uid) => setUserId(uid)} />;
  }

  return <IDELayout userId={userId} />;
}

export default App;