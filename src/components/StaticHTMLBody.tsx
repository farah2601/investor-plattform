"use client";

import { useEffect, useState } from "react";

interface StaticHTMLBodyProps {
  bodyContent: string;
}

export function StaticHTMLBody({ bodyContent }: StaticHTMLBodyProps) {
  const [mounted, setMounted] = useState(false);
  const [processedContent, setProcessedContent] = useState("");

  useEffect(() => {
    setMounted(true);
    
    // Fix relative paths in body content
    let processed = bodyContent;
    
    // Fix relative image sources (src="../" -> src="/")
    processed = processed.replace(/src=["']\.\.\/([^"']+)["']/gi, 'src="/$1"');
    // Fix relative hrefs (href="../" -> href="/")
    processed = processed.replace(/href=["']\.\.\/([^"']+)["']/gi, 'href="/$1"');
    // Fix relative paths without ../ - ensure assets/ paths work correctly
    processed = processed.replace(/src=["']([^"']+\.(webp|png|jpg|jpeg|svg|gif))["']/gi, (match, path) => {
      // Keep absolute URLs, already absolute paths, _astro/, and assets/ as-is
      if (path.startsWith("http") || path.startsWith("//") || path.startsWith("/") || path.startsWith("../") || path.startsWith("_astro/") || path.startsWith("assets/")) {
        return match;
      }
      // Fix other relative paths
      return `src="/${path}"`;
    });
    
    setProcessedContent(processed);
  }, [bodyContent]);

  // Only render on client to avoid hydration mismatch
  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "transparent" }} />;
  }

  // Body content already has its own wrapper div, so we render it directly
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: processedContent || bodyContent }} 
      suppressHydrationWarning
      style={{ position: "relative", zIndex: 1 }}
    />
  );
}
