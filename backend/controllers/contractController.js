const { getPool } = require("../config/database");
const axios = require("axios");
const pinataService = require("../services/pinataService");
const blockchainService = require("../services/blockchainService");
const logService = require("../services/logService");
const logger = require("../utils/logger");
const crypto = require("crypto");
const path = require("path");

const canReadAllContracts = (role) => role === "admin" || role === "auditor";
const canUploadContracts = (role) => role !== "auditor";
const canManageTemplates = (role) => role !== "auditor";
const getDownloadFileName = (contract) => {
  const sourceName = contract.file_path || contract.contract_name || `contract-${contract.id}`;
  return path.basename(sourceName);
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
};

const getDaysUntilExpiry = (expireAt) => {
  if (!expireAt) return null;
  const target = new Date(expireAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((startOfTarget - startOfToday) / (24 * 60 * 60 * 1000));
};

const getExpiryStatus = (expireAt) => {
  const days = getDaysUntilExpiry(expireAt);
  if (days === null) {
    return { daysUntilExpiry: null, expiryStatus: "none" };
  }
  if (days < 0) {
    return { daysUntilExpiry: days, expiryStatus: "expired" };
  }
  if (days <= 7) {
    return { daysUntilExpiry: days, expiryStatus: "expiring_soon" };
  }
  return { daysUntilExpiry: days, expiryStatus: "normal" };
};

/**
 * 合同控制器
 * 处理合同的上传、查询、审批和验证
 */

/**
 * 预处理合同上传
 * POST /api/contracts/prepare-upload
 */
exports.prepareContractUpload = async (req, res) => {
  try {
    if (!canUploadContracts(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能上传合同"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "请上传合同文件"
      });
    }

    const file = req.file;
    const fileHash = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    const ipfsResult = await pinataService.uploadFile(file.buffer, file.originalname);

    logger.info(`✅ 合同预处理成功: ${file.originalname}, CID: ${ipfsResult.cid}`);

    res.json({
      success: true,
      message: "合同预处理成功",
      data: {
        fileHash,
        ipfsCid: ipfsResult.cid,
        ipfsUrl: pinataService.getGatewayURL(ipfsResult.cid),
        fileName: file.originalname,
        fileSize: file.size
      }
    });
  } catch (error) {
    logger.error(`❌ 合同预处理失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "合同预处理失败",
      error: error.message
    });
  }
};

/**
 * 上传合同
 * POST /api/contracts/upload
 */
exports.uploadContract = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const {
      contractName,
      contractType,
      signerMy,
      signerOther,
      contractAmount,
      contractDescription,
      expireAt,
      templateId,
      baseContractId
    } = req.body;
    const userId = req.user.id;

    if (!canUploadContracts(req.user.role)) {
      logger.warn(`⚠️  权限不足: 审计员 ${userId} 尝试上传合同`);
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能上传合同"
      });
    }

    if (!req.file) {
      logger.error("❌ 上传失败: 未上传文件");
      return res.status(400).json({
        success: false,
        message: "请上传合同文件"
      });
    }

    if (!contractName) {
      logger.error("❌ 上传失败: 合同名称为空");
      return res.status(400).json({
        success: false,
        message: "请提供合同名称"
      });
    }

    const file = req.file;
    logger.info(`📤 开始处理合同上传: ${contractName}`);
    logger.info(`   文件名: ${file.originalname}`);
    logger.info(`   文件大小: ${file.size} bytes`);
    logger.info(`   上传者ID: ${userId}`);

    // 计算文件哈希 (SHA256)
    const fileHash = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");
    const submittedFileHash = req.body.fileHash || fileHash;

    if (submittedFileHash !== fileHash) {
      logger.warn(`⚠️ 上传失败: 文件哈希不一致 - 用户 ${userId}`);
      return res.status(400).json({
        success: false,
        message: "文件哈希校验失败，请重新上传"
      });
    }

    logger.info(`   文件哈希: ${fileHash}`);

    let ipfsCid = req.body.ipfsCid || null;

    if (!ipfsCid) {
      const ipfsResult = await pinataService.uploadFile(file.buffer, file.originalname);
      ipfsCid = ipfsResult.cid;
    }

    logger.info(`   IPFS CID: ${ipfsCid}`);

    // 存储到区块链
    let blockchainResult = null;
    let contractId = req.body.contractId || null;
    let txHash = req.body.txHash || null;
    let versionGroupId = null;
    let versionNo = 1;
    let previousVersionId = null;

    if (baseContractId) {
      const [baseContracts] = await connection.execute(
        `SELECT id, version_group_id, version_no
         FROM contracts
         WHERE id = ?`,
        [parseInt(baseContractId, 10)]
      );

      if (baseContracts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "基准合同不存在，无法创建新版本"
        });
      }

      previousVersionId = baseContracts[0].id;
      versionGroupId = baseContracts[0].version_group_id || baseContracts[0].id;

      const [versionRows] = await connection.execute(
        "SELECT COALESCE(MAX(version_no), 0) AS maxVersion FROM contracts WHERE version_group_id = ?",
        [versionGroupId]
      );
      versionNo = Number(versionRows[0].maxVersion || 0) + 1;
    }

    // 如果前端没有传 txHash，说明前端上链失败或未配置，尝试在后端补充上链（备用逻辑）
    if (!txHash) {
      try {
        const userAddress = req.body.wallet_address || "0x0000000000000000000000000000000000000000";
        blockchainResult = await blockchainService.storeContract(
          ipfsCid,
          fileHash,
          userAddress
        );
        contractId = blockchainResult.contractId;
        txHash = blockchainResult.txHash;
        logger.info(`   (后端补录) 区块链合同ID: ${contractId}`);
        logger.info(`   (后端补录) 交易哈希: ${txHash}`);
      } catch (blockchainError) {
        logger.warn(`⚠️  区块链存储失败（将继续保存到数据库）: ${blockchainError.message}`);
        // 区块链失败不影响整体流程
      }
    } else {
      logger.info(`   接收到前端上链数据 - 合同ID: ${contractId}, 交易哈希: ${txHash}`);
    }

    // 保存到数据库
    const [result] = await connection.execute(
      `INSERT INTO contracts
       (contract_name, contract_type, signer_my, signer_other, contract_amount, contract_description, expire_at, file_hash, ipfs_cid, tx_hash, contract_id, uploader_id, file_path, file_size, status, archive_status, template_id, version_group_id, version_no, previous_version_id, is_latest_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'active', ?, ?, ?, ?, 1)`,
      [
        contractName,
        contractType || null,
        signerMy || null,
        signerOther || null,
        contractAmount || null,
        contractDescription || null,
        formatDateTime(expireAt),
        submittedFileHash,
        ipfsCid || null,
        txHash || null,
        contractId || null,
        userId,
        file.originalname,
        file.size,
        templateId ? parseInt(templateId, 10) : null,
        versionGroupId,
        versionNo,
        previousVersionId
      ]
    );

    if (!versionGroupId) {
      versionGroupId = result.insertId;
      await connection.execute(
        "UPDATE contracts SET version_group_id = ? WHERE id = ?",
        [versionGroupId, result.insertId]
      );
    } else {
      await connection.execute(
        "UPDATE contracts SET is_latest_version = 0 WHERE version_group_id = ? AND id <> ?",
        [versionGroupId, result.insertId]
      );
    }

    // 记录操作日志
    await logService.recordLog(
      userId,
      baseContractId ? "CREATE_CONTRACT_VERSION" : "UPLOAD_CONTRACT",
      `${baseContractId ? "创建合同新版本" : "上传合同"}: ${contractName}, 版本 V${versionNo}, IPFS CID: ${ipfsCid}${expireAt ? `, 到期时间: ${expireAt}` : ""}`,
      req.ip
    );

    logger.info(`✅ 合同上传成功! ID: ${result.insertId}`);

    res.status(201).json({
      success: true,
      message: "合同上传成功",
      data: {
        id: result.insertId,
        contractName: contractName,
        fileHash: fileHash,
        ipfsCid: ipfsCid,
        ipfsUrl: pinataService.getGatewayURL(ipfsCid),
        txHash: txHash,
        blockchainContractId: contractId,
        contractType: contractType || null,
        expireAt: formatDateTime(expireAt),
        versionNo,
        versionGroupId,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`❌ 合同上传失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "合同上传失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 获取合同列表（分页）
 * GET /api/contracts?page=1&limit=10
 */
exports.getContracts = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    // 解析分页参数
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const keyword = req.query.keyword;
    const archiveStatus = req.query.archiveStatus || "active";
    const expiryFilter = req.query.expiryFilter || "";
    const userId = req.user.id;
    const canViewAllContracts = canReadAllContracts(req.user.role);

    // 参数验证
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const offset = (page - 1) * limit;

    logger.info(`📋 获取合同列表 - 页码: ${page}, 每页: ${limit}, 用户: ${userId}, 角色: ${req.user.role}, 关键词: ${keyword || "无"}`);

    // 构建查询条件
    let whereClause = canViewAllContracts ? "WHERE 1=1" : "WHERE c.uploader_id = ?";
    const params = canViewAllContracts ? [] : [userId];

    if (status) {
      whereClause += " AND c.status = ?";
      params.push(status);
    }

    if (archiveStatus === "archived") {
      whereClause += " AND c.archive_status = 'archived'";
    } else if (archiveStatus !== "all") {
      whereClause += " AND c.archive_status = 'active'";
    }

    if (keyword) {
      whereClause += " AND (c.contract_name LIKE ? OR c.signer_my LIKE ? OR c.signer_other LIKE ? OR c.file_hash LIKE ? OR c.contract_type LIKE ?)";
      const searchTerm = `%${keyword}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (expiryFilter === "expiring_soon") {
      whereClause += " AND c.expire_at IS NOT NULL AND DATEDIFF(c.expire_at, CURDATE()) BETWEEN 0 AND 7";
    } else if (expiryFilter === "expired") {
      whereClause += " AND c.expire_at IS NOT NULL AND DATEDIFF(c.expire_at, CURDATE()) < 0";
    } else if (expiryFilter === "normal") {
      whereClause += " AND (c.expire_at IS NULL OR DATEDIFF(c.expire_at, CURDATE()) > 7)";
    }

    // 获取总数
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM contracts c ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取合同列表（limit和offset直接拼接，因为已验证是整数）
    const [contracts] = await connection.execute(
      `SELECT
        c.id,
        c.contract_name,
        c.contract_type,
        c.signer_my,
        c.signer_other,
        c.contract_amount,
        c.contract_description,
        c.expire_at,
        c.file_hash,
        c.ipfs_cid,
        c.tx_hash,
        c.contract_id,
        c.status,
        c.archive_status,
        c.archived_at,
        c.version_group_id,
        c.version_no,
        c.is_latest_version,
        c.file_size,
        c.created_at,
        DATEDIFF(c.expire_at, CURDATE()) AS days_until_expiry,
        u.username as uploader_name
       FROM contracts c
       LEFT JOIN users u ON c.uploader_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    );

    logger.info(`✅ 获取合同列表成功，总数: ${total}`);

    res.json({
      success: true,
      data: contracts.map((contract) => ({
        ...contract,
        ...getExpiryStatus(contract.expire_at)
      })),
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`❌ 获取合同列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取合同列表失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 获取单个合同详情
 * GET /api/contracts/:id
 */
exports.getContractById = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const contractId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    logger.info(`🔍 获取合同详情 - ID: ${contractId}`);

    const [contracts] = await connection.execute(
      `SELECT
        c.*,
        u.username as uploader_name,
        a.username as approver_name,
        t.template_name
       FROM contracts c
       LEFT JOIN users u ON c.uploader_id = u.id
       LEFT JOIN users a ON c.approver_id = a.id
       LEFT JOIN contract_templates t ON c.template_id = t.id
       WHERE c.id = ?`,
      [contractId]
    );

    if (contracts.length === 0) {
      logger.warn(`⚠️  合同不存在 - ID: ${contractId}`);
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const contract = contracts[0];

    if (!canReadAllContracts(userRole) && contract.uploader_id !== userId) {
      logger.warn(`⚠️  权限不足: 用户 ${userId} 尝试访问合同 ${contractId}`);
      return res.status(403).json({
        success: false,
        message: "权限不足，您只能查看自己上传的合同"
      });
    }

    // 如果有区块链合同ID，尝试获取链上信息
    logger.info(`✅ 获取合同详情成功 - ID: ${contractId}`);

    res.json({
      success: true,
      data: {
        ...contract,
        ...getExpiryStatus(contract.expire_at),
        blockchain: null
      }
    });
  } catch (error) {
    logger.error(`❌ 获取合同详情失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取合同详情失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.downloadContractFile = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const contractId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    const [contracts] = await connection.execute(
      `SELECT id, contract_name, ipfs_cid, file_path, uploader_id
       FROM contracts
       WHERE id = ?`,
      [contractId]
    );

    if (contracts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const contract = contracts[0];

    if (!canReadAllContracts(userRole) && contract.uploader_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "权限不足，您只能下载自己上传的合同"
      });
    }

    if (!contract.ipfs_cid) {
      return res.status(400).json({
        success: false,
        message: "该合同暂无可下载文件"
      });
    }

    const fileResponse = await axios.get(pinataService.getGatewayURL(contract.ipfs_cid), {
      responseType: "stream",
      timeout: 30000
    });

    const fileName = encodeURIComponent(getDownloadFileName(contract));
    res.setHeader("Content-Type", fileResponse.headers["content-type"] || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${fileName}`);

    fileResponse.data.pipe(res);
  } catch (error) {
    logger.error(`❌ 下载合同失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "下载合同失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 审批合同
 * POST /api/contracts/approve
 */
exports.approveContract = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const { contractId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 权限校验：只有管理员可以审批
    if (userRole !== "admin") {
      logger.warn(`⚠️  权限不足: 非管理员用户 ${userId} 尝试审批合同 ${contractId}`);
      return res.status(403).json({
        success: false,
        message: "权限不足，只有管理员可以进行审批操作"
      });
    }

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "请提供合同ID"
      });
    }

    logger.info(`✅ 审批合同 - ID: ${contractId}, 审批者ID: ${userId}`);

    // 检查合同是否存在
    const [contracts] = await connection.execute(
      "SELECT * FROM contracts WHERE id = ?",
      [contractId]
    );

    if (contracts.length === 0) {
      logger.warn(`⚠️  审批失败: 合同不存在 - ID: ${contractId}`);
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const contract = contracts[0];

    if (contract.status !== "pending") {
      logger.warn(`⚠️  审批失败: 合同状态不是pending - ID: ${contractId}, 状态: ${contract.status}`);
      return res.status(400).json({
        success: false,
        message: "合同不是待审批状态"
      });
    }

    // 更新数据库状态
    await connection.execute(
      "UPDATE contracts SET status = 'approved', approver_id = ? WHERE id = ?",
      [userId, contractId]
    );

    // 更新区块链状态（如果可能）
    if (contract.contract_id) {
      try {
        await blockchainService.approveContract(contract.contract_id, req.body.wallet_address || "0x0000000000000000000000000000000000000000");
      } catch (error) {
        logger.warn(`⚠️  区块链审批失败: ${error.message}`);
      }
    }

    // 记录操作日志
    await logService.recordLog(
      userId,
      "APPROVE_CONTRACT",
      `审批通过合同 ID: ${contractId}`,
      req.ip
    );

    logger.info(`✅ 合同审批成功 - ID: ${contractId}`);

    res.json({
      success: true,
      message: "合同审批成功",
      data: {
        contractId: contractId,
        status: "approved",
        approvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`❌ 审批合同失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "审批合同失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 拒绝合同
 * POST /api/contracts/reject
 */
exports.rejectContract = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const { contractId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 权限校验：只有管理员可以拒绝
    if (userRole !== "admin") {
      logger.warn(`⚠️  权限不足: 非管理员用户 ${userId} 尝试拒绝合同 ${contractId}`);
      return res.status(403).json({
        success: false,
        message: "权限不足，只有管理员可以进行审批操作"
      });
    }

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "请提供合同ID"
      });
    }

    logger.info(`❌ 拒绝合同 - ID: ${contractId}, 操作者ID: ${userId}`);

    // 检查合同是否存在
    const [contracts] = await connection.execute(
      "SELECT * FROM contracts WHERE id = ?",
      [contractId]
    );

    if (contracts.length === 0) {
      logger.warn(`⚠️  拒绝失败: 合同不存在 - ID: ${contractId}`);
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const contract = contracts[0];

    if (contract.status !== "pending") {
      logger.warn(`⚠️  拒绝失败: 合同状态不是pending - ID: ${contractId}`);
      return res.status(400).json({
        success: false,
        message: "合同不是待审批状态"
      });
    }

    // 更新数据库状态
    await connection.execute(
      "UPDATE contracts SET status = 'rejected', approver_id = ? WHERE id = ?",
      [userId, contractId]
    );

    // 更新区块链状态（如果可能）
    if (contract.contract_id) {
      try {
        await blockchainService.rejectContract(contract.contract_id, req.body.wallet_address || "0x0000000000000000000000000000000000000000");
      } catch (error) {
        logger.warn(`⚠️  区块链拒绝失败: ${error.message}`);
      }
    }

    // 记录操作日志
    await logService.recordLog(
      userId,
      "REJECT_CONTRACT",
      `拒绝合同 ID: ${contractId}`,
      req.ip
    );

    logger.info(`✅ 合同拒绝成功 - ID: ${contractId}`);

    res.json({
      success: true,
      message: "合同拒绝成功",
      data: {
        contractId: contractId,
        status: "rejected",
        rejectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`❌ 拒绝合同失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "拒绝合同失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 验证合同
 * POST /api/contracts/verify
 */
exports.verifyContract = async (req, res) => {
  try {
    const { contractId, fileHash } = req.body;
    const rawContractId = contractId !== undefined && contractId !== null ? String(contractId).trim() : "";
    const normalizedContractId = rawContractId ? parseInt(rawContractId, 10) : null;
    const normalizedFileHash = typeof fileHash === "string" ? fileHash.trim().toLowerCase() : "";
    const hasContractIdInput = rawContractId !== "";
    const hasFileHashInput = normalizedFileHash !== "";
    const bothInputsProvided = hasContractIdInput && hasFileHashInput;

    if (!hasContractIdInput && !hasFileHashInput) {
      return res.status(400).json({
        success: false,
        message: "请提供合同ID或文件哈希"
      });
    }

    if (hasContractIdInput && (!/^\d+$/.test(rawContractId) || normalizedContractId <= 0)) {
      return res.status(400).json({
        success: false,
        message: "合同ID格式不正确，请输入正整数"
      });
    }

    if (hasFileHashInput && !/^[a-f0-9]{64}$/.test(normalizedFileHash)) {
      return res.status(400).json({
        success: false,
        message: "文件哈希格式不正确，请输入64位SHA256哈希"
      });
    }

    logger.info(`🔐 验证合同请求 - ID: ${normalizedContractId || "N/A"}, 哈希: ${normalizedFileHash || "N/A"}`);

    let verifyResult = {
      verified: false,           // 最终验证结果（区块链验证通过才算真正的verified）
      blockchainVerified: false, // 区块链验证结果
      databaseMatched: false,    // 数据库匹配结果
      onChainRecordFound: false,
      integrityVerified: false,
      method: "none",
      source: "none",
      contract: null,            // 数据库中的合同信息
      blockchain: null,          // 区块链上的合同信息
      verificationStatus: "unverified",
      trustLevel: "none",
      conclusion: "not_found",
      query: {
        contractId: normalizedContractId,
        fileHash: normalizedFileHash || null
      },
      contractAddress: process.env.CONTRACT_ADDRESS || null
    };

    const connection = await getPool().getConnection();
    let matchedContract = null;
    try {
      const whereConditions = [];
      const queryParams = [];

      if (normalizedFileHash) {
        whereConditions.push("c.file_hash = ?");
        queryParams.push(normalizedFileHash);
      }

      if (normalizedContractId) {
        whereConditions.push("(c.id = ? OR c.contract_id = ?)");
        queryParams.push(normalizedContractId, normalizedContractId);
      }

      if (whereConditions.length > 0) {
        const [contracts] = await connection.execute(
          `SELECT c.*, u.username as uploader_name
           FROM contracts c
           LEFT JOIN users u ON c.uploader_id = u.id
           WHERE ${whereConditions.join(" OR ")}
           ORDER BY c.created_at DESC
           LIMIT 20`,
          queryParams
        );

        if (bothInputsProvided) {
          matchedContract = contracts.find(
            (item) => item.file_hash === normalizedFileHash && (item.id === normalizedContractId || item.contract_id === normalizedContractId)
          ) || null;
        } else {
          matchedContract =
            contracts.find((item) => normalizedFileHash && item.file_hash === normalizedFileHash) ||
            contracts.find((item) => normalizedContractId && item.id === normalizedContractId) ||
            contracts.find((item) => normalizedContractId && item.contract_id === normalizedContractId) ||
            null;
        }
      }

      if (matchedContract) {
        verifyResult.databaseMatched = true;
        verifyResult.contract = matchedContract;
      }
    } finally {
      connection.release();
    }

    const blockchainContractId = matchedContract?.contract_id || (!matchedContract ? normalizedContractId : null);
    const blockchainContractAddress = matchedContract?.tx_hash
      ? await blockchainService.getContractAddressByTxHash(matchedContract.tx_hash)
      : null;
    verifyResult.contractAddress = blockchainContractAddress || verifyResult.contractAddress;

    if (blockchainContractId && normalizedFileHash) {
      try {
        const isValid = await blockchainService.verifyHashAt(
          blockchainContractId,
          normalizedFileHash,
          blockchainContractAddress
        );
        if (isValid) {
          verifyResult.onChainRecordFound = true;
          verifyResult.integrityVerified = true;
          verifyResult.blockchainVerified = true;
          verifyResult.verified = true;
          verifyResult.method = "blockchain";
          verifyResult.source = "blockchain";
          verifyResult.verificationStatus = "blockchain_verified";
          verifyResult.trustLevel = "high";
          verifyResult.blockchain = await blockchainService.getContractAt(
            blockchainContractId,
            blockchainContractAddress
          );
        }
      } catch (blockchainError) {
        logger.warn(`⚠️  区块链哈希验证异常: ${blockchainError.message}`);
      }
    } else if (blockchainContractId) {
      try {
        const blockchainContract = await blockchainService.getContractAt(
          blockchainContractId,
          blockchainContractAddress
        );
        if (blockchainContract && blockchainContract.id) {
          verifyResult.onChainRecordFound = true;
          verifyResult.blockchainVerified = true;
          verifyResult.verified = false;
          verifyResult.method = "blockchain_lookup";
          verifyResult.source = "blockchain";
          verifyResult.verificationStatus = "blockchain_record_only";
          verifyResult.trustLevel = "medium";
          verifyResult.blockchain = blockchainContract;
        }
      } catch (blockchainError) {
        logger.warn(`⚠️  区块链查询异常: ${blockchainError.message}`);
      }
    }

    if (verifyResult.databaseMatched && !verifyResult.verified) {
      verifyResult.method = "database";
      verifyResult.source = "database";
      verifyResult.verificationStatus = "database_only";
      verifyResult.trustLevel = "medium";
    }

    if (verifyResult.integrityVerified) {
      verifyResult.conclusion = "verified";
    } else if (verifyResult.onChainRecordFound) {
      verifyResult.conclusion = "on_chain_record_only";
    } else if (verifyResult.databaseMatched) {
      verifyResult.conclusion = "database_only";
    }

    const verifyTarget = matchedContract
      ? `${matchedContract.id}${matchedContract.contract_id ? `/${matchedContract.contract_id}` : ""}`
      : normalizedContractId || normalizedFileHash.substring(0, 10);

    await logService.recordLog(
      req.user?.id || null,
      "VERIFY_CONTRACT",
      `验证合同: ${verifyTarget}... 结果: ${verifyResult.verified ? "成功" : "失败"}`,
      req.ip
    );

    logger.info(`🔐 验证完成 - 结果: ${verifyResult.verified}, 方式: ${verifyResult.method}`);

    res.json({
      success: true,
      data: verifyResult
    });
  } catch (error) {
    logger.error(`❌ 验证合同失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "验证合同失败",
      error: error.message
    });
  }
};

exports.getContractVersions = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const contractId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    const [baseRows] = await connection.execute(
      "SELECT id, uploader_id, version_group_id FROM contracts WHERE id = ?",
      [contractId]
    );

    if (baseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const baseContract = baseRows[0];
    if (!canReadAllContracts(userRole) && baseContract.uploader_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "权限不足，您只能查看自己上传的合同版本"
      });
    }

    const versionGroupId = baseContract.version_group_id || baseContract.id;
    const [versions] = await connection.execute(
      `SELECT id, contract_name, status, archive_status, version_no, is_latest_version, created_at, updated_at
       FROM contracts
       WHERE version_group_id = ?
       ORDER BY version_no DESC, created_at DESC`,
      [versionGroupId]
    );

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    logger.error(`❌ 获取合同版本历史失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取合同版本历史失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.archiveContract = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const contractId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === "auditor") {
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能归档合同"
      });
    }

    const [rows] = await connection.execute(
      "SELECT id, contract_name, uploader_id, status, archive_status FROM contracts WHERE id = ?",
      [contractId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const contract = rows[0];
    if (userRole !== "admin" && contract.uploader_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅上传者或管理员可归档合同"
      });
    }

    if (contract.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "待审批合同不能归档"
      });
    }

    if (contract.archive_status === "archived") {
      return res.status(400).json({
        success: false,
        message: "该合同已归档"
      });
    }

    await connection.execute(
      "UPDATE contracts SET archive_status = 'archived', archived_at = NOW(), archived_by = ? WHERE id = ?",
      [userId, contractId]
    );

    await logService.recordLog(userId, "ARCHIVE_CONTRACT", `归档合同 ID: ${contractId}, 名称: ${contract.contract_name}`, req.ip);

    res.json({
      success: true,
      message: "合同归档成功"
    });
  } catch (error) {
    logger.error(`❌ 合同归档失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "合同归档失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.unarchiveContract = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const contractId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === "auditor") {
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能恢复归档合同"
      });
    }

    const [rows] = await connection.execute(
      "SELECT id, contract_name, uploader_id, archive_status FROM contracts WHERE id = ?",
      [contractId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "合同不存在"
      });
    }

    const contract = rows[0];
    if (userRole !== "admin" && contract.uploader_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅上传者或管理员可恢复归档合同"
      });
    }

    if (contract.archive_status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "当前合同未归档"
      });
    }

    await connection.execute(
      "UPDATE contracts SET archive_status = 'active', archived_at = NULL, archived_by = NULL WHERE id = ?",
      [contractId]
    );

    await logService.recordLog(userId, "RESTORE_CONTRACT", `恢复归档合同 ID: ${contractId}, 名称: ${contract.contract_name}`, req.ip);

    res.json({
      success: true,
      message: "归档合同已恢复"
    });
  } catch (error) {
    logger.error(`❌ 恢复归档合同失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "恢复归档合同失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.getTemplates = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    const [templates] = await connection.execute(
      `SELECT t.*, u.username AS creator_name
       FROM contract_templates t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.updated_at DESC, t.created_at DESC`
    );

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error(`❌ 获取合同模板失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "获取合同模板失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.createTemplate = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    if (!canManageTemplates(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能创建模板"
      });
    }

    const {
      templateName,
      contractName,
      contractType,
      signerMy,
      signerOther,
      contractAmount,
      contractDescription,
      expireDays
    } = req.body;

    if (!templateName) {
      return res.status(400).json({
        success: false,
        message: "模板名称不能为空"
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO contract_templates
       (template_name, contract_name, contract_type, signer_my, signer_other, contract_amount, contract_description, expire_days, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        templateName,
        contractName || null,
        contractType || null,
        signerMy || null,
        signerOther || null,
        contractAmount || null,
        contractDescription || null,
        expireDays ? parseInt(expireDays, 10) : null,
        req.user.id
      ]
    );

    await logService.recordLog(req.user.id, "CREATE_TEMPLATE", `创建合同模板: ${templateName}`, req.ip);

    res.status(201).json({
      success: true,
      message: "合同模板创建成功",
      data: { id: result.insertId }
    });
  } catch (error) {
    logger.error(`❌ 创建合同模板失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "创建合同模板失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.updateTemplate = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    if (!canManageTemplates(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能修改模板"
      });
    }

    const templateId = parseInt(req.params.id, 10);
    const {
      templateName,
      contractName,
      contractType,
      signerMy,
      signerOther,
      contractAmount,
      contractDescription,
      expireDays
    } = req.body;

    const [rows] = await connection.execute(
      "SELECT id, template_name, created_by FROM contract_templates WHERE id = ?",
      [templateId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "模板不存在"
      });
    }

    const template = rows[0];
    if (req.user.role !== "admin" && template.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅创建者或管理员可修改模板"
      });
    }

    await connection.execute(
      `UPDATE contract_templates SET
        template_name = ?,
        contract_name = ?,
        contract_type = ?,
        signer_my = ?,
        signer_other = ?,
        contract_amount = ?,
        contract_description = ?,
        expire_days = ?
       WHERE id = ?`,
      [
        templateName || template.template_name,
        contractName || null,
        contractType || null,
        signerMy || null,
        signerOther || null,
        contractAmount || null,
        contractDescription || null,
        expireDays ? parseInt(expireDays, 10) : null,
        templateId
      ]
    );

    await logService.recordLog(req.user.id, "UPDATE_TEMPLATE", `更新合同模板: ${template.template_name}`, req.ip);

    res.json({
      success: true,
      message: "合同模板更新成功"
    });
  } catch (error) {
    logger.error(`❌ 更新合同模板失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "更新合同模板失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

exports.deleteTemplate = async (req, res) => {
  const connection = await getPool().getConnection();

  try {
    if (!canManageTemplates(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "审计员仅支持只读访问，不能删除模板"
      });
    }

    const templateId = parseInt(req.params.id, 10);
    const [rows] = await connection.execute(
      "SELECT id, template_name, created_by FROM contract_templates WHERE id = ?",
      [templateId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "模板不存在"
      });
    }

    const template = rows[0];
    if (req.user.role !== "admin" && template.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅创建者或管理员可删除模板"
      });
    }

    await connection.execute("DELETE FROM contract_templates WHERE id = ?", [templateId]);
    await logService.recordLog(req.user.id, "DELETE_TEMPLATE", `删除合同模板: ${template.template_name}`, req.ip);

    res.json({
      success: true,
      message: "合同模板删除成功"
    });
  } catch (error) {
    logger.error(`❌ 删除合同模板失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "删除合同模板失败",
      error: error.message
    });
  } finally {
    connection.release();
  }
};
