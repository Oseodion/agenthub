import * as dotenv from "dotenv";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

dotenv.config();

const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
});

async function main() {
  console.log("Deploying AgentHubEscrow to X Layer mainnet...");

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("PRIVATE_KEY not set in .env");

  const account = privateKeyToAccount(privateKey);
  console.log("Deploying with account:", account.address);

  const publicClient = createPublicClient({ chain: xlayer, transport: http() });
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("OKB balance:", Number(balance) / 1e18);

  // Read compiled artifact
  const fs = await import("fs");
  const artifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/AgentHubEscrow.sol/AgentHubEscrow.json", "utf8")
  );

  const walletClient = createWalletClient({ account, chain: xlayer, transport: http() });

  const USDC_ADDRESS = "0x74b7F16337b8972027F6196A17a631aC6dE26d22";

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [USDC_ADDRESS],
  });

  console.log("Transaction hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("✅ Deployed to:", receipt.contractAddress);
  console.log("Explorer: https://web3.okx.com/explorer/x-layer/address/" + receipt.contractAddress);
}

main().catch(console.error);