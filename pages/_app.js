import "../styles/global.css";
import Navbar from "../components/Navbar";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Navbar /> {/* ✅ Navbar Included */}
      <Component {...pageProps} />
    </>
  );
}
