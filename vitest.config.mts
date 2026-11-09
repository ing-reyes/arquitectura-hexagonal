import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
        testTimeout: 15000,
        env: {
            PORT: "3000",
            JWT_SECRET: "test-secret-for-vitest",
            MONGO_USER: "test",
            MONGO_PASSWORD: "test",
            MONGO_URL: "mongodb://localhost:27017",
            MONGO_DB_NAME: "hexagonal_test",
        },
    },
});
