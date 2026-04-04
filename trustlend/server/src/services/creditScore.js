const SIX_MONTHS_SECONDS = 6 * 30 * 24 * 60 * 60;

function clampScore(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function getLabel(score) {
    if (score >= 80) {
        return "Excellent";
    }
    if (score >= 60) {
        return "Good";
    }
    if (score >= 40) {
        return "Fair";
    }
    return "Poor";
}

function readAddressStats(db, address) {
    const stats = db
        .prepare(
            `
            SELECT
                SUM(CASE WHEN eventType = 'LoanCreated' THEN 1 ELSE 0 END) AS createdLoans,
                SUM(CASE WHEN eventType = 'LoanRepaid' THEN 1 ELSE 0 END) AS repaidLoans,
                SUM(CASE WHEN eventType = 'LoanDefaulted' THEN 1 ELSE 0 END) AS defaultedLoans,
                MIN(timestamp) AS firstSeenTimestamp
            FROM events
            WHERE address = ?
            `
        )
        .get(address);

    const createdLoans = Number(stats.createdLoans || 0);
    const repaidLoans = Number(stats.repaidLoans || 0);
    const defaultedLoans = Number(stats.defaultedLoans || 0);

    return {
        totalLoans: Math.max(createdLoans, repaidLoans + defaultedLoans),
        repaidLoans,
        defaultedLoans,
        firstSeenTimestamp: Number(stats.firstSeenTimestamp || 0)
    };
}

function computeBreakdown(stats) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const hasHistory = stats.totalLoans > 0;

    const baseScore = hasHistory ? 50 : 0;
    const repaidBonus = Math.min(stats.repaidLoans * 10, 40);
    const defaultPenalty = stats.defaultedLoans * 20;
    const walletAgeBonus =
        hasHistory && stats.firstSeenTimestamp > 0 && nowSeconds - stats.firstSeenTimestamp > SIX_MONTHS_SECONDS
            ? 5
            : 0;
    const consistencyBonus = stats.repaidLoans >= 2 ? 5 : 0;

    const rawScore = baseScore + repaidBonus - defaultPenalty + walletAgeBonus + consistencyBonus;
    const score = clampScore(rawScore);

    return {
        score,
        label: getLabel(score),
        breakdown: {
            baseScore,
            repaidBonus,
            defaultPenalty: -defaultPenalty,
            walletAgeBonus,
            consistencyBonus,
            totalLoans: stats.totalLoans,
            repaidLoans: stats.repaidLoans,
            defaultedLoans: stats.defaultedLoans
        }
    };
}

function computeAndPersistScore(db, address) {
    const wallet = address.toLowerCase();
    const stats = readAddressStats(db, wallet);
    const result = computeBreakdown(stats);
    const lastUpdated = new Date().toISOString();

    db.prepare(
        `
        INSERT INTO trust_scores(address, score, totalLoans, repaidLoans, defaultedLoans, lastUpdated)
        VALUES(@address, @score, @totalLoans, @repaidLoans, @defaultedLoans, @lastUpdated)
        ON CONFLICT(address) DO UPDATE SET
            score = excluded.score,
            totalLoans = excluded.totalLoans,
            repaidLoans = excluded.repaidLoans,
            defaultedLoans = excluded.defaultedLoans,
            lastUpdated = excluded.lastUpdated
        `
    ).run({
        address: wallet,
        score: result.score,
        totalLoans: stats.totalLoans,
        repaidLoans: stats.repaidLoans,
        defaultedLoans: stats.defaultedLoans,
        lastUpdated
    });

    return {
        ...result,
        lastUpdated
    };
}

function getStoredScore(db, address) {
    return db
        .prepare(
            `
            SELECT address, score, totalLoans, repaidLoans, defaultedLoans, lastUpdated
            FROM trust_scores
            WHERE address = ?
            `
        )
        .get(address.toLowerCase());
}

module.exports = {
    computeAndPersistScore,
    getStoredScore,
    getLabel
};
