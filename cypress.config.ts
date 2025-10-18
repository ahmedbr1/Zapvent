import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000", // 👈 change this to your app URL if different
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}", // 👈 where test files are
    supportFile: "cypress/support/e2e.ts", // 👈 global setup (auto-created)
    video: false, // disable video recordings (optional)
    screenshotOnRunFailure: true,
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
      // e.g. on('task', { log: (message) => console.log(message) });
    },
  },
  viewportWidth: 1280,
  viewportHeight: 800,
});