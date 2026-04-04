const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { computeAndPersistScore } = require("./creditScore");

const EVENT_NAMES = ["LoanCreated", "LoanFunded", "LoanRepaid", "LoanDefaulted"];

function resolveAbiPath(customPath) {
    const candidates = [
        customPath,
        path.resolve(__dirname, "../../../client/public/abi/TrustLend.json"),
        path.resolve(__dirname, "../../../blockchain/artifacts/contracts/TrustLend.sol/TrustLend.json")
    ].filter(Boolean);

    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
        throw new Error("Unable to locate TrustLend ABI. Set TRUSTLEND_ABI_PATH in .env");
    }

    return found;
}

function createIndexer({ db, rpcUrl, contractAddress, abiPath }) {
    if (!contractAddress) {
        throw new Error("Missing TRUSTLEND_CONTRACT_ADDRESS.");
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const normalizedAddress = contractAddress.toLowerCase();
    let contract = null;

    const insertEventStatement = db.prepare(
        `
        INSERT OR IGNORE INTO events(id, eventType, loanId, address, amount, txHash, blockNumber, timestamp)
        VALUES(@id, @eventType, @loanId, @address, @amount, @txHash, @blockNumber, @timestamp)
        `
    );

    async function initializeContract() {
        const fullPath = resolveAbiPath(abiPath);
        const artifact = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        const abi = artifact.abi || artifact;
        contract = new ethers.Contract(normalizedAddress, abi, provider);
    }

    async function mapEventRecord(eventName, args) {
        const loanId = Number(args.loanId || args[0]);

        if (eventName === "LoanCreated") {
            return {
                loanId,
                address: args.borrower.toLowerCase(),
                amount: args.amount.toString(),
                borrowerForScore: null
            };
        }

        const loan = await contract.getLoan(loanId);
        const borrower = loan.borrower.toLowerCase();

        if (eventName === "LoanFunded") {
            return {
                loanId,
                address: args.lender.toLowerCase(),
                amount: loan.amount.toString(),
                borrowerForScore: null
            };
        }

        if (eventName === "LoanRepaid") {
            const total = loan.amount.add(loan.amount.mul(loan.interestRate).div(100));
            return {
                loanId,
                address: args.borrower.toLowerCase(),
                amount: total.toString(),
                borrowerForScore: borrower
            };
        }

        return {
            loanId,
            address: borrower,
            amount: loan.amount.toString(),
            borrowerForScore: borrower
        };
    }

    async function processLog(eventName, log) {
        const block = await provider.getBlock(log.blockNumber);
        const mapped = await mapEventRecord(eventName, log.args);

        const payload = {
            id: `${log.transactionHash}-${log.logIndex}`,
            eventType: eventName,
            loanId: mapped.loanId,
            address: mapped.address,
            amount: mapped.amount,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: Number(block.timestamp)
        };

        insertEventStatement.run(payload);

        if ((eventName === "LoanRepaid" || eventName === "LoanDefaulted") && mapped.borrowerForScore) {
            computeAndPersistScore(db, mapped.borrowerForScore);
        }
    }

    async function syncHistoricalEvents(fromBlock = 0, toBlock = "latest") {
        if (!contract) {
            await initializeContract();
        }

        const allLogs = [];
        for (const eventName of EVENT_NAMES) {
            const logs = await contract.queryFilter(contract.filters[eventName](), fromBlock, toBlock);
            logs.forEach((log) => {
                allLogs.push({ eventName, log });
            });
        }

        allLogs.sort((a, b) => {
            if (a.log.blockNumber !== b.log.blockNumber) {
                return a.log.blockNumber - b.log.blockNumber;
            }
            return a.log.logIndex - b.log.logIndex;
        });

        for (const entry of allLogs) {
            await processLog(entry.eventName, entry.log);
        }

        return allLogs.length;
    }

    async function syncAddressEvents(address) {
        if (!contract) {
            await initializeContract();
        }

        const wallet = address.toLowerCase();

        const [created, funded, repaid, defaulted] = await Promise.all([
            contract.queryFilter(contract.filters.LoanCreated(null, wallet), 0, "latest"),
            contract.queryFilter(contract.filters.LoanFunded(null, wallet), 0, "latest"),
            contract.queryFilter(contract.filters.LoanRepaid(null, wallet), 0, "latest"),
            contract.queryFilter(contract.filters.LoanDefaulted(), 0, "latest")
        ]);

        const relevantDefaulted = [];
        for (const log of defaulted) {
            const loan = await contract.getLoan(Number(log.args.loanId));
            const borrower = loan.borrower.toLowerCase();
            const lender = loan.lender.toLowerCase();
            if (borrower === wallet || lender === wallet) {
                relevantDefaulted.push(log);
            }
        }

        const grouped = [
            ...created.map((log) => ({ eventName: "LoanCreated", log })),
            ...funded.map((log) => ({ eventName: "LoanFunded", log })),
            ...repaid.map((log) => ({ eventName: "LoanRepaid", log })),
            ...relevantDefaulted.map((log) => ({ eventName: "LoanDefaulted", log }))
        ];

        grouped.sort((a, b) => {
            if (a.log.blockNumber !== b.log.blockNumber) {
                return a.log.blockNumber - b.log.blockNumber;
            }
            return a.log.logIndex - b.log.logIndex;
        });

        for (const entry of grouped) {
            await processLog(entry.eventName, entry.log);
        }

        const refreshed = computeAndPersistScore(db, wallet);

        return {
            syncedEvents: grouped.length,
            score: refreshed.score,
            lastUpdated: refreshed.lastUpdated
        };
    }

    function attachLiveListeners() {
        EVENT_NAMES.forEach((eventName) => {
            contract.on(eventName, async (...listenerArgs) => {
                try {
                    const log = listenerArgs[listenerArgs.length - 1];
                    await processLog(eventName, log);
                } catch (error) {
                    console.error(`[Indexer] Live event processing failed for ${eventName}:`, error.message);
                }
            });
        });
    }

    async function start() {
        if (!contract) {
            await initializeContract();
        }

        const latest = await provider.getBlockNumber();
        const processed = await syncHistoricalEvents(0, latest);
        attachLiveListeners();

        return {
            latestBlock: latest,
            processedEvents: processed
        };
    }

    function stop() {
        if (contract) {
            contract.removeAllListeners();
        }
    }

    return {
        start,
        stop,
        syncHistoricalEvents,
        syncAddressEvents,
        getContract: () => contract,
        getProvider: () => provider
    };
}

module.exports = {
    createIndexer
};
