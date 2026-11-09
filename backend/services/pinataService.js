const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const logger = require("../utils/logger");

/**
 * Pinata IPFS 服务
 * 用于将文件上传到IPFS网络
 */
class PinataService {
  constructor() {
    this.apiKey = process.env.PINATA_API_KEY;
    this.secretKey = process.env.PINATA_SECRET_API_KEY;
    this.baseUrl = "https://api.pinata.cloud";

    if (!this.apiKey || !this.secretKey) {
      logger.warn("⚠️  Pinata API密钥未配置，将使用模拟模式");
      this.usingMock = true;
    } else {
      this.usingMock = false;
    }
  }

  /**
   * 上传文件到IPFS（支持文件路径或Buffer）
   * @param {string|Buffer} fileSource - 文件路径或Buffer
   * @param {string} fileName - 文件名
   * @returns {Promise<{cid: string, size: number, fileName: string}>}
   */
  async uploadFile(fileSource, fileName) {
    logger.info(`📤 开始上传文件到IPFS: ${fileName}`);

    if (this.usingMock) {
      const mockCid = this.generateMockCID();
      logger.info(`✅ [模拟] 文件上传成功，CID: ${mockCid}`);
      return {
        cid: mockCid,
        size: 0,
        fileName: fileName
      };
    }

    try {
      const formData = new FormData();

      if (Buffer.isBuffer(fileSource)) {
        formData.append("file", fileSource, {
          filename: fileName
        });
      } else {
        formData.append("file", fs.createReadStream(fileSource), {
          filename: fileName
        });
      }

      // 添加元数据
      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          type: "contract-evidence"
        }
      });
      formData.append("pinataMetadata", metadata);

      // 添加选项
      const options = JSON.stringify({
        cidVersion: 1
      });
      formData.append("pinataOptions", options);

      const response = await axios.post(
        `${this.baseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.secretKey
          }
        }
      );

      const result = {
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        fileName: fileName
      };

      logger.info(`✅ 文件上传成功，CID: ${result.cid}, 大小: ${result.size} bytes`);
      return result;
    } catch (error) {
      logger.error(`❌ 文件上传失败: ${error.message}`);
      if (error.response) {
        logger.error(`   状态码: ${error.response.status}`);
        logger.error(`   错误信息: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`IPFS上传失败: ${error.message}`);
    }
  }

  /**
   * 通过URL上传文件到IPFS
   * @param {string} fileUrl - 文件URL
   * @returns {Promise<{cid: string}>}
   */
  async uploadFromURL(fileUrl) {
    logger.info(`📤 从URL上传到IPFS: ${fileUrl}`);

    if (this.usingMock) {
      const mockCid = this.generateMockCID();
      logger.info(`✅ [模拟] URL文件上传成功，CID: ${mockCid}`);
      return { cid: mockCid };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/pinning/pinJSONToIPFS`,
        {
          pinataContent: {
            url: fileUrl,
            uploadedAt: new Date().toISOString()
          },
          pinataMetadata: {
            name: `External file - ${Date.now()}`
          },
          pinataOptions: {
            cidVersion: 1
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.secretKey
          }
        }
      );

      const result = {
        cid: response.data.IpfsHash
      };

      logger.info(`✅ URL文件上传成功，CID: ${result.cid}`);
      return result;
    } catch (error) {
      logger.error(`❌ URL文件上传失败: ${error.message}`);
      throw new Error(`IPFS URL上传失败: ${error.message}`);
    }
  }

  /**
   * 获取文件元数据
   * @param {string} cid - IPFS CID
   * @returns {Promise<Object>}
   */
  async getFileMetadata(cid) {
    logger.info(`🔍 查询IPFS文件元数据: ${cid}`);

    if (this.usingMock) {
      return {
        cid: cid,
        name: "mock-file",
        size: 1024,
        uploadedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/data/pinList?hashContains=${cid}`,
        {
          headers: {
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.secretKey
          }
        }
      );

      if (response.data.rows && response.data.rows.length > 0) {
        return response.data.rows[0];
      }
      throw new Error("文件不存在");
    } catch (error) {
      logger.error(`❌ 获取文件元数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成模拟CID（用于测试）
   * @returns {string}
   */
  generateMockCID() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "Qm";
    for (let i = 0; i < 44; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * 获取IPFS网关URL
   * @param {string} cid - IPFS CID
   * @returns {string}
   */
  getGatewayURL(cid) {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
}

module.exports = new PinataService();