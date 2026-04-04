const express = require("express");
const {
    getDashboardAnalytics,
    getOverview,
    getRecentEvents,
    getTopBorrowers,
    getTopLenders,
    getVolumeByDay
} = require("../services/analytics");

function createAnalyticsRoutes({ db, indexer }) {
    const router = express.Router();

    router.get("/overview", async (req, res, next) => {
        try {
            const contract = indexer.getContract();
            if (!contract) {
                return res.status(503).json({ error: "Contract indexer is not ready yet." });
            }

            const overview = await getOverview(db, contract);
            return res.json(overview);
        } catch (error) {
            return next(error);
        }
    });

    router.get("/dashboard", async (req, res, next) => {
        try {
            const contract = indexer.getContract();
            if (!contract) {
                return res.status(503).json({ error: "Contract indexer is not ready yet." });
            }

            const dashboard = await getDashboardAnalytics(db, contract);
            return res.json(dashboard);
        } catch (error) {
            return next(error);
        }
    });

    router.get("/volume", (req, res, next) => {
        try {
            const days = Number(req.query.days || 30);
            const data = getVolumeByDay(db, days);
            return res.json({ days, points: data });
        } catch (error) {
            return next(error);
        }
    });

    router.get("/topBorrowers", (req, res, next) => {
        try {
            return res.json(getTopBorrowers(db));
        } catch (error) {
            return next(error);
        }
    });

    router.get("/topLenders", async (req, res, next) => {
        try {
            const contract = indexer.getContract();
            if (!contract) {
                return res.status(503).json({ error: "Contract indexer is not ready yet." });
            }

            const result = await getTopLenders(db, contract);
            return res.json(result);
        } catch (error) {
            return next(error);
        }
    });

    router.get("/recent-events", (req, res, next) => {
        try {
            const limit = Math.max(1, Math.min(25, Number(req.query.limit || 10)));
            return res.json(getRecentEvents(db, limit));
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = {
    createAnalyticsRoutes
};
