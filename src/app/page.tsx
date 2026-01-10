import { readFileSync } from "fs";
import { join } from "path";
import { HeadInjector } from "../components/HeadInjector";
import { StaticHTMLBody } from "../components/StaticHTMLBody";

export default function LandingPage() {
  // Serve static index.html from public directory
  try {
    const htmlPath = join(process.cwd(), "public", "index.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");
    
    // Extract head and body content
    const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    if (!bodyMatch) {
      throw new Error("No body tag found in index.html");
    }
    
    const headContent = headMatch ? headMatch[1] : "";
    const bodyContent = bodyMatch[1];
    
    return (
      <>
        <HeadInjector headContent={headContent} />
        <StaticHTMLBody bodyContent={bodyContent} />
      </>
    );
  } catch (error) {
    // If index.html doesn't exist yet, show a placeholder
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#fff", background: "#020617", minHeight: "100vh" }}>
        <h1>index.html not found</h1>
        <p>Please place index.html in the public/ directory</p>
        {error instanceof Error && <p style={{ marginTop: "1rem", color: "#999", fontSize: "0.875rem" }}>Error: {error.message}</p>}
      </div>
    );
  }
}