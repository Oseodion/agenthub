import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    xlayer: {
      type: "http",
      url: process.env.XLAYER_RPC || "https://rpc.xlayer.tech",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 196,
    },
  },
  etherscan: {
    apiKey: {
      xlayer: "no-api-key-needed",
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://web3.okx.com/explorer/x-layer/api",
          browserURL: "https://web3.okx.com/explorer/x-layer",
        },
      },
    ],
  },
};

export default config;