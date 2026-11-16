//src/server.ts
import app from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";

const server = app.listen(config.PORT, () => {
    console.log(
        `Server running on http://localhost:${config.PORT} (${config.NODE_ENV})`,
    );
});

function shutdown(signal: string) {
    console.log(`${signal} received, shutting down...`);

    server.close(async () => {
        await pool.end();
        console.log("Server stopped.");
        process.exit(0);
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
