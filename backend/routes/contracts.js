const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const contractController = require("../controllers/contractController");
const { authMiddleware, auditorMiddleware, auditorOnlyMiddleware } = require("../middleware/authMiddleware");

/**
 * 合同路由配置
 */

// 配置文件上传
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制50MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      ".pdf",
      ".doc",
      ".docx",
      ".jpg",
      ".jpeg",
      ".png",
      ".xls",
      ".xlsx",
      ".txt"
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件类型"), false);
    }
  }
});

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 合同相关路由
 */

router.post("/prepare-upload", upload.single("file"), contractController.prepareContractUpload);

// POST /api/contracts/upload - 上传合同
router.post("/upload", upload.single("file"), contractController.uploadContract);

// 模板管理
router.get("/templates", contractController.getTemplates);
router.post("/templates", contractController.createTemplate);
router.put("/templates/:id", contractController.updateTemplate);
router.delete("/templates/:id", contractController.deleteTemplate);

// GET /api/contracts - 获取合同列表（支持分页）
router.get("/", contractController.getContracts);

// 版本与归档
router.get("/:id/versions", contractController.getContractVersions);
router.post("/:id/archive", contractController.archiveContract);
router.post("/:id/unarchive", contractController.unarchiveContract);

// GET /api/contracts/:id/download - 下载合同文件
router.get("/:id/download", contractController.downloadContractFile);

// GET /api/contracts/:id - 获取合同详情
router.get("/:id", contractController.getContractById);

// POST /api/contracts/approve - 审批合同
router.post("/approve", contractController.approveContract);

// POST /api/contracts/reject - 拒绝合同
router.post("/reject", contractController.rejectContract);

// POST /api/contracts/verify - 验证合同
router.post("/verify", auditorOnlyMiddleware, contractController.verifyContract);

module.exports = router;
