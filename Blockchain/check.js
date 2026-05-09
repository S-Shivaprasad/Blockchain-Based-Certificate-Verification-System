import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const SupremeABI = JSON.parse(
  fs.readFileSync(path.resolve("./artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json"))
);
const CollegeABI = JSON.parse(
  fs.readFileSync(path.resolve("./artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json"))
);


const SUPREME_AUTHORITY_ADDRESS = "0x25DD463F4aCD009C9f7d72215B9E1cC03e794B03";
const COLLEGE_REGISTRY_ADDRESS = "0x91eE6f85D3bd437AfA250DFba715d14AF0e984B6";
const walletToCheck = "0x3eB14cDe7FcC199e01510Ba55A3A4868dEAf3fC5";

async function checkRoles() {
  const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/4723bd49b8264279b30e308c36a73aa1");

  const supremeContract = new ethers.Contract(
    SUPREME_AUTHORITY_ADDRESS,
    SupremeABI.abi,
    provider
  );

  const supremeWallet = await supremeContract.supreme();
  console.log("Supreme wallet:", supremeWallet);
  if (supremeWallet.toLowerCase() === walletToCheck.toLowerCase()) return console.log("Role: Supreme");

  const isBoard = await supremeContract.isApprovedBoard(walletToCheck);
  console.log("Is Board?", isBoard);
  if (isBoard) return console.log("Role: Board");

  const collegeContract = new ethers.Contract(
    COLLEGE_REGISTRY_ADDRESS,
    CollegeABI.abi,
    provider
  );
  const isCollege = await collegeContract.isActive(walletToCheck);
  console.log("Is College?", isCollege);
  if (isCollege) return console.log("Role: College");

  console.log("Role: Student");
}

checkRoles();
