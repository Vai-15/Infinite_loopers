const express = require("express");
const {
    getOverview,
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

    router.get("/topLenders", (req, res, next) => {
        try {
            return res.json(getTopLenders(db));
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = {
    createAnalyticsRoutes
};
