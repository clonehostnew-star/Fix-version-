"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header"; // Optional: include header for consistency

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="text-center max-w-md p-6 bg-card rounded-lg shadow-xl">
          <h1 className="text-4xl font-headline text-destructive mb-4">Oops!</h1>
          <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-1">
            We encountered an unexpected issue. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
             <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">Error: {error.message}</p>
          )}
          {process.env.NODE_ENV === 'development' && error.digest && (
            <p className="text-xs text-muted-foreground mt-1">Digest: {error.digest}</p>
          )}
          <Button
            onClick={() => reset()}
            className="mt-6"
            size="lg"
          >
            Try again
          </Button>
        </div>
      </main>
    </div>
  );
}
