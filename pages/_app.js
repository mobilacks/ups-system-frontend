import "../styles/globals.css";
import Navbar from "../components/Navbar";
import Head from "next/head"; // ✅ Import Head for metadata

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Lacks UPS System</title> {/* ✅ Update title */}
        <link rel="icon" href="/favicon.ico" /> {/* ✅ Favicon added */}
      </Head>
      <Navbar /> {/* ✅ Navbar Included */}
      <Component {...pageProps} />
    </>
  );
}
