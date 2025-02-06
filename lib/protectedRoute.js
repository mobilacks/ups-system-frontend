import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabase";

export default function ProtectedRoute(Component) {
  return function AuthenticatedComponent(props) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
      const checkUser = async () => {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          router.push("/login");
        } else {
          setUser(session.session.user);
        }
        setLoading(false);
      };
      
      checkUser();
    }, []);

    if (loading) return <p>Loading...</p>;
    return <Component {...props} user={user} />;
  };
}
