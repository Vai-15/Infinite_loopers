require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Database = require("better-sqlite3");

const { createAnalyticsRoutes } = require("./routes/analytics");
const { createLoansRoutes } = require("./routes/loans");
const { createScoreRoutes } = require("./routes/score");
const { generalLimiter } = require("./middleware/rateLimit");
const { createIndexer } = require("./services/indexer");

const PORT = Number(process.env.PORT || 5000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS =
    process.env.TRUSTLEND_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ABI_PATH = process.env.TRUSTLEND_ABI_PATH
    ? path.resolve(process.cwd(), process.env.TRUSTLEND_ABI_PATH)
    : null;
const DB_PATH = process.env.SQLITE_DB_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_DB_PATH)
    : path.resolve(__dirname, "../trustlend.sqlite");

function initializeDb() {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    const schemaPath = path.resolve(__dirname, "db/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);

    return db;
}

async function bootstrap() {
    const db = initializeDb();

    const indexer = createIndexer({
        db,
        rpcUrl: RPC_URL,
        contractAddress: CONTRACT_ADDRESS,
        abiPath: ABI_PATH
    });

    const app = express();

    app.use(helmet());
    app.use(
        cors({
            origin: CORS_ORIGIN
        })
    );
    app.use(express.json({ limit: "10kb" }));
    app.use(generalLimiter);

    app.get("/health", (req, res) => {
        res.json({
            ok: true,
            service: "trustlend-server",
            timestamp: new Date().toISOString()
        });
    });

    app.use("/api/score", createScoreRoutes({ db, indexer }));
    app.use("/api/loans", createLoansRoutes({ db, indexer }));
    app.use("/api/analytics", createAnalyticsRoutes({ db, indexer }));

    app.use((req, res) => {
        res.status(404).json({
            error: "Route not found."
        });
    });

    app.use((error, req, res, next) => {
        const status = error.status || 500;
        const message = error.message || "Internal server error.";

        if (status >= 500) {
            console.error("[Server Error]", error);
        }

        res.status(status).json({
            error: message
        });
    });

    const server = app.listen(PORT, async () => {
        console.log(`TrustLend backend listening on http://localhost:${PORT}`);
        try {
            const status = await indexer.start();
            console.log(
                `[Indexer] synced ${status.processedEvents} events up to block ${status.latestBlock}.`
            );
        } catch (error) {
            console.error("[Indexer] startup failed:", error.message);
        }
    });

    function shutdown() {
        console.log("Shutting down TrustLend backend...");
        indexer.stop();
        server.close(() => {
            db.close();
            process.exit(0);
        });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
    console.error("Fatal startup error:", error);
    process.exit(1);
});
