export default function Home() {
  // Redirect to the login flow; main UI lives under the (web) group.
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }

  return null;
}
