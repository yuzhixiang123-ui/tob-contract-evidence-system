import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { contractAPI, authAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";
import { connectWallet } from "../utils/web3";

function ContractList() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [archiveStatus, setArchiveStatus] = useState("active");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBinding, setIsBinding] = useState(false);

  const getCurrentUser = async () => {
    try {
      const result = await authAPI.getCurrentUser();
      if (result.success) {
        setCurrentUser(result.data);
        localStorage.setItem("user", JSON.stringify(result.data));
      }
    } catch (e) {
      console.error("获取用户信息失败:", e);
      // 如果获取失败，尝试从本地获取
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    }
  };

  const handleBindWallet = async () => {
    if (isBinding) return;
    setIsBinding(true);
    try {
      // 1. 调用 MetaMask 连接钱包
      const wallet = await connectWallet();
      
      // 2. 将钱包地址同步到后端
      const result = await authAPI.updateWalletAddress(wallet.address);
      
      if (result.success) {
        alert("钱包地址绑定成功！");
        // 3. 重新获取用户信息以更新 UI
        await getCurrentUser();
      }
    } catch (err) {
      console.error("绑定钱包失败:", err);
      alert(err.message || "绑定钱包失败，请重试");
    } finally {
      setIsBinding(false);
    }
  };

  const isAdmin = () => currentUser?.role === "admin";
  const isAuditor = () => currentUser?.role === "auditor";
  const isManagementUser = () => isAdmin() || isAuditor();
  const canUploadContract = () => !isAuditor();
  const canReviewContract = () => isAdmin();

  const getDisplayName = () => {
    return currentUser?.username || "未登录用户";
  };

  const getAvatarText = () => {
    const name = getDisplayName().trim();
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  const getRoleText = () => {
    if (currentUser?.role === "admin") return "系统管理员";
    if (currentUser?.role === "auditor") return "独立审计员";
    return "企业用户";
  };

  const getContractStats = () => {
    const pendingCount = contracts.filter((item) => item.status === "pending").length;
    const approvedCount = contracts.filter((item) => item.status === "approved").length;
    const rejectedCount = contracts.filter((item) => item.status === "rejected").length;

    return {
      total: contracts.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    };
  };

  const loadContracts = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const result = await contractAPI.getContracts(
        page,
        pagination.limit,
        statusFilter,
        searchKeyword,
        archiveStatus,
        expiryFilter
      );

      if (result.success) {
        setContracts(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.message || "获取合同列表失败");
      }
    } catch (err) {
      console.error("获取合同列表失败:", err);
      setError(err.response?.data?.message || "获取合同列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
    loadContracts(1);
  }, [statusFilter, searchKeyword, archiveStatus, expiryFilter]);

  const handleApprove = async (contractId) => {
    if (!window.confirm("确定要审批通过这个合同吗？")) {
      return;
    }

    try {
      await contractAPI.approveContract(contractId);
      alert("审批成功！");
      loadContracts(pagination.page);
    } catch (err) {
      console.error("审批失败:", err);
      alert(err.response?.data?.message || "审批失败");
    }
  };

  const handleReject = async (contractId) => {
    if (!window.confirm("确定要拒绝这个合同吗？")) {
      return;
    }

    try {
      await contractAPI.rejectContract(contractId);
      alert("拒绝成功！");
      loadContracts(pagination.page);
    } catch (err) {
      console.error("拒绝失败:", err);
      alert(err.response?.data?.message || "拒绝失败");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadContracts(newPage);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadContracts(1);
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setStatusFilter("");
    setArchiveStatus("active");
    setExpiryFilter("");
    loadContracts(1);
  };

  const handleArchive = async (contractId) => {
    if (!window.confirm("确定将该合同归档吗？归档后默认列表中将不再显示。")) {
      return;
    }

    try {
      const result = await contractAPI.archiveContract(contractId);
      alert(result.message || "归档成功");
      loadContracts(pagination.page);
    } catch (err) {
      console.error("归档失败:", err);
      alert(err.response?.data?.message || "归档失败");
    }
  };

  const handleUnarchive = async (contractId) => {
    if (!window.confirm("确定恢复该归档合同吗？")) {
      return;
    }

    try {
      const result = await contractAPI.unarchiveContract(contractId);
      alert(result.message || "恢复成功");
      loadContracts(pagination.page);
    } catch (err) {
      console.error("恢复归档失败:", err);
      alert(err.response?.data?.message || "恢复归档失败");
    }
  };

  const handleDownloadOriginal = async (contract) => {
    try {
      const result = await contractAPI.downloadContractFile(contract.id);
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName || `${contract.contract_name || `contract-${contract.id}`}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("下载原始文件失败:", err);
      alert(err.response?.data?.message || "下载原始文件失败");
    }
  };

  const getExpiryText = (contract) => {
    if (!contract.expire_at) return "未设置";
    if (contract.expiryStatus === "expired") return `已过期 ${Math.abs(contract.daysUntilExpiry)} 天`;
    if (contract.expiryStatus === "expiring_soon") return `${contract.daysUntilExpiry} 天内到期`;
    return `${contract.daysUntilExpiry} 天后到期`;
  };

  const getExpiryStyle = (contract) => {
    if (!contract.expire_at) {
      return { background: "#f8fafc", color: "#64748b" };
    }
    if (contract.expiryStatus === "expired") {
      return { background: "#fff1f2", color: "#e11d48" };
    }
    if (contract.expiryStatus === "expiring_soon") {
      return { background: "#fff7ed", color: "#ea580c" };
    }
    return { background: "#ecfeff", color: "#0891b2" };
  };

  // 导出存证证书 (HTML 格式，美化版)
  const downloadCertificate = (contract) => {
    if (!contract) return;

    const certHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>合同存证凭证 - ${contract.contract_name}</title>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 40px; background: #f8fafc; }
        .certificate-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 60px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-top: 10px solid #1d4ed8; position: relative; }
        .header { text-align: center; margin-bottom: 50px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; }
        .header h1 { color: #1e293b; font-size: 32px; margin: 0; letter-spacing: 2px; }
        .header p { color: #64748b; margin-top: 10px; font-size: 14px; }
        .section { margin-bottom: 40px; }
        .section-title { font-size: 18px; color: #1d4ed8; font-weight: 700; margin-bottom: 20px; border-left: 4px solid #1d4ed8; padding-left: 15px; display: flex; align-items: center; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 15px; }
        .label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; }
        .value { font-size: 15px; color: #1e293b; word-break: break-all; font-weight: 500; }
        .hash-box { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 13px; color: #475569; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #dcfce7; color: #166534; }
        .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px; }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(0,0,0,0.03); font-weight: 900; pointer-events: none; white-space: nowrap; }
        @media print {
            body { background: #fff; padding: 0; }
            .certificate-container { box-shadow: none; border: 1px solid #e2e8f0; }
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="watermark">TRUST SIGN EVIDENCE</div>
        <div class="header">
            <h1>合同存证凭证</h1>
            <p>基于区块链技术生成的电子合同存证报告</p>
        </div>

        <div class="section">
            <div class="section-title">📄 基本信息</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">合同名称</div>
                    <div class="value">${contract.contract_name}</div>
                </div>
                <div class="info-item">
                    <div class="label">合同金额</div>
                    <div class="value">${contract.contract_amount ? `¥ ${contract.contract_amount}` : "未填写"}</div>
                </div>
                <div class="info-item">
                    <div class="label">我方签署人</div>
                    <div class="value">${contract.signer_my || "未填写"}</div>
                </div>
                <div class="info-item">
                    <div class="label">对方签署人</div>
                    <div class="value">${contract.signer_other || "未填写"}</div>
                </div>
                <div class="info-item">
                    <div class="label">存证状态</div>
                    <div class="value"><span class="status-badge">${contract.status === "approved" ? "已存证" : "待审批"}</span></div>
                </div>
                <div class="info-item">
                    <div class="label">系统编号</div>
                    <div class="value">${contract.id}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">🔗 存证指纹</div>
            <div class="info-item">
                <div class="label">文件 SHA256 哈希摘要</div>
                <div class="hash-box">${contract.file_hash}</div>
            </div>
            <div class="info-item" style="margin-top: 15px;">
                <div class="label">区块链存证 ID</div>
                <div class="value" style="color: #10b981; font-weight: 700;">${contract.contract_id || "区块链确认中..."}</div>
            </div>
            <div class="info-item" style="margin-top: 15px;">
                <div class="label">交易哈希</div>
                <div class="hash-box" style="font-size: 11px;">${contract.tx_hash || "Pending..."}</div>
            </div>
            <div class="info-item" style="margin-top: 15px;">
                <div class="label">IPFS 存储标识 (CID)</div>
                <div class="hash-box" style="font-size: 11px;">${contract.ipfs_cid}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📝 合同备注</div>
            <div class="value" style="background: #f8fafc; padding: 15px; border-radius: 6px; min-height: 60px; font-size: 14px;">
                ${contract.contract_description || "暂无描述"}
            </div>
        </div>

        <div class="footer">
            <p>本凭证由 TrustSign 企业级合同存证系统自动生成</p>
            <p>生成的哈希摘要与区块链上记录一致，具有法律追溯效力</p>
            <p>打印日期: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([certHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `合同存证凭证_${contract.contract_name}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "approved":
        return "status-approved";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      default:
        return "";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "已结束";
      case "pending":
        return "待审核";
      case "rejected":
        return "已拒绝";
      default:
        return "未知";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const userChipStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 14px 8px 8px",
    borderRadius: "999px",
    background: "#ffffff",
    border: "1px solid #e6edf7",
    boxShadow: "0 4px 14px rgba(20, 42, 90, 0.08)"
  };

  const avatarStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    color: "#1e293b",
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
  };

  const pageBackgroundStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    position: "relative",
    overflow: "hidden"
  };

  const gridBackgroundStyle = {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px",
    opacity: 0.5,
    pointerEvents: "none"
  };

  const stats = getContractStats();

  if (loading && contracts.length === 0) {
    return (
      <div className="page-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error && contracts.length === 0) {
    return (
      <div className="page-container">
        <div className="error-state">
          <p className="error">{error}</p>
          <button onClick={() => loadContracts(1)} className="btn-primary">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBackgroundStyle}>
      <div style={gridBackgroundStyle} />
      {isManagementUser() && <AdminNavbar />}
      <div
        className="page-container"
        style={{ maxWidth: "none", margin: "0 auto", padding: "24px 28px 36px", position: "relative", zIndex: 1 }}
      >
        {!isManagementUser() && (
          <div
            className="page-header"
            style={{
              marginBottom: "24px",
              padding: "22px 24px",
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h1 style={{ color: "#1e293b", fontSize: "30px" }}>工作台 / 仪表盘</h1>
              <p style={{ color: "rgba(15,23,42,0.8)", fontSize: "14px" }}>
                合同状态总览与业务流转管理
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* 钱包绑定状态展示 */}
              <div
                style={{
                  ...userChipStyle,
                  background: currentUser?.wallet_address ? "#f0fdf4" : "#fff1f2",
                  borderColor: currentUser?.wallet_address ? "#bbf7d0" : "#fecaca",
                }}
              >
                <div 
                  style={{ 
                    ...avatarStyle, 
                    background: currentUser?.wallet_address ? "#22c55e" : "#ef4444",
                    fontSize: "16px"
                  }}
                >
                  {currentUser?.wallet_address ? "🔗" : "⚠️"}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 }}>
                    {currentUser?.wallet_address ? "钱包已绑定" : "钱包未绑定"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.2, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentUser?.wallet_address ? currentUser.wallet_address : "上链存证需先绑定"}
                  </div>
                </div>
                {!currentUser?.wallet_address && (
                  <button
                    onClick={handleBindWallet}
                    disabled={isBinding}
                    style={{
                      marginLeft: "4px",
                      padding: "4px 10px",
                      background: "#ef4444",
                      color: "#1e293b",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {isBinding ? "绑定中..." : "立即绑定"}
                  </button>
                )}
              </div>

              <div style={userChipStyle}>
                <div style={avatarStyle}>{getAvatarText()}</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 }}>
                    {getDisplayName()}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.2 }}>{getRoleText()}</div>
                </div>
              </div>
              <div className="header-actions">
                {canUploadContract() && (
                  <Link
                    to="/upload"
                    className="btn-primary"
                    style={{ borderRadius: "10px", background: "#2563eb", border: "1px solid #3b82f6" }}
                  >
                    新建合同
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{ borderRadius: "10px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)" }}
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        )}
        {isManagementUser() && (
          <div
            style={{
              margin: "18px 0 24px",
              padding: "22px 26px 16px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#1d4ed8", fontSize: "12px", letterSpacing: "2px", marginBottom: "8px", fontWeight: "700" }}>
                  TOB CONTRACT EVIDENCE
                </div>
                <h1 style={{ fontSize: "32px", color: "#1e293b", lineHeight: 1.1, marginBottom: "8px" }}>
                  销售合同存证系统
                </h1>
                <p style={{ color: "#475569", fontSize: "14px" }}>
                  {isAuditor() ? "审计工作台 · 合同只读检索、流转追溯与风险核验" : "企业工作台 · 合同审查、签约进度与可信追溯"}
                </p>
              </div>
              {canUploadContract() && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Link to="/upload" className="btn-primary" style={{ borderRadius: "10px", background: "#2563eb", border: "1px solid #3b82f6" }}>
                    新建合同
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" }}>
        {[
          { title: "合同总数", value: stats.total, color: "#38bdf8" },
          { title: "待审核", value: stats.pending, color: "#f59e0b" },
          { title: "已结束", value: stats.approved, color: "#22c55e" },
          { title: "已拒绝", value: stats.rejected, color: "#ef4444" }
        ].map((item) => (
          <div
            key={item.title}
            style={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: "16px 18px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
            }}
          >
            <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>{item.title}</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        className="filter-bar"
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
          background: "#ffffff"
        }}
      >
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
          {isAuditor() && (
            <span
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(96,165,250,0.16)",
                border: "1px solid rgba(147,197,253,0.28)",
                color: "#1e40af",
                fontSize: "12px",
                fontWeight: "600"
              }}
            >
              当前为只读模式
            </span>
          )}
          <label style={{ color: "#475569" }}>合同名称</label>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="请输入合同名称"
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              width: "220px",
              color: "#334155",
              background: "#f8fafc"
            }}
          />
          <label style={{ marginLeft: "6px", color: "#475569" }}>状态</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              color: "#334155",
              background: "#f8fafc"
            }}
          >
            <option value="">全部</option>
            <option value="pending">待审核</option>
            <option value="approved">已结束</option>
            <option value="rejected">已拒绝</option>
          </select>
          <label style={{ marginLeft: "6px", color: "#475569" }}>归档</label>
          <select
            value={archiveStatus}
            onChange={(e) => setArchiveStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              color: "#334155",
              background: "#f8fafc"
            }}
          >
            <option value="active">未归档</option>
            <option value="archived">已归档</option>
            <option value="all">全部</option>
          </select>
          <label style={{ marginLeft: "6px", color: "#475569" }}>到期</label>
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              color: "#334155",
              background: "#f8fafc"
            }}
          >
            <option value="">全部</option>
            <option value="expiring_soon">7天内到期</option>
            <option value="expired">已过期</option>
            <option value="normal">正常</option>
          </select>
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", borderRadius: "8px" }}>
            搜索
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: "8px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              background: "#f8fafc",
              color: "#334155",
              cursor: "pointer"
            }}
          >
            重置
          </button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      {contracts.length === 0 ? (
        <div className="empty-state">
          <p>暂无合同</p>
          {canUploadContract() && (
            <Link to="/upload" className="btn-primary">
              上传第一个合同
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              overflowX: "auto",
              margin: "24px 0",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同编号</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同名称</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同类型</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>上传者</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合作方</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同金额</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>到期提醒</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>更新时间</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>版本</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同描述</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同状态</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>归档状态</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>合同hash</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", borderBottom: "1px solid #e8eef7", fontWeight: "700", color: "#334155" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                    <td style={{ padding: "12px 16px" }}>{contract.id}</td>
                    <td style={{ padding: "12px 16px" }}>{contract.contract_name}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ 
                        display: "inline-block", 
                        padding: "4px 12px", 
                        borderRadius: "12px", 
                        background: contract.contract_type ? "#e0f2fe" : "#f8fafc",
                        color: contract.contract_type ? "#0369a1" : "#64748b",
                        fontSize: "12px"
                      }}>
                        {contract.contract_type || "未分类"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{contract.uploader_name}</td>
                    <td style={{ padding: "12px 16px" }}>{contract.signer_other || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>{contract.contract_amount || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          ...getExpiryStyle(contract)
                        }}
                      >
                        {getExpiryText(contract)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{formatDate(contract.created_at)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        background: contract.is_latest_version ? "#ecfdf5" : "#f8fafc",
                        color: contract.is_latest_version ? "#047857" : "#64748b",
                        fontSize: "12px"
                      }}>
                        V{contract.version_no}{contract.is_latest_version ? " · 最新" : ""}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{contract.contract_description || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ 
                        display: "inline-block", 
                        padding: "4px 12px", 
                        borderRadius: "12px", 
                        background: contract.status === "approved" ? "#f6ffed" : contract.status === "pending" ? "#fff7e6" : "#fff2f0",
                        color: contract.status === "approved" ? "#52c41a" : contract.status === "pending" ? "#faad14" : "#ff4d4f",
                        fontSize: "12px"
                      }}>
                        {getStatusText(contract.status)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        background: contract.archive_status === "archived" ? "#eef2ff" : "#ecfeff",
                        color: contract.archive_status === "archived" ? "#4338ca" : "#0f766e",
                        fontSize: "12px"
                      }}>
                        {contract.archive_status === "archived" ? "已归档" : "活跃"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {contract.file_hash}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Link
                          to={`/contracts/${contract.id}`}
                          style={{
                            color: "#2563eb",
                            fontSize: "12px",
                            textDecoration: "none",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            fontWeight: "600"
                          }}
                        >
                          查看详情
                        </Link>
                        <button 
                          onClick={() => downloadCertificate(contract)}
                          style={{
                            color: "#38bdf8",
                            fontSize: "12px",
                            textDecoration: "none",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            background: "rgba(56, 189, 248, 0.1)",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          下载存证证书
                        </button>
                        <button
                          onClick={() => handleDownloadOriginal(contract)}
                          style={{
                            color: "#0369a1",
                            fontSize: "12px",
                            textDecoration: "none",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            border: "1px solid #bae6fd",
                            background: "#ecfeff",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          下载原始文件
                        </button>
                        {!isAuditor() && contract.status !== "pending" && contract.archive_status !== "archived" && (
                          <button
                            onClick={() => handleArchive(contract.id)}
                            style={{
                              color: "#7c3aed",
                              fontSize: "12px",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              border: "1px solid #ddd6fe",
                              background: "#f5f3ff",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            独立归档
                          </button>
                        )}
                        {!isAuditor() && contract.archive_status === "archived" && (
                          <button
                            onClick={() => handleUnarchive(contract.id)}
                            style={{
                              color: "#0f766e",
                              fontSize: "12px",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              border: "1px solid #99f6e4",
                              background: "#f0fdfa",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            恢复归档
                          </button>
                        )}
                        {canReviewContract() && contract.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(contract.id)}
                              style={{ 
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                color: "#15803d",
                                cursor: "pointer",
                                fontSize: "12px",
                                padding: "5px 10px",
                                borderRadius: "999px",
                                fontWeight: "600"
                              }}
                            >
                              审批通过
                            </button>
                            <button
                              onClick={() => handleReject(contract.id)}
                              style={{ 
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                cursor: "pointer",
                                fontSize: "12px",
                                padding: "5px 10px",
                                borderRadius: "999px",
                                fontWeight: "600"
                              }}
                            >
                              审批拒绝
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "0 16px" }}>
            <div style={{ color: "#64748b", fontSize: "13px" }}>
              共 {pagination.total} 条
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "13px" }}>共 {pagination.totalPages} 页</span>
              <select 
                value={pagination.page}
                onChange={(e) => handlePageChange(parseInt(e.target.value))}
                style={{ padding: "6px 8px", border: "1px solid #dbe5f1", borderRadius: "8px" }}
              >
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>第 {i + 1} 页</option>
                ))}
              </select>
              <button 
                onClick={() => handlePageChange(pagination.page - 1)} 
                disabled={pagination.page === 1}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #dbe5f1",
                  background: pagination.page === 1 ? "#f8fafc" : "#fff",
                  borderRadius: "8px",
                  cursor: pagination.page === 1 ? "not-allowed" : "pointer",
                  color: pagination.page === 1 ? "#94a3b8" : "#334155"
                }}
              >
                上一页
              </button>
              <button 
                onClick={() => handlePageChange(pagination.page + 1)} 
                disabled={pagination.page === pagination.totalPages}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #dbe5f1",
                  background: pagination.page === pagination.totalPages ? "#f8fafc" : "#fff",
                  borderRadius: "8px",
                  cursor: pagination.page === pagination.totalPages ? "not-allowed" : "pointer",
                  color: pagination.page === pagination.totalPages ? "#94a3b8" : "#334155"
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default ContractList;
