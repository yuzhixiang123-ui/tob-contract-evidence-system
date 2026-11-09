import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { contractAPI } from "../utils/api";
import AdminNavbar from "../components/AdminNavbar";

function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error("解析用户信息失败:", e);
      }
    }
  }, []);

  const isAdmin = () => currentUser?.role === "admin";
  const isAuditor = () => currentUser?.role === "auditor";
  const isManagementUser = () => isAdmin() || isAuditor();
  const canManageArchive = () => currentUser?.role === "admin" || currentUser?.role === "user";

  const loadContract = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await contractAPI.getContractById(id);

      if (result.success) {
        setContract(result.data);
      } else {
        setError(result.message || "获取合同详情失败");
      }
    } catch (err) {
      console.error("获取合同详情失败:", err);
      setError(err.response?.data?.message || "获取合同详情失败");
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const result = await contractAPI.getContractVersions(id);
      if (result.success) {
        setVersions(result.data || []);
      }
    } catch (err) {
      console.error("获取版本历史失败:", err);
    }
  };

  const refreshData = async () => {
    await Promise.all([loadContract(), loadVersions()]);
  };

  useEffect(() => {
    refreshData();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const result = await contractAPI.approveContract(id);

      if (result.success) {
        setActionSuccess("合同审批成功！");
        await refreshData();
      } else {
        setActionError(result.message || "审批失败");
      }
    } catch (err) {
      console.error("审批失败:", err);
      setActionError(err.response?.data?.message || "审批失败");
    } finally {
      setActionLoading(false);
    }
  };

  // 拒绝合同
  const handleReject = async () => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const result = await contractAPI.rejectContract(id);

      if (result.success) {
        setActionSuccess("合同已拒绝！");
        await refreshData();
      } else {
        setActionError(result.message || "拒绝失败");
      }
    } catch (err) {
      console.error("拒绝失败:", err);
      setActionError(err.response?.data?.message || "拒绝失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const result = contract.archive_status === "archived"
        ? await contractAPI.unarchiveContract(id)
        : await contractAPI.archiveContract(id);
      setActionSuccess(result.message || "操作成功");
      await refreshData();
    } catch (err) {
      console.error("归档操作失败:", err);
      setActionError(err.response?.data?.message || "归档操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadOriginal = async () => {
    try {
      const result = await contractAPI.downloadContractFile(id);
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName || `${contract.contract_name || `contract-${id}`}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("下载原始文件失败:", err);
      setActionError(err.response?.data?.message || "下载原始文件失败");
    }
  };

  const downloadCertificate = () => {
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN");
  };

  const getExpiryMeta = () => {
    if (!contract?.expire_at) {
      return {
        text: "未设置到期时间",
        background: "rgba(148, 163, 184, 0.14)",
        color: "#475569"
      };
    }

    if (contract.expiryStatus === "expired") {
      return {
        text: `已过期 ${Math.abs(contract.daysUntilExpiry)} 天`,
        background: "rgba(244, 63, 94, 0.12)",
        color: "#fda4af"
      };
    }

    if (contract.expiryStatus === "expiring_soon") {
      return {
        text: `${contract.daysUntilExpiry} 天内到期`,
        background: "rgba(245, 158, 11, 0.12)",
        color: "#fbbf24"
      };
    }

    return {
      text: `${contract.daysUntilExpiry} 天后到期`,
      background: "rgba(34, 197, 94, 0.12)",
      color: "#86efac"
    };
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "approved":
        return "已审批";
      case "pending":
        return "待审批";
      case "rejected":
        return "已拒绝";
      default:
        return status;
    }
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case "approved":
        return {
          background: "#dcfce7",
          borderColor: "#86efac",
          color: "#166534"
        };
      case "pending":
        return {
          background: "#fef3c7",
          borderColor: "#fcd34d",
          color: "#92400e"
        };
      case "rejected":
        return {
          background: "#fee2e2",
          borderColor: "#fca5a5",
          color: "#b91c1c"
        };
      default:
        return {
          background: "#e2e8f0",
          borderColor: "#cbd5e1",
          color: "#475569"
        };
    }
  };

  const getArchiveMeta = (archiveStatus) => {
    if (archiveStatus === "archived") {
      return {
        text: "已归档",
        background: "#e0e7ff",
        borderColor: "#a5b4fc",
        color: "#3730a3"
      };
    }

    return {
      text: "活跃",
      background: "#cffafe",
      borderColor: "#67e8f9",
      color: "#155e75"
    };
  };

  const pageBackgroundStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    position: "relative",
    overflowX: "hidden"
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

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
    padding: "30px",
    color: "#1e293b"
  };

  const infoRowStyle = {
    display: "flex",
    padding: "16px 0",
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)"
  };

  const labelStyle = {
    width: "140px",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "500"
  };

  const valueStyle = {
    flex: 1,
    color: "#1e293b",
    fontSize: "15px",
    wordBreak: "break-all"
  };
  const statusMeta = getStatusMeta(contract?.status);
  const archiveMeta = getArchiveMeta(contract?.archive_status);
  const expiryMeta = getExpiryMeta();

  if (loading) {
    return (
      <div style={pageBackgroundStyle}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#1e293b" }}>
          正在加载详情...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageBackgroundStyle}>
        <div style={{ maxWidth: "800px", margin: "100px auto", textAlign: "center", color: "#1e293b" }}>
          <p style={{ color: "#f43f5e", fontSize: "18px", marginBottom: "20px" }}>{error}</p>
          <button onClick={() => navigate("/contracts")} className="btn-secondary">返回列表</button>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={pageBackgroundStyle}>
        <div style={{ maxWidth: "800px", margin: "100px auto", textAlign: "center", color: "#1e293b" }}>
          <p style={{ color: "#f43f5e", fontSize: "18px", marginBottom: "20px" }}>合同不存在</p>
          <button onClick={() => navigate("/contracts")} className="btn-secondary">返回列表</button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBackgroundStyle}>
      {isManagementUser() && <AdminNavbar />}
      <div style={gridBackgroundStyle} />

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/contracts")}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
              fontWeight: "600"
            }}
          >
            ← 返回合同列表
          </button>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{
              padding: "6px 14px",
              borderRadius: "999px",
              background: statusMeta.background,
              color: statusMeta.color,
              fontWeight: "700",
              fontSize: "14px",
              border: `1px solid ${statusMeta.borderColor}`
            }}>
              {getStatusLabel(contract.status)}
            </span>
            <span style={{
              padding: "6px 14px",
              borderRadius: "999px",
              background: archiveMeta.background,
              color: archiveMeta.color,
              fontWeight: "700",
              fontSize: "14px",
              border: `1px solid ${archiveMeta.borderColor}`
            }}>
              {archiveMeta.text}
            </span>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                background: contract.is_latest_version ? "#dcfce7" : "#e2e8f0",
                color: contract.is_latest_version ? "#166534" : "#475569",
                fontWeight: "700",
                fontSize: "14px",
                border: `1px solid ${contract.is_latest_version ? "#86efac" : "#cbd5e1"}`
              }}
            >
              V{contract.version_no}{contract.is_latest_version ? " · 最新版本" : ""}
            </span>
          </div>
        </div>

        {isAuditor() && (
          <div
            style={{
              marginBottom: "20px",
              padding: "18px 22px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(219, 234, 254, 0.92) 0%, rgba(191, 219, 254, 0.78) 100%)",
              border: "1px solid rgba(96, 165, 250, 0.35)",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#1d4ed8", fontSize: "12px", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "6px" }}>
                  AUDITOR READ ONLY VIEW
                </div>
                <div style={{ color: "#1e293b", fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
                  审计只读视图
                </div>
                <div style={{ color: "#475569", fontSize: "14px", lineHeight: 1.7 }}>
                  当前页面仅用于审计取证与链上核验，您可查看合同内容、存证指纹、链上交易与原始凭证，但不能执行审批或修改操作。
                </div>
              </div>
              <Link
                  to={`/verify?id=${contract.id}&hash=${contract.file_hash}`}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.6)",
                    border: "1px solid rgba(191,219,254,0.35)",
                    color: "#1d4ed8",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "700",
                    whiteSpace: "nowrap"
                  }}
                >
                前往校验
              </Link>
            </div>
          </div>
        )}

        <div style={{ ...cardStyle, width: "100%", boxSizing: "border-box" }}>
          <div style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)", paddingBottom: "24px", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "36px", color: "#1e293b", marginBottom: "10px", letterSpacing: "-0.5px" }}>{contract.contract_name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              {contract.contract_type && (
                <span style={{ padding: "6px 12px", borderRadius: "999px", background: "#e0f2fe", color: "#075985", border: "1px solid #7dd3fc", fontSize: "13px", fontWeight: "700" }}>
                  {contract.contract_type}
                </span>
              )}
              {contract.template_name && (
                <span style={{ padding: "6px 12px", borderRadius: "999px", background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd", fontSize: "13px", fontWeight: "700" }}>
                  模板：{contract.template_name}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: "14px" }}>存证ID: <span style={{ color: "#475569", fontWeight: "600" }}>{contract.contract_id || "未上链"}</span></span>
              <span style={{ color: "rgba(148, 163, 184, 0.3)" }}>|</span>
              <span style={{ color: "#64748b", fontSize: "14px" }}>系统编号: <span style={{ color: "#475569" }}>{contract.id}</span></span>
              <span style={{ color: "rgba(148, 163, 184, 0.3)" }}>|</span>
              <span style={{ color: "#64748b", fontSize: "14px" }}>版本组: <span style={{ color: "#475569" }}>{contract.version_group_id || "-"}</span></span>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "18px" }}>
              <button
                onClick={handleDownloadOriginal}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  color: "#166534",
                  border: "1px solid #86efac",
                  cursor: "pointer",
                  fontWeight: "700"
                }}
              >
                下载原始文件
              </button>
              <button
                onClick={downloadCertificate}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "#e0f2fe",
                  color: "#075985",
                  border: "1px solid #7dd3fc",
                  cursor: "pointer",
                  fontWeight: "700"
                }}
              >
                下载存证证书
              </button>
              {!isAuditor() && (
                <Link
                  to={`/upload?fromContractId=${contract.id}`}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "#ede9fe",
                    color: "#5b21b6",
                    border: "1px solid #c4b5fd",
                    textDecoration: "none",
                    fontWeight: "700"
                  }}
                >
                  基于当前版本新建
                </Link>
              )}
              {canManageArchive() && contract.status !== "pending" && (
                <button
                  onClick={handleArchive}
                  disabled={actionLoading}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: contract.archive_status === "archived" ? "#ccfbf1" : "#ede9fe",
                    color: contract.archive_status === "archived" ? "#115e59" : "#5b21b6",
                    border: `1px solid ${contract.archive_status === "archived" ? "#5eead4" : "#c4b5fd"}`,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontWeight: "700"
                  }}
                >
                  {contract.archive_status === "archived" ? "恢复归档" : "归档合同"}
                </button>
              )}
              {isAuditor() && (
                <Link
                  to={`/verify?id=${contract.id}&hash=${contract.file_hash}`}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "rgba(37, 99, 235, 0.15)",
                    color: "#1d4ed8",
                    border: "1px solid rgba(37, 99, 235, 0.3)",
                    textDecoration: "none",
                    fontWeight: "700"
                  }}
                >
                  前往校验
                </Link>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {[
              { title: "到期提醒", value: expiryMeta.text, color: expiryMeta.color, background: expiryMeta.background },
              { title: "最近更新时间", value: formatDate(contract.updated_at), color: "#1e293b", background: "rgba(241, 245, 249, 0.8)" },
              { title: "上传人", value: contract.uploader_name || "-", color: "#1e293b", background: "rgba(241, 245, 249, 0.8)" },
              { title: "审批人", value: contract.approver_name || "暂未审批", color: "#1e293b", background: "rgba(241, 245, 249, 0.8)" }
            ].map((item) => (
              <div key={item.title} style={{ borderRadius: "14px", padding: "18px 20px", background: item.background, border: "1px solid rgba(148, 163, 184, 0.12)" }}>
                <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>{item.title}</div>
                <div style={{ color: item.color, fontSize: "18px", fontWeight: "700", lineHeight: 1.5 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            <div style={{ background: "rgba(241, 245, 249, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(203, 213, 225, 0.4)" }}>
              <h3 style={{ color: "#38bdf8", fontSize: "18px", marginBottom: "20px", borderLeft: "4px solid #38bdf8", paddingLeft: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📁</span> 基本属性
              </h3>
              <div style={infoRowStyle}>
                <div style={labelStyle}>我方签署人</div>
                <div style={valueStyle}>{contract.signer_my || "未填写"}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>合作关联方</div>
                <div style={valueStyle}>{contract.signer_other || "未填写"}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>合同类型</div>
                <div style={valueStyle}>{contract.contract_type || "未分类"}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>标的金额</div>
                <div style={{ ...valueStyle, color: "#f59e0b", fontWeight: "700", fontSize: "18px" }}>{contract.contract_amount ? `¥ ${contract.contract_amount}` : "未填写"}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>到期时间</div>
                <div style={valueStyle}>{formatDate(contract.expire_at)}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>到期状态</div>
                <div style={valueStyle}>{expiryMeta.text}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>模板来源</div>
                <div style={valueStyle}>{contract.template_name || "未使用模板"}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>归档状态</div>
                <div style={valueStyle}>{archiveMeta.text}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>创建时间</div>
                <div style={valueStyle}>{formatDate(contract.created_at)}</div>
              </div>
              <div style={{ ...infoRowStyle, borderBottom: "none" }}>
                <div style={labelStyle}>创建时间戳</div>
                <div style={valueStyle}>{formatDate(contract.updated_at)}</div>
              </div>
            </div>

            <div style={{ background: "rgba(241, 245, 249, 0.8)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(203, 213, 225, 0.4)" }}>
              <h3 style={{ color: "#38bdf8", fontSize: "18px", marginBottom: "20px", borderLeft: "4px solid #38bdf8", paddingLeft: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔗</span> 链上存证指纹
              </h3>
              <div style={infoRowStyle}>
                <div style={labelStyle}>存证 ID</div>
                <div style={{ ...valueStyle, color: "#10b981", fontWeight: "700" }}>{contract.contract_id || "区块链确认中..."}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>哈希摘要 (SHA256)</div>
                <div style={{ ...valueStyle, fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{contract.file_hash}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>IPFS 内容标识</div>
                <div style={{ ...valueStyle, fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{contract.ipfs_cid}</div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>区块交易哈希</div>
                <div style={{ ...valueStyle, fontFamily: "monospace", fontSize: "12px" }}>
                  {contract.tx_hash ? (
                    <a href={`https://sepolia.etherscan.io/tx/${contract.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                      {contract.tx_hash}
                    </a>
                  ) : "Pending..."}
                </div>
              </div>
              <div style={infoRowStyle}>
                <div style={labelStyle}>版本链</div>
                <div style={valueStyle}>
                  当前为 V{contract.version_no}，版本组 {contract.version_group_id || "-"}
                </div>
              </div>
              <div style={{ ...infoRowStyle, borderBottom: "none" }}>
                <div style={labelStyle}>上一个版本</div>
                <div style={valueStyle}>{contract.previous_version_id || "无"}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "30px", background: "#ffffff", padding: "24px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ color: "#38bdf8", fontSize: "18px", marginBottom: "16px", borderLeft: "4px solid #38bdf8", paddingLeft: "12px" }}>📄 合同详细描述 / 备注</h3>
            <div style={{ color: "#475569", fontSize: "15px", lineHeight: "1.8", minHeight: "100px", whiteSpace: "pre-wrap" }}>
              {contract.contract_description || "暂无合同详细描述信息"}
            </div>
          </div>

          <div style={{ marginTop: "24px", background: "#ffffff", padding: "24px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <h3 style={{ color: "#38bdf8", fontSize: "18px", margin: 0, borderLeft: "4px solid #38bdf8", paddingLeft: "12px" }}>🧬 版本历史</h3>
              {!isAuditor() && (
                <Link
                  to={`/upload?fromContractId=${contract.id}`}
                  style={{ color: "#1e40af", textDecoration: "none", fontWeight: "700", fontSize: "14px" }}
                >
                  + 从当前版本派生新版本
                </Link>
              )}
            </div>
            {versions.length === 0 ? (
              <div style={{ color: "#64748b" }}>暂无版本记录</div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {versions.map((version) => {
                  const versionStatusMeta = getStatusMeta(version.status);
                  const versionArchiveMeta = getArchiveMeta(version.archive_status);
                  return (
                    <div
                      key={version.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        padding: "14px 16px",
                        borderRadius: "14px",
                        background: version.id === contract.id ? "#dbeafe" : "rgba(241, 245, 249, 0.92)",
                        border: `1px solid ${version.id === contract.id ? "#93c5fd" : "rgba(148, 163, 184, 0.22)"}`
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <Link to={`/contracts/${version.id}`} style={{ color: "#1e293b", fontWeight: "700", textDecoration: "none" }}>
                            {version.contract_name}
                          </Link>
                          <span style={{ padding: "4px 10px", borderRadius: "999px", background: versionStatusMeta.background, border: `1px solid ${versionStatusMeta.borderColor}`, color: versionStatusMeta.color, fontSize: "12px", fontWeight: "700" }}>
                            {getStatusLabel(version.status)}
                          </span>
                          <span style={{ padding: "4px 10px", borderRadius: "999px", background: versionArchiveMeta.background, border: `1px solid ${versionArchiveMeta.borderColor}`, color: versionArchiveMeta.color, fontSize: "12px", fontWeight: "700" }}>
                            {versionArchiveMeta.text}
                          </span>
                          {version.is_latest_version ? (
                            <span style={{ padding: "4px 10px", borderRadius: "999px", background: "#dcfce7", border: "1px solid #86efac", color: "#166534", fontSize: "12px", fontWeight: "700" }}>
                              最新
                            </span>
                          ) : null}
                          {version.id === contract.id ? (
                            <span style={{ padding: "4px 10px", borderRadius: "999px", background: "rgba(59, 130, 246, 0.14)", border: "1px solid rgba(59, 130, 246, 0.24)", color: "#1d4ed8", fontSize: "12px", fontWeight: "700" }}>
                              当前查看
                            </span>
                          ) : null}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "13px" }}>
                          版本 V{version.version_no} · 更新时间 {formatDate(version.updated_at || version.created_at)}
                        </div>
                      </div>
                      <Link
                        to={`/contracts/${version.id}`}
                        style={{
                          color: "#1e40af",
                          textDecoration: "none",
                          fontSize: "14px",
                          fontWeight: "700"
                        }}
                      >
                        查看此版本
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {contract.status === "pending" && isAdmin() && (
            <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid rgba(148, 163, 184, 0.2)", display: "flex", gap: "20px", justifyContent: "flex-end" }}>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                style={{ 
                  padding: "14px 40px", 
                  borderRadius: "12px", 
                  background: "rgba(244, 63, 94, 0.1)", 
                  border: "1px solid #f43f5e", 
                  color: "#f43f5e", 
                  fontWeight: "700", 
                  cursor: "pointer",
                  fontSize: "16px",
                  transition: "all 0.2s"
                }}
              >
                拒绝申请
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                style={{ 
                  padding: "14px 60px", 
                  borderRadius: "12px", 
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                  border: "none", 
                  color: "#1e293b", 
                  fontWeight: "700", 
                  cursor: "pointer", 
                  fontSize: "16px",
                  boxShadow: "0 6px 20px rgba(16, 185, 129, 0.3)",
                  transition: "all 0.2s"
                }}
              >
                {actionLoading ? "处理中..." : "通过审批"}
              </button>
            </div>
          )}

          {contract.status === "pending" && isAuditor() && (
            <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(96, 165, 250, 0.24)",
                  color: "#1e40af",
                  fontSize: "14px",
                  lineHeight: 1.7
                }}
              >
                当前合同处于待审批状态。审计员可继续核查上传信息、链上哈希、交易记录与原始文件，但审批权限仅对系统管理员开放。
              </div>
            </div>
          )}

          {contract.status === "pending" && !isAdmin() && !isAuditor() && (
            <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid rgba(148, 163, 184, 0.2)", textAlign: "right" }}>
              <div style={{ color: "#64748b", fontSize: "14px", fontStyle: "italic" }}>
                ⏳ 合同正在等待管理员审批，当前账号无权操作
              </div>
            </div>
          )}

          {actionError && <div style={{ color: "#f43f5e", textAlign: "right", marginTop: "16px", padding: "12px", background: "rgba(244, 63, 94, 0.1)", borderRadius: "8px" }}>⚠️ {actionError}</div>}
          {actionSuccess && <div style={{ color: "#10b981", textAlign: "right", marginTop: "16px", padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px" }}>✅ {actionSuccess}</div>}
        </div>
      </div>
    </div>
  );
}

export default ContractDetail;
