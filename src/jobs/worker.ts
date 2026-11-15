//src/jobs/worker.ts
import { processDueReminders } from "../modules/reminders/reminders.service.js";
import { pool } from "../db/pool.js";

const INTERVAL_MS = 60_000;

async function tick(): Promise<void> {
    try {
        const sent = await processDueReminders();
        if (sent > 0) {
            console.log(`Sent ${sent} reminder(s).`);
        }
    } catch (error) {
        console.error("Reminder job failed: ", error);
    }
}

console.log("Reminder worker started. Checking every minute.");
void tick();

const timer = setInterval(() => {
    void tick();
}, INTERVAL_MS);

process.on("SIGINT", async () => {
    clearInterval(timer);
    await pool.end();
    console.log("Reminder worker stopped.");
    process.exit(0);
});
