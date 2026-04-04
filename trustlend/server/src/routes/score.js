const express = require("express");
const { refreshScoreLimiter } = require("../middleware/rateLimit");
const { validateAddressParam } = require("../middleware/validator");
const { computeAndPersistScore } = require("../services/creditScore");

function createScoreRoutes({ db, indexer }) {
    const router = express.Router();

    router.get("/:address", validateAddressParam("address"), async (req, res, next) => {
        try {
            const address = req.params.address;
            const result = computeAndPersistScore(db, address);
            return res.json(result);
        } catch (error) {
            return next(error);
        }
    });

    router.post(
        "/refresh/:address",
        refreshScoreLimiter,
        validateAddressParam("address"),
        async (req, res, next) => {
            try {
                const address = req.params.address;
                const syncResult = await indexer.syncAddressEvents(address);
                const result = computeAndPersistScore(db, address);

                return res.json({
                    ...result,
                    syncedEvents: syncResult.syncedEvents
                });
            } catch (error) {
                return next(error);
            }
        }
    );

    return router;
}

module.exports = {
    createScoreRoutes
};
