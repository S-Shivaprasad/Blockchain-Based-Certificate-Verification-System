const { expect } = require("chai");
const { ethers } = require("hardhat");
const { plot, stack } = require("nodeplotlib"); // npm i nodeplotlib

describe("🎓 FULL CERTIFICATE SYSTEM – LOCAL DEPLOY & GAS TEST", function () {
  let supreme, collegeRegistry, boardAuthority, storage, issuer, verification;
  let deployer, board, student, student2, student3, college;
  let degreeId;

  // Store gas usage per function
  const gasReport = {};

  before(async function () {
    [deployer, board, student, student2, student3, college] = await ethers.getSigners();

    /* ---------------- DEPLOY CONTRACTS ---------------- */
    const Supreme = await ethers.getContractFactory("SupremeAuthority");
    supreme = await Supreme.deploy();
    await supreme.waitForDeployment();

    const CollegeRegistry = await ethers.getContractFactory("CollegeRegistry");
    collegeRegistry = await CollegeRegistry.deploy(await supreme.getAddress());
    await collegeRegistry.waitForDeployment();

    await supreme.setCollegeRegistry(await collegeRegistry.getAddress());

    const BoardAuthority = await ethers.getContractFactory("BoardAuthority");
    boardAuthority = await BoardAuthority.deploy(
      await supreme.getAddress(),
      await collegeRegistry.getAddress()
    );
    await boardAuthority.waitForDeployment();

    const Storage = await ethers.getContractFactory("CertificateStorage");
    storage = await Storage.deploy(await supreme.getAddress());
    await storage.waitForDeployment();

    const Issuer = await ethers.getContractFactory("CertificateIssuer");
    issuer = await Issuer.deploy(
      await storage.getAddress(),
      await supreme.getAddress(),
      await collegeRegistry.getAddress(),
      await boardAuthority.getAddress()
    );
    await issuer.waitForDeployment();

    const Verification = await ethers.getContractFactory("CertificateVerification");
    verification = await Verification.deploy(await storage.getAddress());
    await verification.waitForDeployment();

    /* ---------------- CONFIGURE SYSTEM ---------------- */
    await storage.setIssuerContract(await issuer.getAddress());

    // Register a Degree
    const degreeName = "BTECH-CSE-2024";
    const degreeLevel = 1;
    await supreme.registerDegree(degreeName, degreeLevel);

    // Get degreeId from contract
    const degree = await supreme.getDegreeByNameAndLevel(degreeName, degreeLevel);
    degreeId = degree.degreeId;

    // Approve Board for this degree
    await supreme.connect(deployer).approveBoardForDegree(board.address, degreeId);

    // Register & Approve College
    await collegeRegistry.connect(board).registerCollege(
      college.address, "Oxford", "OX1", "ipfs://meta"
    );
    await boardAuthority.connect(board).approveCollege(college.address);
    await boardAuthority.connect(board).allowCollegeDegree(college.address, degreeId);

    console.log("✅ Full System Deployed & Configured Locally\n");
  });

  /* ---------------- HELPER: SIGNATURE GENERATION ---------------- */
  async function generateSignatures(studentAddr, collegeAddr, nonce, cid) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ["uint256","address","address","address","address","bytes32","string","uint256"],
      [chainId, await issuer.getAddress(), board.address, studentAddr.address, collegeAddr.address, degreeId, cid, nonce]
    );
    const hash = ethers.utils.keccak256(encoded);
    const digest = ethers.utils.arrayify(hash);

    const boardSig = await board.signMessage(digest);
    const collegeSig = await collegeAddr.signMessage(digest);

    return { boardSig, collegeSig };
  }

  /* ---------------- TESTS ---------------- */

  it("🎯 Issue Single Certificate & Estimate Gas", async function () {
    const cid = "QmSingleTest";
    const nonce = await storage.boardNonce(board.address);
    const { boardSig, collegeSig } = await generateSignatures(student, college, nonce, cid);

    const gas = await issuer.connect(board).issueCertificate.estimateGas(
      student.address, college.address, degreeId, cid, boardSig, collegeSig
    );
    gasReport["Single Issue"] = gas.toNumber();
    console.log(`   ⛽ Gas (Single Issue): ${gas}`);

    await issuer.connect(board).issueCertificate(
      student.address, college.address, degreeId, cid, boardSig, collegeSig
    );

    expect(await storage.getActiveCertificateCount(student.address)).to.equal(1);
  });

  it("🛡️ Prevent Replay Attacks", async function () {
    const cid = "QmSingleTest";
    const { boardSig, collegeSig } = await generateSignatures(student, college, 0n, cid);

    await expect(
      issuer.connect(board).issueCertificate(
        student.address, college.address, degreeId, cid, boardSig, collegeSig
      )
    ).to.be.revertedWithCustomError(issuer, "ReplayDetected");
  });

  it("🛡️ Reject Forged College Signatures", async function () {
    const cid = "QmHackerTest";
    const nonce = await storage.boardNonce(board.address);
    const { boardSig } = await generateSignatures(student, college, nonce, cid);

    const hackerSig = await deployer.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fake_hash")))
    );

    await expect(
      issuer.connect(board).issueCertificate(
        student.address, college.address, degreeId, cid, boardSig, hackerSig
      )
    ).to.be.revertedWithCustomError(issuer, "InvalidCollegeSignature");
  });

  it("📦 Batch Issue Certificates & Estimate Gas", async function () {
    const studentsToIssue = [student2, student3];
    const cids = ["QmBatch1", "QmBatch2"];

    const studentsAddr = [];
    const collegesAddr = [];
    const degreesArr = [];
    const boardSigs = [];
    const collegeSigs = [];

    let nonce = await storage.boardNonce(board.address);

    for (let i = 0; i < studentsToIssue.length; i++) {
      const { boardSig, collegeSig } = await generateSignatures(
        studentsToIssue[i],
        college,
        nonce,
        cids[i]
      );

      studentsAddr.push(studentsToIssue[i].address);
      collegesAddr.push(college.address);
      degreesArr.push(degreeId);
      boardSigs.push(boardSig);
      collegeSigs.push(collegeSig);

      nonce++;
    }

    const gas = await issuer.connect(board).batchIssueCertificates.estimateGas(
      studentsAddr, collegesAddr, degreesArr, cids, boardSigs, collegeSigs
    );
    gasReport[`Batch Issue ${studentsToIssue.length}`] = gas.toNumber();
    console.log(`   ⛽ Gas (Batch Issue ${studentsToIssue.length}): ${gas}`);

    await issuer.connect(board).batchIssueCertificates(
      studentsAddr, collegesAddr, degreesArr, cids, boardSigs, collegeSigs
    );

    expect(await storage.getActiveCertificateCount(student2.address)).to.equal(1);
    expect(await storage.getActiveCertificateCount(student3.address)).to.equal(1);
  });

  it("🛑 Revoke Certificate & Estimate Gas", async function () {
    const certId = 1;

    const gas = await issuer.connect(board).revokeCertificate.estimateGas(certId);
    gasReport["Revoke"] = gas.toNumber();
    console.log(`   ⛽ Gas (Revoke): ${gas}`);

    await issuer.connect(board).revokeCertificate(certId);

    const cert = await storage.getCertificate(certId);
    expect(cert.revoked).to.equal(true);
  });

  after(function () {
    // Plot Gas Usage Bar Chart
    const data = [{
      x: Object.keys(gasReport),
      y: Object.values(gasReport),
      type: 'bar',
      marker: { color: ['#4caf50','#2196f3','#ff9800','#f44336','#9c27b0'] }
    }];

    const layout = { title: "Gas Usage per Function", xaxis: { title: "Function" }, yaxis: { title: "Gas Units" } };

    stack(data, layout);
    plot();
  });
});