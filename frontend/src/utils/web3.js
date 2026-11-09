import { ethers } from "ethers";

const CONTRACT_ADDRESS = (process.env.REACT_APP_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3").trim();

const ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "contractId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "cid", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "hash", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "uploader", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ContractStored",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "string", "name": "hash", "type": "string" }
    ],
    "name": "storeContract",
    "outputs": [{ "internalType": "uint256", "name": "contractId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "contractId", "type": "uint256" }],
    "name": "getContract",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "string", "name": "hash", "type": "string" },
      { "internalType": "address", "name": "uploader", "type": "address" },
      { "internalType": "address", "name": "approver", "type": "address" },
      { "internalType": "uint8", "name": "status", "type": "uint8" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * 检查MetaMask是否已安装
 */
export const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== "undefined";
};

/**
 * 连接MetaMask钱包
 */
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("请安装MetaMask钱包插件！");
  }

  try {
    // ethers v5 使用 Web3Provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (accounts.length === 0) {
      throw new Error("请在MetaMask中连接一个账户");
    }

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const chainId = await provider.getNetwork().then((network) => network.chainId);

    // 保存连接状态到本地
    localStorage.setItem("walletAddress", address);
    localStorage.setItem("walletConnected", true);
    console.log("✅ MetaMask已连接");
    console.log("   地址:", address);
    console.log("   ChainID:", chainId);

    return {
      provider,
      signer,
      address,
      chainId,
    };
  } catch (error) {
    console.error("❌ 连接MetaMask失败:", error);
    throw error;
  }
};

/**
 * 断开MetaMask连接（清除本地状态）
 */
export const disconnectWallet = () => {
  localStorage.removeItem("walletAddress");
  localStorage.removeItem("walletConnected");
};

/**
 * 获取当前连接的账户
 */
export const getCurrentAccount = async () => {
  if (!isMetaMaskInstalled()) {
    return null;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error("获取账户失败:", error);
    return null;
  }
};

/**
 * 监听账户变化
 */
export const onAccountChanged = (callback) => {
  if (!isMetaMaskInstalled()) return;

  window.ethereum.on("accountsChanged", (accounts) => {
    callback(accounts.length > 0 ? accounts[0] : null);
  });
};

/**
 * 监听网络变化
 */
export const onNetworkChanged = (callback) => {
  if (!isMetaMaskInstalled()) return;

  window.ethereum.on("chainChanged", (chainId) => {
    callback(parseInt(chainId, 16));
  });
};

/**
 * 切换到指定网络
 */
export const switchNetwork = async (targetChainId) => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask未安装");
  }

  const chainIdHex = `0x${targetChainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      throw new Error("网络未添加，请先添加网络");
    }
    throw switchError;
  }
};

/**
 * 上传合同到区块链
 * @param {ethers.Signer} signer - 签名者
 * @param {string} ipfsCid - IPFS CID
 * @param {string} fileHash - 文件哈希
 * @returns {Promise<{txHash: string, contractId: number}>}
 */
export const storeContractOnChain = async (signer, ipfsCid, fileHash, options = {}) => {
  const { timeout = 120 } = options;
  let { gasLimit = 500000 } = options;

  let txHash = null;
  let isTransactionSent = false;

  try {
    console.log("🚀 开始上链存证...");
    console.log("   IPFS CID:", ipfsCid);
    console.log("   文件哈希:", fileHash);
    console.log("   合约地址:", CONTRACT_ADDRESS);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // 尝试进行 gas 预估，这样可以在实际发送交易前捕获 revert 错误
    console.log("⏳ 正在预估 Gas...");
    try {
      const estimatedGas = await contract.estimateGas.storeContract(ipfsCid, fileHash);
      // 增加 20% 的 buffer 确保交易成功
      gasLimit = estimatedGas.mul(120).div(100);
      console.log("   Gas 预估成功:", gasLimit.toString());
    } catch (estError) {
      console.warn("⚠️ Gas 预估失败，使用默认值:", gasLimit, estError.message);
      // 如果预估失败，可能是合约逻辑报错（例如：revert）
      if (estError.message && estError.message.includes("reverted")) {
        const revertErr = new Error("合约逻辑执行失败（Reverted），请检查参数或合约状态");
        revertErr.originalError = estError;
        throw revertErr;
      }
    }

    console.log("⏳ 发送交易...");
    // 增加 1000ms 延迟，确保 MetaMask 在 Gas 预估后有充分时间响应实际请求
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 简化交易参数：让 MetaMask 自动处理 gasPrice 和 EIP-1559 费用
    // 这样可以减少因为手动计算错误或与 MetaMask 内部冲突导致的 "signal is aborted" 或 "Failed to fetch" 错误。
    const txOptions = {
      gasLimit: gasLimit
    };

    // 如果网络不是本地测试网（Hardhat），我们尝试不传 type: 0，让 MetaMask 决定使用 EIP-1559
    // Sepolia 完美支持 EIP-1559，手动指定 Legacy 模式有时反而会出问题
    const network = await signer.provider.getNetwork();
    if (network.chainId === 31337) {
      txOptions.type = 0; // 本地网络强制使用 Legacy
      const gasPrice = await signer.getGasPrice();
      txOptions.gasPrice = gasPrice;
      console.log("   本地网络模式: 使用 Legacy 交易", gasPrice.toString());
    } else {
      console.log("   公共网络模式: 让 MetaMask 决定 Gas 参数");
    }

    // 将 contract.storeContract 替换为更底层的 signer.sendTransaction 以获得更好的兼容性
    const data = contract.interface.encodeFunctionData("storeContract", [ipfsCid, fileHash]);
    const tx = await signer.sendTransaction({
      to: CONTRACT_ADDRESS,
      data: data,
      ...txOptions
    });
    txHash = tx.hash;
    isTransactionSent = true;
    console.log("   交易已发送，哈希:", txHash);

    console.log("⏳ 等待区块链确认 (最多 " + timeout + " 秒)...");

    let receipt;
    let waitSuccess = false;

    try {
      receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("交易确认超时，请检查MetaMask中的pending交易")), timeout * 1000)
        )
      ]);
      waitSuccess = true;
    } catch (waitError) {
      if (waitError.message && waitError.message.includes("超时")) {
        console.warn("⚠️ 交易确认超时，但交易可能仍在区块链上处理");
        const err = new Error("交易确认超时，请稍后在MetaMask中查看交易状态");
        err.code = "TIMEOUT";
        err.txHash = txHash;
        throw err;
      }

      if (waitError.code === "ACTION_REJECTED" || waitError.code === 4001 || waitError.code === -32603) {
        const err = new Error("用户取消了交易或请求超时");
        err.code = "USER_REJECTED";
        err.txHash = txHash;
        throw err;
      }

      if (waitError.message && waitError.message.includes("replacement fee too low")) {
        const err = new Error("交易失败：Gas费用过低，请重试");
        err.code = "GAS_ERROR";
        err.txHash = txHash;
        throw err;
      }

      if (waitError.reason === "replaced" || waitError.reason === "cancelled") {
        const err = new Error("交易被替换或取消");
        err.code = "REPLACED";
        err.txHash = txHash;
        throw err;
      }

      throw waitError;
    }

    console.log("✅ 交易已确认，区块:", receipt.blockNumber);

    let contractId = 1;
    try {
      // 在 ethers v5 中，receipt.logs 包含原始日志
      // 我们需要通过 contract 接口解析日志
      const events = receipt.logs
        .map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .filter(e => e && e.name === "ContractStored");

      if (events.length > 0 && events[0].args) {
        const event = events[0];
        contractId = event.args.contractId || event.args[0];
        if (contractId.toNumber) {
          contractId = contractId.toNumber();
        }
      }
    } catch (parseError) {
      console.warn("解析事件失败，使用默认ID:", parseError.message);
    }

    console.log("✅ 上链存证成功！");
    console.log("   合同ID:", contractId);
    console.log("   交易哈希:", txHash);

    return {
      contractId,
      txHash: txHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    // 捕获 MetaMask 的特定 RPC 错误
    if (error.code === -32603 || (error.message && error.message.includes("signal is aborted"))) {
      console.error("❌ MetaMask RPC 错误:", error);
      const err = new Error("MetaMask 内部请求被中断（signal is aborted）。这通常是由于网络连接不稳、MetaMask 扩展内部状态冲突或 nonce 序列错误导致。解决办法：请在 MetaMask 中「设置」->「高级」->「重置账户/清除活动数据」，然后刷新页面重试。");
      err.code = "METAMASK_RPC_ERROR";
      err.txHash = txHash;
      throw err;
    }

    if (error.code === "USER_REJECTED" || error.code === "TIMEOUT" || error.code === "GAS_ERROR" || error.code === "REPLACED") {
      console.warn("⚠️ 上链存证失败:", error.message, error.code ? "Code:" + error.code : "");
      if (error.txHash) {
        console.warn("   交易哈希:", error.txHash, "(可在区块链上查询)");
      }
      throw error;
    }
    console.error("❌ 上链存证失败:", error);
    const err = new Error(error.message || "上链存证失败，请检查网络连接");
    err.code = error.code || "UNKNOWN";
    err.txHash = txHash;
    if (isTransactionSent && txHash) {
      err.pendingMessage = "交易已发送但确认失败，交易哈希: " + txHash + "，可在MetaMask中查看pending交易";
    }
    throw err;
  }
};

/**
 * 从区块链获取合同信息
 */
export const getContractFromChain = async (provider, contractId) => {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const result = await contract.getContract(contractId);

    return {
      id: result[0].toNumber(),
      cid: result[1],
      hash: result[2],
      uploader: result[3],
      approver: result[4],
      status: result[5],
      timestamp: result[6].toNumber()
    };
  } catch (error) {
    console.error("获取合同失败:", error);
    throw error;
  }
};

/**
 * 获取区块链上的合同总数
 */
export const getContractCountFromChain = async (provider) => {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const count = await contract.getContractCount();
    return count.toNumber();
  } catch (error) {
    console.error("获取合同总数失败:", error);
    return 0;
  }
};

/**
 * 检查环境健康状况 (预防 "明天坏了" 的常见问题)
 */
export const checkEnvironmentHealth = async (provider, signer) => {
  try {
    // 1. 检查网络 ID
    const network = await provider.getNetwork();
    const expectedChainId = 11155111; // Sepolia 测试网
    if (network.chainId !== expectedChainId) {
      return {
        ok: false,
        message: `网络不匹配：当前 ChainID 为 ${network.chainId}，请在 MetaMask 中切换到 Sepolia (11155111) 网络。`
      };
    }

    // 2. 检查合约是否存在于该地址
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x" || code === "0x0") {
      return {
        ok: false,
        message: `合约未部署：在地址 ${CONTRACT_ADDRESS} 未发现合约代码。如果您最近重新部署过合约，请确保已更新 .env 中的 CONTRACT_ADDRESS。`
      };
    }

    // 3. 检查余额
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    // 至少需要 0.001 ETH 来确保支付 Gas 费用
    const minBalance = ethers.utils.parseEther("0.001");
    if (balance.lt(minBalance)) {
      return {
        ok: false,
        message: `余额不足：您的账户余额为 ${ethers.utils.formatEther(balance)} ETH，建议至少预留 0.001 ETH 以确保支付 Gas 费用。`
      };
    }

    return { ok: true, message: "✅ 环境检查通过" };
  } catch (error) {
    console.error("环境检查失败:", error);
    return { ok: false, message: "环境检查失败：" + error.message };
  }
};

export { CONTRACT_ADDRESS };
