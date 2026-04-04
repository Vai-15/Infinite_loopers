CREATE TABLE IF NOT EXISTS loan_metadata (
    loanId INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    purpose TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ipfsHash TEXT
);

CREATE TABLE IF NOT EXISTS trust_scores (
    address TEXT PRIMARY KEY,
    score INTEGER NOT NULL,
    totalLoans INTEGER NOT NULL DEFAULT 0,
    repaidLoans INTEGER NOT NULL DEFAULT 0,
    defaultedLoans INTEGER NOT NULL DEFAULT 0,
    lastUpdated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    eventType TEXT NOT NULL CHECK (eventType IN ('LoanCreated', 'LoanFunded', 'LoanRepaid', 'LoanDefaulted')),
    loanId INTEGER NOT NULL,
    address TEXT NOT NULL,
    amount TEXT NOT NULL,
    txHash TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    computedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(eventType);
CREATE INDEX IF NOT EXISTS idx_events_loan ON events(loanId);
CREATE INDEX IF NOT EXISTS idx_events_address ON events(address);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
