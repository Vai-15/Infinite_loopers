const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please try again in a few minutes."
    }
});

const refreshScoreLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many score refresh requests. Please retry shortly."
    }
});

module.exports = {
    generalLimiter,
    refreshScoreLimiter
};
