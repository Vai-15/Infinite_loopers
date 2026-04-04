const { ethers } = require("ethers");

const STATUS = {
    OPEN: 0,
    FUNDED: 1,
    REPAID: 2,
    DEFAULTED: 3
};

const STATUS_LABELS = {
    [STATUS.OPEN]: "Open",
    [STATUS.FUNDED]: "Funded",
    [STATUS.REPAID]: "Repaid",
    [STATUS.DEFAULTED]: "Defaulted"
};

function normalizeLoan(loan) {
    return {
        id: Number(loan.id),
        borrower: loan.borrower,
        lender: loan.lender,
        amount: loan.amount,
        amountEth: Number(ethers.utils.formatEther(loan.amount)),
        duration: Number(loan.duration),
        startTime: Number(loan.startTime),
        status: Number(loan.status),
        interestRate: Number(loan.interestRate)
    };
}

async function fetchAllLoans(contract) {
    const counter = Number(await contract.loanCounter());
    if (counter === 0) {
        return [];
    }

    const loans = await Promise.all(
        Array.from({ length: counter }, (_, index) => contract.getLoan(index + 1))
    );

    return loans.map(normalizeLoan);
}

function getCached(db, key, maxAgeSeconds) {
    const cached = db.prepare("SELECT value, computedAt FROM analytics_cache WHERE key = ?").get(key);
    if (!cached) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - Number(cached.computedAt) > maxAgeSeconds) {
        return null;
    }

    try {
        return JSON.parse(cached.value);
    } catch (error) {
        return null;
    }
}

function setCached(db, key, value) {
    const payload = JSON.stringify(value);
    const computedAt = Math.floor(Date.now() / 1000);

    db.prepare(
        `
        INSERT INTO analytics_cache(key, value, computedAt)
        VALUES(?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            computedAt = excluded.computedAt
        `
    ).run(key, payload, computedAt);
}

async function getOverview(db, contract) {
    const cacheKey = "overview";
    const cached = getCached(db, cacheKey, 20);
    if (cached) {
        return cached;
    }

    const loans = await fetchAllLoans(contract);
    const totalLoans = loans.length;
    const activeLoans = loans.filter((loan) => loan.status === STATUS.OPEN || loan.status === STATUS.FUNDED).length;
    const repaidLoans = loans.filter((loan) => loan.status === STATUS.REPAID).length;
    const defaultedLoans = loans.filter((loan) => loan.status === STATUS.DEFAULTED).length;

    const totalVolume = loans.reduce((sum, loan) => sum + loan.amountEth, 0);

    const trustRows = db.prepare("SELECT AVG(score) AS avgTrustScore FROM trust_scores").get();
    const avgTrustScore = Number(trustRows?.avgTrustScore || 0);

    const avgInterestRate =
        totalLoans === 0
            ? 0
            : loans.reduce((sum, loan) => sum + loan.interestRate, 0) / totalLoans;

    const overview = {
        totalLoans,
        totalVolume: Number(totalVolume.toFixed(4)),
        activeLoans,
        repaidLoans,
        defaultRate: totalLoans === 0 ? 0 : Number(((defaultedLoans / totalLoans) * 100).toFixed(2)),
        avgInterestRate: Number(avgInterestRate.toFixed(2)),
        avgTrustScore: Number(avgTrustScore.toFixed(2))
    };

    setCached(db, cacheKey, overview);
    return overview;
}

function getStatusBreakdown(loans) {
    const counts = {
        Open: 0,
        Funded: 0,
        Repaid: 0,
        Defaulted: 0
    };

    loans.forEach((loan) => {
        const label = STATUS_LABELS[loan.status] || "Open";
        counts[label] += 1;
    });

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

function getDurationBuckets(loans) {
    const buckets = [
        { bucket: "7d", min: 0, max: 7, count: 0 },
        { bucket: "14d", min: 8, max: 14, count: 0 },
        { bucket: "30d", min: 15, max: 30, count: 0 },
        { bucket: "60d", min: 31, max: 60, count: 0 },
        { bucket: "90d", min: 61, max: 365, count: 0 }
    ];

    loans.forEach((loan) => {
        const days = Math.ceil(loan.duration / 86400);
        const bucket = buckets.find((entry) => days >= entry.min && days <= entry.max);
        if (bucket) {
            bucket.count += 1;
        }
    });

    return buckets.map(({ bucket, count }) => ({ bucket, count }));
}

function getTrustScoreDistribution(db) {
    const rows = db.prepare("SELECT score FROM trust_scores").all();

    const bins = [
        { range: "0-20", min: 0, max: 20, count: 0 },
        { range: "21-40", min: 21, max: 40, count: 0 },
        { range: "41-60", min: 41, max: 60, count: 0 },
        { range: "61-80", min: 61, max: 80, count: 0 },
        { range: "81-100", min: 81, max: 100, count: 0 }
    ];

    rows.forEach((row) => {
        const score = Number(row.score || 0);
        const bin = bins.find((entry) => score >= entry.min && score <= entry.max);
        if (bin) {
            bin.count += 1;
        }
    });

    return bins.map(({ range, count }) => ({ range, count }));
}

function getVolumeByDay(db, days = 30) {
    const normalizedDays = Math.max(1, Math.min(365, Number(days) || 30));
    const start = Math.floor(Date.now() / 1000) - normalizedDays * 24 * 60 * 60;

    const rows = db
        .prepare(
            `
            SELECT timestamp, amount
            FROM events
            WHERE eventType = 'LoanFunded'
              AND timestamp >= ?
            ORDER BY timestamp ASC
            `
        )
        .all(start);

    const series = new Map();

    rows.forEach((row) => {
        const day = new Date(Number(row.timestamp) * 1000).toISOString().slice(0, 10);
        const amountEth = Number(ethers.utils.formatEther(row.amount));
        series.set(day, (series.get(day) || 0) + amountEth);
    });

    return Array.from(series.entries()).map(([day, volumeEth]) => ({
        day,
        volumeEth: Number(volumeEth.toFixed(4))
    }));
}

function getTopBorrowers(db) {
    return db
        .prepare(
            `
            SELECT address, score, totalLoans, repaidLoans, defaultedLoans, lastUpdated
            FROM trust_scores
            ORDER BY score DESC, repaidLoans DESC
            LIMIT 5
            `
        )
        .all();
}

async function getTopLenders(db, contract) {
    const rows = db
        .prepare(
            `
            SELECT address, amount
            FROM events
            WHERE eventType = 'LoanFunded'
            `
        )
        .all();

    const byAddress = new Map();

    rows.forEach((row) => {
        const prev = byAddress.get(row.address) || ethers.BigNumber.from(0);
        byAddress.set(row.address, prev.add(row.amount));
    });

    const loans = await fetchAllLoans(contract);
    const lendersByStats = new Map();

    loans.forEach((loan) => {
        if (!loan.lender || loan.lender === ethers.constants.AddressZero) {
            return;
        }

        const lender = loan.lender.toLowerCase();
        if (!lendersByStats.has(lender)) {
            lendersByStats.set(lender, {
                activeLoans: 0,
                earnedInterestWei: ethers.BigNumber.from(0)
            });
        }

        const current = lendersByStats.get(lender);
        if (loan.status === STATUS.FUNDED) {
            current.activeLoans += 1;
        }
        if (loan.status === STATUS.REPAID) {
            const interestWei = loan.amount.mul(loan.interestRate).div(100);
            current.earnedInterestWei = current.earnedInterestWei.add(interestWei);
        }
    });

    return Array.from(byAddress.entries())
        .map(([address, totalWei]) => ({
            address,
            totalEth: Number(ethers.utils.formatEther(totalWei)),
            activeLoans: lendersByStats.get(address)?.activeLoans || 0,
            earnedInterest: Number(
                ethers.utils.formatEther(
                    lendersByStats.get(address)?.earnedInterestWei || ethers.BigNumber.from(0)
                )
            )
        }))
        .sort((a, b) => b.totalEth - a.totalEth)
        .slice(0, 5);
}

function getRecentEvents(db, limit = 10) {
    const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 10));

    return db
        .prepare(
            `
            SELECT id, eventType, loanId, address, amount, txHash, blockNumber, timestamp
            FROM events
            ORDER BY blockNumber DESC, timestamp DESC
            LIMIT ?
            `
        )
        .all(normalizedLimit);
}

async function getDashboardAnalytics(db, contract) {
    const [overview, loans] = await Promise.all([getOverview(db, contract), fetchAllLoans(contract)]);

    return {
        overview,
        statusBreakdown: getStatusBreakdown(loans),
        durationBuckets: getDurationBuckets(loans),
        trustDistribution: getTrustScoreDistribution(db)
    };
}

module.exports = {
    getOverview,
    getDashboardAnalytics,
    getVolumeByDay,
    getTopBorrowers,
    getTopLenders,
    getRecentEvents,
    getStatusBreakdown,
    getDurationBuckets,
    getTrustScoreDistribution,
    fetchAllLoans,
    normalizeLoan
};
