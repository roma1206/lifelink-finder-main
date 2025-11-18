import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // CORRECT: This sets the base path for production builds (for GitHub Pages)
  base: '/lifelink-finder/',

  server: {
    host: "::",
    port: 8080,
    // REMOVED: The base property is no longer needed here.
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  // Development helper: when browsing to /lifelink-finder/ against the dev server
  // rewrite the incoming URL to the root so Vite serves the app. This mirrors
  // the production `base` behavior during local development and prevents 404s
  // when you open http://localhost:8080/lifelink-finder/.
  ...(mode === "development"
    ? [
        {
          name: "dev-base-rewrite",
          configureServer(server: any) {
            server.middlewares.use((req: any, _res: any, next: any) => {
              try {
                if (req.url && req.url.startsWith("/lifelink-finder/")) {
                  req.url = req.url.replace("/lifelink-finder", "") || "/";
                }
              } catch (e) {
                // ignore and continue
              }
              next();
            });
          },
        },
      ]
    : []),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
