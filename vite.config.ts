import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const NODE_BUILTINS = [
  /^node:/,
  "http", "https", "fs", "path", "url", "stream", "crypto", "os",
  "process", "buffer", "events", "util", "net", "tls", "dns",
  "child_process", "worker_threads", "assert", "zlib", "readline",
  "cluster", "dgram", "domain", "punycode", "querystring", "string_decoder",
  "timers", "tty", "v8", "vm", "wasi",
];

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
  // Bundle ALL npm packages into the server output so it works
  // on hosts (like Hostinger) where node_modules is not available at runtime
  ssr: {
    noExternal: true,
    external: ["mysql2", "mysql2/promise"],
  },
  environments: {
    client: {
      build: {
        outDir: ".output/public",
      },
    },
    ssr: {
      build: {
        outDir: ".output/server",
        rollupOptions: {
          external: [
            ...NODE_BUILTINS,
            "mysql2",
            "mysql2/promise",
          ],
        },
      },
    },
  },
});
