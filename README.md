# 基于区块链的ToB销售合同存证系统

## Blockchain-based ToB Sales Contract Evidence System

---

## 📋 项目概述

### 1.1 研究背景

随着数字化转型的深入，企业间的销售合同管理面临着数据存储安全性、真实性验证成本高、合同篡改风险等挑战。传统的合同存证方式存在以下问题：

- **中心化存储风险**：数据存储在单一服务器，存在单点故障和数据丢失风险
- **验证成本高昂**：验证合同真实性需要复杂的公证流程
- **篡改风险**：中心化存储的合同容易被恶意篡改
- **跨机构协作困难**：不同企业间的合同验证缺乏统一标准

### 1.2 解决方案

本系统采用**区块链技术**结合**IPFS分布式存储**，构建一个安全、可靠、不可篡改的合同存证平台。

### 1.3 项目目标

1. 实现合同文件的安全存储与哈希上链
2. 提供便捷的合同上传、查询、审批功能
3. 支持合同真实性的快速验证
4. 确保数据的不可篡改性和可追溯性

---

## 🏗️ 系统架构

### 2.1 系统功能架构

本系统主要围绕企业合同的存证全生命周期，划分为以下六大功能模块：

```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                           基于区块链的 ToB 销售合同存证系统                                   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
        │                 │                 │                 │                 │
┌───────┴───────┐ ┌───────┴───────┐ ┌───────┴───────┐ ┌───────┴───────┐ ┌───────┴───────┐
│ 👤 用户中心模块 │ │ 📑 合同存证模块 │ │ ⚖️ 合同审批模块 │ │ 🔍 防伪校验模块 │ │ 📊 数据大屏模块 │
├───────────────┤ ├───────────────┤ ├───────────────┤ ├───────────────┤ ├───────────────┤
│ • 注册与登录   │ │ • 文件哈希计算   │ │ • 待办合同列表   │ │ • 链上哈希比对   │ │ • 核心指标统计   │
│ • 三角色权限控制│ │ • IPFS分布式上传 │ │ • 合同详情查看   │ │ • 双通道比对验证 │ │ • 业务操作分布图 │
│ • 账号状态管理  │ │ • 唤起钱包签名   │ │ • 一键审批上链   │ │ • 校验结果展示   │ │ • 存证状态监控   │
│ • 钱包地址绑定  │ │ • 合同元数据填报 │ │ • 存证证书导出   │ │ • 原始文件下载   │ │ • 企业合作评分表 │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

### 2.2 系统技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (React)                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │  数据大屏 │  │ 权限路由  │  │ 合同列表 │  │ 上传页面 │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP API
┌────────────────────────┴────────────────────────────────────────┐
│                       后端服务 (Express)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ JWT 认证中间件 │  │ 文件上传处理  │  │ 日志系统     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ Pinata IPFS  │  │ 区块链服务    │                           │
│  └──────────────┘  └──────────────┘                           │
└────────────────────────┬────────────────────────────────────────┘
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │ MySQL   │   │ IPFS    │   │ Hardhat │
    │ 数据库   │   │ 分布式存储 │   │ 区块链   │
    └─────────┘   └──────────┘   └──────────┘
```

---

## 💻 技术栈

### 2.1 区块链层

| 技术 | 版本 | 说明 |
|------|------|------|
| **Solidity** | ^0.8.20 | 智能合约编程语言 |
| **Hardhat** | ^2.19.4 | 以太坊开发环境 |
| **Ethers.js** | v6 | 以太坊JavaScript SDK |
| **Sepolia Network** | Chain ID: 11155111 | 以太坊官方测试网 (Sepolia) |

### 2.2 后端服务

| 技术 | 版本 | 说明 |
|------|------|------|
| **Node.js** | Latest | JavaScript运行时 |
| **Express** | ^4.18.2 | Web应用框架 |
| **JWT** | ^9.0.2 | JSON Web Token认证 |
| **bcryptjs** | ^2.4.3 | 密码加密 |
| **multer** | ^1.4.5 | 文件上传中间件 |
| **Winston** | ^3.11.0 | 日志管理系统 |
| **MySQL** | Latest | 关系型数据库 |
| **Axios** | ^1.6.2 | HTTP请求库 |

### 2.3 前端应用

| 技术 | 版本 | 说明 |
|------|------|------|
| **React** | ^18.2.0 | UI框架 |
| **React Router** | v6 | 路由管理 |
| **Axios** | ^1.6.2 | HTTP客户端 |
| **ethers.js** | v5.7.2 | 以太坊库 |

### 2.4 存储服务

| 技术 | 说明 |
|------|------|
| **IPFS** | InterPlanetary File System，分布式文件系统 |
| **Pinata** | IPFS pinning服务，提供文件上传API |

---

## 📊 数据库设计

### 3.1 用户表 (users)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,                        -- 用户名
  password VARCHAR(255) NOT NULL,                               -- 密码（bcrypt加密）
  email VARCHAR(100),                                           -- 邮箱
  phone VARCHAR(20),                                            -- 手机号
  department VARCHAR(100),                                      -- 所属部门
  status ENUM('active','inactive','deleted') DEFAULT 'active', -- 账号状态
  wallet_address VARCHAR(100),                                  -- MetaMask钱包地址
  role ENUM('user','admin','auditor') DEFAULT 'user',          -- 角色（三角色）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_wallet (wallet_address),
  INDEX idx_phone (phone),
  INDEX idx_department (department),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 合同表 (contracts)

```sql
CREATE TABLE contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_name VARCHAR(255) NOT NULL,                               -- 合同名称
  contract_type VARCHAR(100),                                        -- 合同类型
  signer_my VARCHAR(100),                                            -- 我方签署方
  signer_other VARCHAR(100),                                         -- 对方签署方
  contract_amount DECIMAL(20, 2),                                    -- 合同金额
  contract_description TEXT,                                         -- 合同描述
  expire_at DATETIME,                                                -- 到期时间
  file_hash VARCHAR(100) NOT NULL,                                   -- 文件SHA256哈希
  ipfs_cid VARCHAR(100),                                             -- IPFS内容标识符
  tx_hash VARCHAR(100),                                              -- 区块链交易哈希
  contract_id INT,                                                   -- 链上合同ID
  uploader_id INT NOT NULL,                                          -- 上传者ID
  approver_id INT,                                                   -- 审批者ID
  status ENUM('pending','approved','rejected') DEFAULT 'pending',   -- 审批状态
  archive_status ENUM('active','archived') DEFAULT 'active',        -- 归档状态
  archived_at DATETIME,                                              -- 归档时间
  archived_by INT,                                                   -- 归档操作人ID
  template_id INT,                                                   -- 来源模板ID
  version_group_id INT,                                              -- 版本组ID（同组合同共享）
  version_no INT NOT NULL DEFAULT 1,                                 -- 版本号
  previous_version_id INT,                                           -- 上一版本合同ID
  is_latest_version TINYINT(1) NOT NULL DEFAULT 1,                  -- 是否最新版本
  file_path VARCHAR(500),                                            -- 文件本地路径
  file_size BIGINT,                                                  -- 文件大小（字节）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  INDEX idx_uploader (uploader_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_archive_status (archive_status),
  INDEX idx_expire_at (expire_at),
  INDEX idx_version_group (version_group_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 合同模板表 (contract_templates)

```sql
CREATE TABLE contract_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(150) NOT NULL,           -- 模板名称
  contract_name VARCHAR(255),                    -- 预设合同名称
  contract_type VARCHAR(100),                    -- 预设合同类型
  signer_my VARCHAR(100),                        -- 预设我方签署方
  signer_other VARCHAR(100),                     -- 预设对方签署方
  contract_amount DECIMAL(20, 2),                -- 预设合同金额
  contract_description TEXT,                     -- 预设合同描述
  expire_days INT DEFAULT NULL,                  -- 预设有效天数
  created_by INT,                                -- 创建者ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_template_creator (created_by),
  INDEX idx_template_name (template_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.4 操作日志表 (operation_logs)

```sql
CREATE TABLE operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,                                  -- 用户ID
  operation_type VARCHAR(50) NOT NULL,           -- 操作类型
  operation_desc TEXT,                          -- 操作描述
  ip_address VARCHAR(50),                       -- IP地址
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id),
  INDEX idx_operation (operation_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.5 企业评分表 (ratings)

```sql
CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,          -- 企业名称
  rating_score DECIMAL(3, 2) NOT NULL,         -- 评分分数 (0.00-5.00)
  rating_level VARCHAR(20),                    -- 评分等级 (优秀/良好/合格/较差)
  contract_count INT DEFAULT 0,                -- 合作合同数量
  total_amount DECIMAL(15, 2) DEFAULT 0,       -- 合作总金额
  last_contract_date DATE,                     -- 最后一次合同日期
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_name),
  INDEX idx_score (rating_score)
);
```

---

## 🔗 智能合约设计

### 4.1 合约结构

```solidity
contract ContractEvidence {
    // 合同状态枚举
    enum ContractStatus {
        Pending,    // 待审批
        Approved,   // 已审批
        Rejected    // 已拒绝
    }

    // 合同记录结构
    struct ContractRecord {
        uint256 id;              // 合同唯一标识
        string cid;              // IPFS CID
        string hash;             // 文件SHA256哈希
        address uploader;        // 上传者地址
        address approver;         // 审批者地址
        ContractStatus status;   // 合同状态
        uint256 timestamp;       // 存证时间戳
    }

    // 状态变量
    mapping(uint256 => ContractRecord) private contracts;
    mapping(address => uint256[]) private userContracts;
}
```

### 4.2 核心功能

| 功能 | 方法 | 描述 |
|------|------|------|
| 存储合同 | `storeContract(cid, hash)` | 将合同存证上链，返回链上合同ID |
| 审批合同 | `approveContract(id)` | 审批通过合同，记录审批者地址 |
| 拒绝合同 | `rejectContract(id)` | 拒绝合同，记录审批者地址 |
| 查询合同 | `getContract(id)` | 获取合同详情（CID、哈希、上传者、审批者、状态、时间戳） |
| 验证哈希 | `verifyHash(id, hash)` | 验证文件哈希是否与链上记录匹配 |
| 合同总数 | `getContractCount()` | 获取链上合同总数 |
| 用户合同 | `getUserContracts(address)` | 获取指定用户地址的所有合同ID列表 |
| 合同URI | `getContractURI(id)` | 获取合同IPFS URI（`ipfs://CID`格式） |

### 4.3 链上事件

| 事件 | 触发时机 | 索引字段 |
|------|---------|---------|
| `ContractStored` | 新合同存证上链时 | contractId, uploader |
| `ContractApproved` | 合同审批通过时 | contractId, approver |
| `ContractRejected` | 合同被拒绝时 | contractId, approver |

---

## 📡 API接口文档

> 所有接口返回格式统一为 `{ success: boolean, message?: string, data?: any }`。需认证接口须在请求头携带 `Authorization: Bearer <token>`。

### 5.1 认证接口 (`/api/auth`)

| 方法 | 路径 | 权限 | 描述 |
|------|------|------|------|
| POST | `/api/auth/register` | 公开 | 用户注册 |
| POST | `/api/auth/login` | 公开 | 用户登录 |
| GET | `/api/auth/me` | 登录用户 | 获取当前登录用户信息 |
| PUT | `/api/auth/wallet` | 登录用户 | 绑定/更新 MetaMask 钱包地址 |

#### 用户注册
```
POST /api/auth/register
Content-Type: application/json

Request:
{
  "username": "string",     // 用户名（3-50字符）
  "password": "string",     // 密码（至少6字符）
  "email": "string",        // 邮箱（可选）
  "phone": "string",        // 手机号（可选）
  "department": "string",   // 部门（可选）
  "role": "user"            // 角色：user / admin / auditor
}

Response (201):
{
  "success": true,
  "message": "注册成功",
  "data": { "userId": 1, "username": "testuser" }
}
```

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "username": "string",
  "password": "string"
}

Response (200):
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": 1, "username": "testuser", "role": "user", "wallet_address": null }
  }
}
```

#### 获取当前用户 / 绑定钱包
```
GET  /api/auth/me              → 返回当前用户完整信息
PUT  /api/auth/wallet          → Body: { "walletAddress": "0x..." }
```

### 5.2 合同接口 (`/api/contracts`)

| 方法 | 路径 | 权限 | 描述 |
|------|------|------|------|
| POST | `/upload` | user/admin | 上传合同并上链存证 |
| POST | `/prepare-upload` | user/admin | 预上传（计算哈希、上传IPFS，不上链） |
| GET | `/` | 登录用户 | 获取合同列表（分页+筛选） |
| GET | `/:id` | 登录用户 | 获取合同详情 |
| GET | `/:id/download` | 上传者/admin/auditor | 安全下载原始合同文件 |
| POST | `/approve` | admin | 审批通过合同（同步上链） |
| POST | `/reject` | admin | 拒绝合同（同步上链） |
| POST | `/verify` | 登录用户 | 双通道防伪校验 |
| GET | `/:id/versions` | 上传者/admin/auditor | 获取合同版本历史 |
| POST | `/:id/archive` | 上传者/admin | 归档合同 |
| POST | `/:id/unarchive` | 上传者/admin | 恢复归档合同 |

#### 上传合同
```
POST /api/contracts/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: File                // 合同文件（最大50MB，支持 pdf/doc/docx/jpg/png/xls/xlsx/txt）
- contractName: string      // 合同名称
- contractType: string      // 合同类型（可选）
- signerMy: string          // 我方签署方（可选）
- signerOther: string       // 对方签署方（可选）
- contractAmount: number    // 合同金额（可选）
- contractDescription: string // 合同描述（可选）
- expireAt: string          // 到期日期（可选）
- walletAddress: string     // MetaMask 钱包地址（用于链上签名）

Response (201):
{
  "success": true,
  "message": "合同上传成功",
  "data": {
    "id": 1,
    "contractName": "销售合同A",
    "fileHash": "abc123...",
    "ipfsCid": "QmXxx...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXxx...",
    "txHash": "0xabc...",
    "blockchainContractId": 1
  }
}
```

#### 获取合同列表（分页）
```
GET /api/contracts?page=1&limit=10&status=pending
Authorization: Bearer <token>

Query Parameters:
- page: number          // 页码（默认1）
- limit: number         // 每页数量（默认10，最大100）
- status: string        // 状态筛选（可选：pending/approved/rejected）
- archive_status: string // 归档筛选（可选：active/archived）

Response (200):
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 }
}
```

#### 审批 / 拒绝合同
```
POST /api/contracts/approve    → Body: { "contractId": 1, "wallet_address": "0x..." }
POST /api/contracts/reject     → Body: { "contractId": 1 }
```

#### 双通道防伪校验
```
POST /api/contracts/verify
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "contractId": 1,        // 合同ID（二选一或同时提供）
  "fileHash": "abc123..." // 文件SHA256哈希（二选一或同时提供）
}

Response (200):
{
  "success": true,
  "data": {
    "verified": true,              // 最终验证结果
    "blockchainVerified": true,    // 区块链验证是否通过
    "databaseMatched": true,       // 数据库是否匹配
    "onChainRecordFound": true,    // 链上记录是否存在
    "integrityVerified": true,     // 完整性验证
    "trustLevel": "high",          // 可信等级：high / medium / none
    "conclusion": "verified",      // 结论：verified / on_chain_record_only / database_only / not_found
    "contract": { ... },           // 数据库合同信息
    "blockchain": { ... },         // 链上合同信息
    "contractAddress": "0x..."     // 智能合约地址
  }
}
```

#### 版本历史 / 归档管理
```
GET  /api/contracts/:id/versions   → 获取该合同的版本链
POST /api/contracts/:id/archive    → 归档合同（待审批状态不可归档）
POST /api/contracts/:id/unarchive  → 恢复归档
```

### 5.3 合同模板接口 (`/api/contracts/templates`)

| 方法 | 路径 | 权限 | 描述 |
|------|------|------|------|
| GET | `/templates` | 登录用户 | 获取模板列表 |
| POST | `/templates` | user/admin | 创建模板 |
| PUT | `/templates/:id` | 创建者/admin | 更新模板 |
| DELETE | `/templates/:id` | 创建者/admin | 删除模板 |

```
POST /api/contracts/templates
Authorization: Bearer <token>

Request:
{
  "templateName": "标准销售合同",
  "contractName": "销售合同",
  "contractType": "sales",
  "signerMy": "本公司",
  "signerOther": "",
  "contractAmount": 0,
  "contractDescription": "...",
  "expireDays": 365
}
```

### 5.4 管理员接口 (`/api/admin`)

#### 数据看板 & 审计日志（admin + auditor 可访问）

| 方法 | 路径 | 权限 | 描述 |
|------|------|------|------|
| GET | `/dashboard-stats` | admin/auditor | 获取仪表盘统计（指标卡片+多维图表数据） |
| GET | `/logs` | admin/auditor | 获取操作审计日志（支持类型/时间筛选） |

#### 用户管理（仅 admin）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/users` | 获取所有用户列表（排除已删除） |
| PUT | `/users/:id` | 更新用户信息（用户名/邮箱/手机/部门/角色/状态） |
| DELETE | `/users/:id` | 软删除用户（标记为 deleted） |
| PUT | `/users/:id/toggle-status` | 切换用户启用/停用状态 |

#### 企业评分管理（仅 admin）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/ratings` | 获取企业评分列表（按分数降序） |
| POST | `/ratings` | 新增企业评分（自动计算等级） |
| PUT | `/ratings/:id` | 更新评分记录 |
| DELETE | `/ratings/:id` | 删除单条评分 |
| POST | `/ratings/batch-delete` | 批量删除评分 `Body: { "ids": [1,2,3] }` |

---

## 🎯 核心功能模块

### 6.1 用户与权限模块
- **三角色体系**：系统支持 企业用户(User)、系统管理员(Admin) 和 独立审计员(Auditor) 三种角色，各司其职，拥有不同的数据访问与操作权限。
- **账号状态管理**：管理员可对用户进行启用、停用、软删除等操作，停用账号将无法登录。
- **钱包地址绑定**：用户可一键唤起 MetaMask 授权并绑定专属钱包地址，作为链上交互的身份标识。

### 6.2 合同存证与管理模块
- **合同上链存证**：支持本地计算 SHA256 哈希，将文件上传至 IPFS 分布式网络，并将文件哈希与 IPFS CID 存证至以太坊智能合约。
- **合同审批流**：上传的合同默认为待审批状态，由管理员进行“通过”或“拒绝”操作，审批结果同步上链。
- **版本链控制**：支持基于现有合同派生新版本（V1 -> V2...），系统自动维护版本组与版本历史，轻松追溯合同变更轨迹。
- **合同模板库**：支持将常用合同元数据保存为模板，新建合同时可一键填充，并由管理员统一维护模板库。
- **归档与到期提醒**：支持对已完结或废弃的合同进行归档（列表默认隐藏）；系统根据合同到期时间自动计算并展示“7天内到期”、“已过期”等预警状态。
- **存证凭证与安全下载**：支持一键导出精美的 HTML 版《合同存证凭证》（含防伪水印与链上指纹）；支持受鉴权保护的原始文件安全下载。

### 6.3 审计与防伪校验模块
- **审计员只读视图**：独立审计员拥有全局合同与数据的查看权限，但无法执行上传、审批、修改等写操作，保证审计过程的独立与客观。
- **双通道防伪校验**：提供独立的合同真伪验证入口，支持输入“合同ID”或“文件哈希”。系统将同时进行数据库比对与区块链智能合约查询，并输出明确的可信级别与处理建议（如：链上校验通过、仅命中数据库等）。
- **系统审计日志**：自动记录所有用户的核心业务操作（如登录、上传、审批、校验、归档等），并为管理员与审计员提供多维度筛选与检索。

### 6.4 数据监控看板 (Dashboard)
- **核心指标卡片**：实时统计总存证数、链上确认数、合同总金额、归档数、到期预警数及存证校验成功数等关键业务数据。
- **多维度可视化图表**：
  - 合同状态分布（饼图）
  - 核心业务操作分布（柱状图）
  - 近6个月合同存证趋势（折线图）
  - 近6个月合同金额趋势（折线与柱状组合图）
  - 合作方金额排行（条形图）
  - 到期提醒分布（环形图）

---

## 🔐 安全机制

### 7.1 认证安全

- **JWT Token**：无状态认证，支持过期时间
- **密码加密**：bcryptjs，单向哈希
- **API保护**：敏感接口需携带有效Token

### 7.2 数据安全

- **IPFS分布式存储**：文件分散存储，无单点故障
- **区块链存证**：哈希上链，不可篡改
- **数据库备份**：建议定期备份

### 7.3 传输安全

- **HTTPS**：生产环境应使用HTTPS
- **CORS配置**：限制跨域访问

---

## 📝 日志系统

### 8.1 Winston日志配置

**日志级别**：
- `info`：正常操作日志
- `error`：错误和异常日志
- `warn`：警告日志

**输出位置**：
- 控制台（彩色输出）
- `logs/app.log`（常规日志）
- `logs/error.log`（错误日志）

**日志示例**：
```
[2024-01-01 12:00:00] INFO: 用户登录成功: testuser
[2024-01-01 12:01:00] INFO: 文件上传成功，CID: QmXxx...
[2024-01-01 12:02:00] ERROR: 数据库连接失败: Connection refused
```

---

## 🚀 部署指南

### 9.1 环境准备

**软件要求**：
- Node.js v18+
- MySQL 8.0+
- npm 或 yarn

### 9.2 部署步骤

#### 第一步：启动MySQL数据库
```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE contract_evidence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 第二步：部署区块链
```bash
# 进入区块链目录
cd blockchain

# 安装依赖
npm install

# 启动Hardhat节点
npx hardhat node
# 节点运行在 http://127.0.0.1:8545
```

#### 第三步：部署智能合约
```bash
# 进入区块链目录
cd blockchain

# 部署到 Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia
```

#### 第四步：配置后端
```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 编辑 .env 文件，配置数据库和API密钥
```

#### 第五步：启动后端
```bash
# 启动后端服务
npm start
# 服务运行在 http://localhost:5000
```

#### 第六步：启动前端
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动前端应用
npm start
# 应用运行在 http://localhost:3000
```

### 9.3 配置说明

**后端 .env 配置**：
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=contract_evidence
JWT_SECRET=your_secret_key
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret
```

---

## 🎨 界面预览

### 10.1 登录/注册页 (AuthPage)
- 左右分栏布局：左侧品牌展示面板 + 右侧表单区
- 登录/注册 Tab 切换，快捷角色登录按钮
- 三角色注册（普通用户/管理员/审计员）

### 10.2 数据监控看板 (Dashboard)
- 核心指标卡片（总存证数、链上确认数、合同总金额、归档数、到期预警、校验成功数）
- 合同状态分布饼图、操作类型柱状图
- 近6月存证趋势折线图、金额趋势组合图
- 合作方金额排行条形图、到期提醒分布环形图

### 10.3 合同列表页 (ContractList)
- 分页展示合同，支持状态/归档筛选与关键字搜索
- 支持归档/恢复操作，到期预警标签
- 管理员可查看所有合同，普通用户仅查看自己的

### 10.4 合同上传页 (UploadContract)
- 拖拽上传，上传进度与步骤展示
- 合同元数据填报（类型/签署方/金额/描述/到期日）
- 模板一键填充、MetaMask 钱包唤起签名
- IPFS 上传状态 + 区块链上链状态实时反馈

### 10.5 合同详情页 (ContractDetail)
- 完整合同信息展示 + 区块链存证指纹
- 管理员审批/拒绝操作，审批结果同步上链
- 版本历史查看、归档管理、存证凭证导出（HTML 含水印）
- 安全下载原始文件

### 10.6 合同验证页 (VerifyContract)
- 独立验证入口：输入合同ID 或文件哈希
- 双通道比对结果展示（数据库 + 区块链）
- 可信等级与处理建议

### 10.7 用户管理页 (UserManagement)
- 用户列表（用户名/邮箱/手机/部门/角色/状态/钱包地址）
- 编辑用户信息、角色切换、启用/停用、软删除

### 10.8 系统日志页 (SystemLogs)
- 操作审计日志检索（按操作类型/时间范围筛选）
- 展示用户、操作类型、描述、IP地址、时间

### 10.9 企业评分页 (RatingList + CompanyRating)
- 企业评分列表（评分/等级/合同数/金额/时间）
- 新增/编辑/删除评分，批量删除
- 评分趋势与排名总览

---

## 💡 技术亮点

### 11.1 区块链存证与双通道校验

- SHA256 文件哈希 + IPFS CID 双重上链，确保数据不可篡改
- 智能合约自动执行存储/审批/拒绝逻辑，Event 事件可追溯
- 双通道防伪校验引擎：同时比对数据库记录与链上智能合约，输出分级可信结论（high/medium/none）

### 11.2 IPFS 分布式存储

- 文件通过 Pinata 上传至 IPFS 网络，获取全球唯一 CID
- 支持 IPFS Gateway 安全下载，鉴权保护防止未授权访问
- 分布式冗余存储，无单点故障风险

### 11.3 合同全生命周期管理

- **版本链控制**：支持合同派生新版本（V1→V2...），自动维护 version_group_id 与版本历史
- **模板库**：CRUD 合同模板，新建合同时一键填充元数据
- **归档与恢复**：已完结合同可归档（列表默认隐藏），支持恢复
- **到期预警**：根据 expire_at 字段自动计算"即将到期"/"已过期"状态
- **存证凭证导出**：HTML 格式含防伪水印与链上指纹

### 11.4 RBAC 三角色权限体系

- **企业用户(User)**：上传合同、管理自己的合同、创建模板
- **系统管理员(Admin)**：审批合同、用户管理、评分管理、全局数据访问
- **独立审计员(Auditor)**：全局只读视图，保证审计独立性，不可执行写操作
- 中间件层统一鉴权：`authMiddleware` + `auditorMiddleware` + `auditorOnlyMiddleware`

### 11.5 数据可视化看板

- 6 类统计图表：饼图、柱状图、折线图、组合图、条形图、环形图
- 核心业务指标实时统计（总存证数、链上确认数、合同金额、归档数等）
- 合作方金额排行 + 到期提醒分布

### 11.6 企业级工程化

- **Winston 分级日志**：info/warn/error 分文件输出，控制台彩色
- **全链路操作审计**：自动记录登录、上传、审批、校验、归档等操作至 operation_logs
- **完整错误处理**：全局异常捕获 + 接口级 try-catch + 前端友好提示
- **数据库自动迁移**：`addColumnIfMissing` + `safeExecuteDDL` 实现增量表结构同步
- **MetaMask 集成**：前端唤起钱包签名，链上交互前自动健康检查（ChainID/合约存续/余额）

---

## 🛠️ 系统维护与常见问题 (FAQ)

### 12.1 为什么上链会报错 "signal is aborted" 或 "Failed to fetch"?

**原因**：这通常是因为 MetaMask 插件的后台进程无法连接到本地 Hardhat 节点，或者尝试使用 EIP-1559 动态费用模式失败。

**解决方法**：
1. **重置账户**：MetaMask -> 设置 -> 高级 -> 重置账户/清除活动数据（解决 Nonce 冲突）。
2. **检查代理**：关闭所有 VPN 或系统代理软件。
3. **网络配置**：确保 ChainID 为 `11155111`，RPC URL 为 Sepolia 官方地址。

### 12.2 部署到 Sepolia 后需要做什么？

由于 Sepolia 是持久化测试网：
1. **部署合约**：`npx hardhat run scripts/deploy.js --network sepolia`。
2. **更新合约地址**：将新生成的地址填入前端 `.env` 文件的 `REACT_APP_CONTRACT_ADDRESS`。
3. **保持测试币充足**：前往 [Sepolia Faucet](https://sepolia-faucet.pk910.de/) 领取测试币。

### 12.3 自动环境健康检查

系统已内置健康检查机制，在上链前会自动验证：
- **ChainID 匹配性**：确保连接的是 Sepolia (11155111) 网络。
- **合约存续性**：验证配置的地址是否真的有合约代码。
- **账户余额**：确保有足够的 Sepolia ETH 支付 Gas。

---

## 📚 参考文献

1. Ethereum White Paper - https://ethereum.org/whitepaper/
2. IPFS Documentation - https://docs.ipfs.tech/
3. Solidity Documentation - https://docs.soliditylang.org/
4. Hardhat Documentation - https://hardhat.org/docs/
5. React Documentation - https://react.dev/

---

## 📄 许可证

MIT License

---

## 👨‍💻 作者信息

- 项目名称：基于区块链的ToB销售合同存证系统
- 技术栈：Solidity + Hardhat + Node.js + Express + React + MySQL + IPFS
- 开发时间：2024年

---

**使用说明**：

1. 按照部署指南配置环境
2. 修改 `.env` 文件中的配置
3. 按顺序启动各个服务
4. 访问 http://localhost:3000 开始使用