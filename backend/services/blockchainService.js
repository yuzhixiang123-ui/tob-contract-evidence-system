const { ethers } = require("ethers");
const logger = require("../utils/logger");

/**
 * 区块链服务
 * 用于与智能合约交互
 */
class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
  }

  normalizeNumber(value) {
    if (typeof value === "bigint") {
      return Number(value);
    }

    if (value && typeof value.toNumber === "function") {
      return value.toNumber();
    }

    return Number(value);
  }

  getContractInterface() {
    return require("../abi/ContractEvidence.json");
  }

  createReadonlyContract(contractAddress) {
    const normalizedAddress = contractAddress.trim();
    const abi = this.getContractInterface();
    return new ethers.Contract(normalizedAddress, abi, this.provider);
  }

  /**
   * 初始化区块链连接
   */
  async initialize() {
    try {
      const networkUrl = (process.env.BLOCKCHAIN_URL || "http://127.0.0.1:8545").trim();
      const privateKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
      const contractAddress = process.env.CONTRACT_ADDRESS ? process.env.CONTRACT_ADDRESS.trim() : "";

      logger.info(`🔗 初始化区块链连接...`);
      logger.info(`   网络URL: ${networkUrl}`);

      // 创建 provider
      this.provider = new ethers.JsonRpcProvider(networkUrl);

      // 检查网络连接
      const network = await this.provider.getNetwork();
      logger.info(`   网络ChainID: ${network.chainId}`);

      if (contractAddress) {
        await this.loadContract(contractAddress, privateKey);
      }

      logger.info("✅ 区块链服务初始化完成");
    } catch (error) {
      logger.error(`❌ 区块链初始化失败: ${error.message}`);
      // 不抛出错误，允许系统在区块链不可用时继续运行
    }
  }

  /**
   * 加载合约
   * @param {string} contractAddress - 合约地址
   * @param {string} privateKey - 私钥（可选）
   */
  async loadContract(contractAddress, privateKey) {
    try {
      const normalizedAddress = contractAddress.trim();
      const abi = this.getContractInterface();

      if (privateKey) {
        // 创建签名者
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(normalizedAddress, abi, this.wallet);
        logger.info(`   合约已加载（签名模式），地址: ${normalizedAddress}`);
      } else {
        // 只读模式
        this.contract = new ethers.Contract(normalizedAddress, abi, this.provider);
        logger.info(`   合约已加载（只读模式），地址: ${normalizedAddress}`);
      }
    } catch (error) {
      logger.error(`❌ 加载合约失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 存储合同到区块链
   * @param {string} cid - IPFS CID
   * @param {string} hash - 文件哈希
   * @param {string} fromAddress - 上传者地址
   * @returns {Promise<{contractId: number, txHash: string, blockNumber: number}>}
   */
  async storeContract(cid, hash, fromAddress) {
    try {
      logger.info(`📝 存储合同到区块链...`);
      logger.info(`   IPFS CID: ${cid}`);
      logger.info(`   文件哈希: ${hash}`);
      logger.info(`   上传者: ${fromAddress}`);

      if (!this.contract) {
        throw new Error("区块链合约未初始化");
      }

      // 连接签名者（如果还没有）
      let signedContract = this.contract;
      if (this.wallet) {
        signedContract = this.contract.connect(this.wallet);
      }

      // 发送交易
      const tx = await signedContract.storeContract(cid, hash);
      logger.info(`   交易已发送，哈希: ${tx.hash}`);

      // 等待确认
      const receipt = await tx.wait();
      logger.info(`   交易已确认，区块: ${receipt.blockNumber}`);

      // 解析事件获取合同ID
      const event = receipt.logs.find(log => log.fragment?.name === "ContractStored");
      let contractId = 1;

      if (event && event.args && event.args[0]) {
        contractId = this.normalizeNumber(event.args[0]);
      }

      const result = {
        contractId: contractId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      };

      logger.info(`✅ 合同存储成功，ID: ${contractId}`);
      return result;
    } catch (error) {
      logger.error(`❌ 存储合同失败: ${error.message}`);
      if (error.reason) {
        logger.error(`   原因: ${error.reason}`);
      }
      throw error;
    }
  }

  /**
   * 审批合同
   * @param {number} contractId - 合同ID
   * @param {string} approverAddress - 审批者地址
   * @returns {Promise<{success: boolean, txHash: string}>}
   */
  async approveContract(contractId, approverAddress) {
    try {
      logger.info(`✅ 审批合同，ID: ${contractId}，审批者: ${approverAddress}`);

      if (!this.contract) {
        throw new Error("区块链合约未初始化");
      }

      const signedContract = this.contract.connect(this.wallet);
      const tx = await signedContract.approveContract(contractId);
      await tx.wait();

      logger.info(`✅ 合同审批成功`);
      return { success: true, txHash: tx.hash };
    } catch (error) {
      logger.error(`❌ 审批合同失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 拒绝合同
   * @param {number} contractId - 合同ID
   * @param {string} rejecterAddress - 拒绝者地址
   * @returns {Promise<{success: boolean, txHash: string}>}
   */
  async rejectContract(contractId, rejecterAddress) {
    try {
      logger.info(`❌ 拒绝合同，ID: ${contractId}，操作者: ${rejecterAddress}`);

      if (!this.contract) {
        throw new Error("区块链合约未初始化");
      }

      const signedContract = this.contract.connect(this.wallet);
      const tx = await signedContract.rejectContract(contractId);
      await tx.wait();

      logger.info(`✅ 合同拒绝成功`);
      return { success: true, txHash: tx.hash };
    } catch (error) {
      logger.error(`❌ 拒绝合同失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询合同详情
   * @param {number} contractId - 合同ID
   * @returns {Promise<Object>}
   */
  async getContract(contractId) {
    return this.getContractAt(contractId);
  }

  async getContractAt(contractId, contractAddress) {
    try {
      logger.info(`🔍 查询合同，ID: ${contractId}${contractAddress ? `, 合约: ${contractAddress}` : ""}`);

      const targetContract = contractAddress
        ? this.createReadonlyContract(contractAddress)
        : this.contract;

      if (!targetContract) {
        throw new Error("区块链合约未初始化");
      }

      const result = await targetContract.getContract(contractId);

      const contractData = {
        id: this.normalizeNumber(result[0]),
        cid: result[1],
        hash: result[2],
        uploader: result[3],
        approver: result[4],
        status: this.normalizeNumber(result[5]),
        timestamp: this.normalizeNumber(result[6])
      };

      logger.info(`✅ 合同查询成功`);
      return contractData;
    } catch (error) {
      logger.error(`❌ 查询合同失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证合同哈希
   * @param {number} contractId - 合同ID
   * @param {string} hash - 要验证的哈希
   * @returns {Promise<boolean>}
   */
  async verifyHash(contractId, hash) {
    return this.verifyHashAt(contractId, hash);
  }

  async verifyHashAt(contractId, hash, contractAddress) {
    try {
      logger.info(`🔐 验证合同哈希，ID: ${contractId}${contractAddress ? `, 合约: ${contractAddress}` : ""}`);

      const targetContract = contractAddress
        ? this.createReadonlyContract(contractAddress)
        : this.contract;

      if (!targetContract) {
        throw new Error("区块链合约未初始化");
      }

      const isValid = await targetContract.verifyHash(contractId, hash);
      logger.info(`   验证结果: ${isValid}`);
      return isValid;
    } catch (error) {
      logger.error(`❌ 验证哈希失败: ${error.message}`);
      throw error;
    }
  }

  async getContractAddressByTxHash(txHash) {
    try {
      if (!this.provider || !txHash) {
        return null;
      }

      const transaction = await this.provider.getTransaction(txHash);
      if (transaction?.to) {
        return transaction.to;
      }

      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt?.to || null;
    } catch (error) {
      logger.warn(`⚠️  通过交易哈希获取合约地址失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取合同总数
   * @returns {Promise<number>}
   */
  async getContractCount() {
    try {
      if (!this.contract) {
        return 0;
      }
      const count = await this.contract.getContractCount();
      return this.normalizeNumber(count);
    } catch (error) {
      logger.error(`❌ 获取合同总数失败: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new BlockchainService();
