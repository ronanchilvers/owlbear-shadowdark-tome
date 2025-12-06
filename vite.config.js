import { defineConfig } from "vite";
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  plugins: [
      viteStaticCopy({
        targets: [
          {
            src: path.resolve(__dirname, './manifest.json'),
            dest: './',
          },
        ],
      }),
    ]
});
