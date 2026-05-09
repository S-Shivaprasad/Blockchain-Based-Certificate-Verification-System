import { useEffect } from "react";
import { ethers } from "ethers";

import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import BoardABI from "../../../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";
import CollegeRegistryABI from "../../../../Blockchain/artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json";

import {
SUPREME_AUTHORITY_ADDRESS,
BOARD_AUTHORITY_ADDRESS,
COLLEGE_REGISTRY_ADDRESS
} from "../../config/Contract";

export default function CheckConfig(){

useEffect(()=>{

const run = async()=>{

try{

const JNTUH =
"0xAd5D871E106fB031044389fc65fa6dE90A96107d";

const MGIT =
"0x6fecdb9ffc24873c847b4a1a19457393304693b8";

const DEGREE =
"0x26192c8258e221ed532d74cf0c28d626227e605321a93f1af6e7331a681f099a";


const provider =
new ethers.BrowserProvider(window.ethereum);

const supreme =
new ethers.Contract(
SUPREME_AUTHORITY_ADDRESS,
SupremeABI.abi,
provider
);

const board =
new ethers.Contract(
BOARD_AUTHORITY_ADDRESS,
BoardABI.abi,
provider
);

const registry =
new ethers.Contract(
COLLEGE_REGISTRY_ADDRESS,
CollegeRegistryABI.abi,
provider
);


console.log("\n========= CHECK START =========\n");

const degreeValid =
await supreme.isDegreeValid(DEGREE);

console.log("Degree Valid:", degreeValid);


const mappedBoard =
await registry.getCollegeBoard(MGIT);

console.log("Mapped Board:", mappedBoard);

console.log("Expected Board:", JNTUH);


const canIssue =
await board.canIssue(
JNTUH,
MGIT,
DEGREE
);

console.log("Can Issue:", canIssue);


console.log("\n========= RESULT =========");

if(!degreeValid)
console.log("❌ Degree NOT approved by Supreme");

if(mappedBoard.toLowerCase() !== JNTUH.toLowerCase())
console.log("❌ College NOT mapped to JNTUH");

if(!canIssue)
console.log("❌ Board not allowed to issue");

if(
degreeValid &&
mappedBoard.toLowerCase() === JNTUH.toLowerCase() &&
canIssue
){
console.log("✅ Everything OK");
}

}catch(err){

console.error("Check Failed:", err);

}

};

run();

},[]);

return (
<div className="p-6 bg-black text-green-400 rounded">
Check Console (F12 → Console)
</div>
);

}