require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("dotenv").config();

function getPrivateKey() {
    if (!process.env.PRIVATE_KEY) {
        return [];
    }

    const key = process.env.PRIVATE_KEY.startsWith("0x")
        ? process.env.PRIVATE_KEY
        : `0x${process.env.PRIVATE_KEY}`;

    return [key];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {},
        localhost: {
            url: "http://127.0.0.1:8545"
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: getPrivateKey()
        }
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        showTimeSpent: true,
        coinmarketcap: process.env.COINMARKETCAP_API_KEY || undefined
    }
};
