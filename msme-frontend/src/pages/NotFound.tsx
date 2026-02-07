import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 attempted to access:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6">
        <h1 className="mb-4 text-5xl font-bold">404</h1>
        <p className="mb-4 text-lg text-muted-foreground">Page not found</p>
        <a href="/" className="inline-block rounded-md bg-primary px-4 py-2 text-white hover:opacity-95">
          Return home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
