import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

const { ethers } = await network.connect();

function deploymentFileName(chainId) {
  if (chainId === 80001n) return "mumbai";
  if (chainId === 31337n) return "hardhat";
  return `chain-${chainId}`;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC:", usdcAddr);

  const DID = await ethers.getContractFactory("DecentralizedID");
  const did = await DID.deploy(deployer.address);
  await did.waitForDeployment();
  console.log("DecentralizedID:", await did.getAddress());

  const Rep = await ethers.getContractFactory("ReputationNFT");
  const rep = await Rep.deploy(deployer.address);
  await rep.waitForDeployment();
  console.log("ReputationNFT:", await rep.getAddress());

  const Vault = await ethers.getContractFactory("EscrowVault");
  const vault = await Vault.deploy(usdcAddr, deployer.address);
  await vault.waitForDeployment();
  console.log("EscrowVault:", await vault.getAddress());

  const Factory = await ethers.getContractFactory("LoanFactory");
  const factory = await Factory.deploy(
    await did.getAddress(),
    await rep.getAddress(),
    await vault.getAddress(),
    usdcAddr,
    deployer.address,
  );
  await factory.waitForDeployment();
  console.log("LoanFactory:", await factory.getAddress());

  const DAO = await ethers.getContractFactory("TrustDAO");
  const dao = await DAO.deploy(
    await rep.getAddress(),
    await factory.getAddress(),
  );
  await dao.waitForDeployment();
  console.log("TrustDAO:", await dao.getAddress());

  await factory.setTrustDAO(await dao.getAddress());
  await rep.setAuthorized(await factory.getAddress(), true);
  await rep.setAuthorized(await vault.getAddress(), true);
  await vault.setLoanFactory(await factory.getAddress());

  const net = await ethers.provider.getNetwork();
  const name = deploymentFileName(net.chainId);

  const deployment = {
    network: name,
    chainId: net.chainId.toString(),
    deployer: deployer.address,
    MockUSDC: usdcAddr,
    DecentralizedID: await did.getAddress(),
    ReputationNFT: await rep.getAddress(),
    EscrowVault: await vault.getAddress(),
    LoanFactory: await factory.getAddress(),
    TrustDAO: await dao.getAddress(),
  };

  const dir = join(process.cwd(), "deployments");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.json`);
  writeFileSync(path, JSON.stringify(deployment, null, 2));
  console.log("Wrote", path);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
