import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login"); // Redirect to /login
  }, []);

  return null; // No content needed, it redirects instantly
}
