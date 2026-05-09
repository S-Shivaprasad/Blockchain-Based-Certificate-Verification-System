const { ethers } = require("hardhat");
const fs = require("fs");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function deployContract(name, args = []) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy(...args);
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log(`✔ ${name} deployed at: ${address}`);
  return { contract, address };
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("🚀 DEPLOYMENT STARTED");
  console.log("========================================");

  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name);
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(
      await deployer.provider.getBalance(deployer.address)
    ),
    "ETH\n"
  );

  if (network.chainId === 1n) {
    throw new Error("❌ Refusing to deploy on Mainnet");
  }

  /* ============================================================
     1️⃣ SupremeAuthority
  ============================================================ */
  const { contract: supreme, address: supremeAddress } =
    await deployContract("SupremeAuthority");

  await delay(2000);

  

  /* ============================================================
     2️⃣ Register Degrees
  ============================================================ */
  console.log("\n📚 Registering Degrees...");

  const degrees = [
    { name: "10TH", level: 1 },
    { name: "INTER", level: 2 },
    { name: "DIPLOMA", level: 3 },
    { name: "BTECH", level: 4 },
    { name: "MTECH", level: 5 },
    { name: "PHD", level: 6 },
  ];

  const names = degrees.map((d) => d.name);
  const levels = degrees.map((d) => d.level);

  try {
    const tx = await supreme.batchRegisterDegrees(names, levels);
    await tx.wait(1);
    console.log("   ✔ Batch degree registration successful");
  } catch {
    console.log("   ⚠ Batch fallback...");
    for (const deg of degrees) {
      const tx = await supreme.registerDegree(deg.name, deg.level);
      await tx.wait(1);
      console.log(`   ✔ ${deg.name}`);
    }
  }

  /* ============================================================
     3️⃣ CollegeRegistry
  ============================================================ */
  const {
    contract: collegeRegistry,
    address: collegeRegistryAddress,
  } = await deployContract("CollegeRegistry", [supremeAddress]);

  await delay(1500);

  let tx1 = await supreme.setCollegeRegistry(collegeRegistryAddress);
await tx1.wait(1);

console.log("   ✔ Supreme → CollegeRegistry linked");
  /* ============================================================
     4️⃣ BoardAuthority
  ============================================================ */
  const {
    contract: boardAuthority,
    address: boardAuthorityAddress,
  } = await deployContract("BoardAuthority", [
    supremeAddress,
    collegeRegistryAddress,
  ]);

  await delay(1500);

  /* ============================================================
     5️⃣ CertificateStorage
  ============================================================ */
  const {
    contract: certificateStorage,
    address: certificateStorageAddress,
  } = await deployContract("CertificateStorage", [
    supremeAddress,
  ]);

  await delay(1500);

  /* ============================================================
     6️⃣ CertificateIssuer
  ============================================================ */
  const {
    contract: certificateIssuer,
    address: certificateIssuerAddress,
  } = await deployContract("CertificateIssuer", [
    certificateStorageAddress,
    supremeAddress,
    collegeRegistryAddress,
    boardAuthorityAddress,
  ]);

  await delay(1500);

  /* ============================================================
     7️⃣ CertificateVerification
  ============================================================ */
  const {
    contract: verification,
    address: verificationAddress,
  } = await deployContract("CertificateVerification", [
    certificateStorageAddress,
  ]);

  await delay(1500);

  /* ============================================================
     8️⃣ LINK CONTRACTS
  ============================================================ */
  console.log("\n🔗 Linking Contracts...");

  let tx;

  tx = await supreme.setCertificateIssuer(certificateIssuerAddress);
  await tx.wait(1);
  console.log("   ✔ Supreme → Issuer linked");

  tx = await certificateStorage.setIssuerContract(
    certificateIssuerAddress
  );
  await tx.wait(1);
  console.log("   ✔ Storage → Issuer linked");

  console.log(
    "   🔍 Issuer in storage:",
    await certificateStorage.issuerContract()
  );

  console.log(
    "   🔍 Issuer in supreme:",
    await supreme.certificateIssuer()
  );

  await delay(1500);

console.log("\n🔗 Linking CollegeRegistry to Supreme...");



  console.log("\n========================================");
  console.log("✅ ALL CONTRACTS DEPLOYED SUCCESSFULLY");
  console.log("========================================\n");

  const deployed = {
    SupremeAuthority: supremeAddress,
    CollegeRegistry: collegeRegistryAddress,
    BoardAuthority: boardAuthorityAddress,
    CertificateStorage: certificateStorageAddress,
    CertificateIssuer: certificateIssuerAddress,
    CertificateVerification: verificationAddress,
  };

  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deployed, null, 2)
  );

  const envFormat = Object.entries(deployed)
    .map(([k, v]) => `${k.toUpperCase()}=${v}`)
    .join("\n");

  fs.writeFileSync("deployments.env", envFormat);

  console.log("📌 ADD THESE TO YOUR FRONTEND:");
  console.log(deployed);

  console.log("\n💾 Saved to deployments.json & deployments.env");
  console.log("🎉 Deployment Complete!");
}

main().catch((error) => {
  console.error("\n❌ Deployment Failed:");
  console.error(error);
  process.exitCode = 1;
});