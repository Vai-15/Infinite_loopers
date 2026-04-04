const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying TrustLend with account: ${deployer.address}`);

    const TrustLend = await hre.ethers.getContractFactory("TrustLend");
    const trustLend = await TrustLend.deploy();
    await trustLend.waitForDeployment();

    const deployedAddress = await trustLend.getAddress();
    console.log(`TrustLend deployed to: ${deployedAddress}`);

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const addressesPath = path.join(deploymentsDir, "addresses.json");

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    let existing = {};
    if (fs.existsSync(addressesPath)) {
        try {
            existing = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
        } catch (error) {
            console.warn("Could not parse existing addresses.json, creating a fresh file.");
        }
    }

    existing[hre.network.name] = {
        TrustLend: deployedAddress,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(addressesPath, JSON.stringify(existing, null, 2));
    console.log(`Deployment addresses saved to: ${addressesPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
