"use client";

import { useEffect, useRef } from "react";

interface HeadInjectorProps {
  headContent: string;
}

export function HeadInjector({ headContent }: HeadInjectorProps) {
  const injectedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Extract and inject meta tags first
    const metaMatches = headContent.match(/<meta[^>]*>/gi) || [];
    metaMatches.forEach((meta) => {
      const metaElement = document.createElement("div");
      metaElement.innerHTML = meta;
      const metaNode = metaElement.firstChild as HTMLMetaElement;
      if (metaNode) {
        const name = metaNode.getAttribute("name") || metaNode.getAttribute("property") || metaNode.getAttribute("http-equiv");
        const content = metaNode.getAttribute("content");
        const key = `meta-${name}-${content}`;
        
        if (!injectedRef.current.has(key)) {
          document.head.appendChild(metaNode.cloneNode(true) as HTMLMetaElement);
          injectedRef.current.add(key);
        }
      }
    });

    // Extract and inject link tags (CSS, fonts, etc.)
    const linkMatches = headContent.match(/<link[^>]*>/gi) || [];
    linkMatches.forEach((link, idx) => {
      const linkElement = document.createElement("div");
      linkElement.innerHTML = link;
      const linkNode = linkElement.firstChild as HTMLLinkElement;
      if (linkNode) {
        const href = linkNode.getAttribute("href");
        const rel = linkNode.getAttribute("rel");
        const key = `link-${rel}-${href}-${idx}`;
        
        // Check if already exists
        const existing = document.querySelector(`link[href="${href}"]`);
        if (!existing && !injectedRef.current.has(key)) {
        // Fix relative paths - keep external URLs and absolute paths as-is
        if (href && !href.startsWith("http") && !href.startsWith("//") && !href.startsWith("/")) {
          // Handle ../ paths - remove them for public directory
          if (href.startsWith("../")) {
            linkNode.setAttribute("href", href.replace(/^\.\.\//, "/"));
          } else {
            linkNode.setAttribute("href", `/${href}`);
          }
        }
          document.head.appendChild(linkNode.cloneNode(true) as HTMLLinkElement);
          injectedRef.current.add(key);
        }
      }
    });

    // Extract and inject ALL style tags (not just one)
    const styleMatches = headContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    styleMatches.forEach((style, idx) => {
      const styleContent = style.replace(/<\/?style[^>]*>/gi, "");
      const idMatch = style.match(/id=["']([^"']+)["']/i);
      const styleId = idMatch ? idMatch[1] : `injected-style-${idx}`;
      
      if (!document.getElementById(styleId) && !injectedRef.current.has(styleId)) {
        const styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.textContent = styleContent;
        document.head.appendChild(styleElement);
        injectedRef.current.add(styleId);
      }
    });

    // Extract and inject script tags
    const scriptMatches = headContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    scriptMatches.forEach((script, idx) => {
      const scriptContent = script.replace(/<\/?script[^>]*>/gi, "");
      const srcMatch = script.match(/src=["']([^"']+)["']/i);
      const idMatch = script.match(/id=["']([^"']+)["']/i);
      const isModule = script.includes('type="module"');
      const isAsync = script.includes("async");
      const isDefer = script.includes("defer");

      const scriptElement = document.createElement("script");
      const scriptId = idMatch ? idMatch[1] : `injected-script-${idx}`;
      
      if (srcMatch) {
        let src = srcMatch[1];
        // Fix relative paths - keep external URLs and absolute paths as-is
        if (!src.startsWith("http") && !src.startsWith("//") && !src.startsWith("/")) {
          // Handle ../ paths - remove them for public directory
          if (src.startsWith("../")) {
            src = src.replace(/^\.\.\//, "/");
          } else {
            src = `/${src}`;
          }
        }
        scriptElement.src = src;
        if (isModule) scriptElement.type = "module";
        if (isAsync) scriptElement.async = true;
        if (isDefer) scriptElement.defer = true;
        
        // Check if script already exists
        if (!document.querySelector(`script[src="${src}"]`) && !injectedRef.current.has(scriptId)) {
          scriptElement.id = scriptId;
          document.head.appendChild(scriptElement);
          injectedRef.current.add(scriptId);
        }
      } else if (scriptContent.trim()) {
        scriptElement.textContent = scriptContent;
        scriptElement.id = scriptId;
        if (isModule) scriptElement.type = "module";
        
        if (!document.getElementById(scriptId) && !injectedRef.current.has(scriptId)) {
          document.head.appendChild(scriptElement);
          injectedRef.current.add(scriptId);
        }
      }
    });
  }, [headContent]);

  return null;
}
