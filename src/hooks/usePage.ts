import { useState, useEffect, useCallback } from "react";

export type Page = "dashboard" | "cameras";

function resolvePage(hash: string): Page {
  if (hash === "#cameras") return "cameras";
  return "dashboard";
}

export function usePage() {
  const [page, setPage] = useState<Page>(() => resolvePage(location.hash));

  useEffect(() => {
    const onHashChange = () => setPage(resolvePage(location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((target: Page) => {
    location.hash = target === "dashboard" ? "" : `#${target}`;
  }, []);

  return { page, navigate };
}
