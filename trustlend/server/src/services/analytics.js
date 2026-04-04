const { ethers } = require("ethers");

const STATUS = {
    OPEN: 0,
    FUNDED: 1,
    REPAID: 2,
    DEFAULTED: 3
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

    const fundedOrClosed = loans.filter((loan) => loan.status !== STATUS.OPEN);
    const totalVolume = fundedOrClosed.reduce((sum, loan) => sum + loan.amountEth, 0);

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
        avgInterestRate: Number(avgInterestRate.toFixed(2))
    };

    setCached(db, cacheKey, overview);
    return overview;
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

function getTopLenders(db) {
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

    return Array.from(byAddress.entries())
        .map(([address, totalWei]) => ({
            address,
            totalEth: Number(ethers.utils.formatEther(totalWei))
        }))
        .sort((a, b) => b.totalEth - a.totalEth)
        .slice(0, 5);
}

module.exports = {
    getOverview,
    getVolumeByDay,
    getTopBorrowers,
    getTopLenders,
    fetchAllLoans,
    normalizeLoan
};
