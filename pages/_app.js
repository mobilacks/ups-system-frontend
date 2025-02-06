import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData?.session);
    };

    fetchSession();
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) router.push("/dashboard");
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  return (
    <div className="font-roboto">
      <Component {...pageProps} />
    </div>
  );
}
