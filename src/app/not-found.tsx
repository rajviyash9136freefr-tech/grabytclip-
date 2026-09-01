import { SiteHeader } from "@frontend/components/site-header";
import { SiteFooter } from "@frontend/components/site-footer";
import { ErrorSheet } from "@frontend/components/error-sheet";

export const metadata = {
  title: "Page not found — 404",
  description: "The page you were looking for could not be found.",
  robots: { index: false, follow: false },
};

/** Server-rendered 404 page for unmatched routes. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ErrorSheet
          status="404"
          title="Page not found"
          message="The page you were looking for doesn't exist or has been moved. Check the address, or head back to the downloader."
        />
      </main>
      <SiteFooter />
    </>
  );
}
