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
      build: {
        outDir: ".output/server",
      },
    },
  },
});


