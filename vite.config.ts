import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        entry: "server",
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  environments: {
    client: {
      build: {
        outDir: ".output/public",
      },
    },
    ssr: {
      noExternal: true,
      build: {
        outDir: ".output/server",
        rollupOptions: {
          external: [
            "node:http",
            "node:https",
            "node:fs",
            "node:path",
            "node:url",
            "node:stream",
            "node:crypto",
            "node:os",
            "node:process",
            "node:buffer",
            "node:events",
            "node:util",
            "node:net",
            "node:tls",
            "node:dns",
            "node:child_process",
            "node:worker_threads",
            "mysql2",
            "mysql2/promise",
          ],
        },
      },
    },
  },
});


