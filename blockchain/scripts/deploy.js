const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("🚀 开始部署合同存证智能合约...");
  console.log("========================================\n");

  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 部署者地址:", deployer.address);

  // 获取账户余额
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", hre.ethers.formatEther(balance), "ETH\n");

  // 部署合约
  console.log("⏳ 正在部署 ContractEvidence 合约...");
  const ContractEvidence = await hre.ethers.getContractFactory("ContractEvidence");

  const contract = await ContractEvidence.deploy();
  await contract.waitForDeployment();

  // 获取合约地址
  const contractAddress = await contract.getAddress();
  console.log("✅ 合约部署成功!");
  console.log("📍 合约地址:", contractAddress);
  console.log("🔗 区块链网络: Sepolia (Chain ID: 11155111)\n");

  // 保存部署信息
  const deploymentInfo = {
    address: contractAddress,
    deployer: deployer.address,
    network: "sepolia",
    chainId: 11155111,
    timestamp: new Date().toISOString(),
    abi: ContractEvidence.interface.format("json")
  };

  // 写入部署文件
  const deployedPath = path.join(__dirname, "../deployed-address.json");
  fs.writeFileSync(deployedPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 部署信息已保存到:", deployedPath);

  // 更新 .env 文件
  updateEnvFile(contractAddress);

  console.log("\n========================================");
  console.log("🎉 部署完成!");
  console.log("========================================");
  console.log("\n📋 后续步骤:");
  console.log("1. 确保已在 MetaMask 中切换到 Sepolia 网络");
  console.log("2. 运行部署脚本: npx hardhat run scripts/deploy.js --network sepolia");
  console.log("3. 更新 frontend/.env 中的 CONTRACT_ADDRESS");
}

function updateEnvFile(contractAddress) {
  try {
    const envPath = path.join(__dirname, "../../backend/.env");
    let envContent = "";

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // 检查是否已存在 CONTRACT_ADDRESS
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
    }

    fs.writeFileSync(envPath, envContent.trim() + "\n");
    console.log("✅ .env 文件已更新 CONTRACT_ADDRESS");
  } catch (error) {
    console.log("⚠️  无法更新 .env 文件:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败:", error);
    process.exit(1);
  });