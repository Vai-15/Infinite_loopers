const express = require("express");
const { validateLoanMetadataBody } = require("../middleware/validator");
const { normalizeLoan } = require("../services/analytics");

function createLoansRoutes({ db, indexer }) {
    const router = express.Router();

    router.post("/metadata", validateLoanMetadataBody, (req, res, next) => {
        try {
            const { loanId, description, purpose, ipfsHash } = req.body;

            db.prepare(
                `
                INSERT INTO loan_metadata(loanId, description, purpose, createdAt, ipfsHash)
                VALUES(@loanId, @description, @purpose, @createdAt, @ipfsHash)
                ON CONFLICT(loanId) DO UPDATE SET
                    description = excluded.description,
                    purpose = excluded.purpose,
                    ipfsHash = excluded.ipfsHash
                `
            ).run({
                loanId: Number(loanId),
                description,
                purpose,
                createdAt: new Date().toISOString(),
                ipfsHash: ipfsHash || null
            });

            return res.status(201).json({
                message: "Loan metadata saved.",
                loanId: Number(loanId)
            });
        } catch (error) {
            return next(error);
        }
    });

    router.get("/metadata/:loanId", (req, res, next) => {
        try {
            const loanId = Number(req.params.loanId);
            if (Number.isNaN(loanId)) {
                return res.status(400).json({ error: "loanId must be a number." });
            }

            const metadata = db
                .prepare(
                    `
                    SELECT loanId, description, purpose, createdAt, ipfsHash
                    FROM loan_metadata
                    WHERE loanId = ?
                    `
                )
                .get(loanId);

            if (!metadata) {
                return res.status(404).json({ error: "Metadata not found for this loan." });
            }

            return res.json(metadata);
        } catch (error) {
            return next(error);
        }
    });

    router.get("/active", async (req, res, next) => {
        try {
            const contract = indexer.getContract();
            if (!contract) {
                return res.status(503).json({ error: "Contract indexer is not ready yet." });
            }

            const openLoanIds = await contract.getOpenLoans();
            const items = [];

            for (const idValue of openLoanIds) {
                const loanId = Number(idValue);
                const loan = normalizeLoan(await contract.getLoan(loanId));
                const metadata = db
                    .prepare(
                        `
                        SELECT description, purpose, createdAt, ipfsHash
                        FROM loan_metadata
                        WHERE loanId = ?
                        `
                    )
                    .get(loanId);

                items.push({
                    ...loan,
                    durationDays: Math.round(loan.duration / 86400),
                    metadata: metadata || null
                });
            }

            return res.json(items);
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = {
    createLoansRoutes
};
