import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { contractAPI } from "../utils/api";

function VerifyContract() {
  const [searchParams] = useSearchParams();
  const [contractId, setContractId] = useState(searchParams.get("id") || "");
  const [fileHash, setFileHash] = useState(searchParams.get("hash") || "");
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getStatusText = (status) => {
    if (status === "approved") return "✅ 已审批";
    if (status === "pending") return "⏳ 待审批";
    if (status === "rejected") return "❌ 已拒绝";
    return "未知状态";
  };

  const getResultMeta = (result) => {
    if (!result) {
      return null;
    }

    if (result.conclusion === "verified") {
      return {
        title: "✅ 链上校验通过",
        description: "已完成链上哈希比对，当前文件与链上存证记录一致，可作为高可信校验结果。",
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        titleColor: "#166534",
        textColor: "#166534",
        badgeBackground: "#dcfce7"
      };
    }

    if (result.conclusion === "on_chain_record_only") {
      return {
        title: "⚠️ 仅找到链上记录",
        description: "当前只确认链上存在该合同记录，尚未完成文件哈希一致性校验，不能据此认定文件内容正确。",
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        titleColor: "#92400e",
        textColor: "#92400e",
        badgeBackground: "#fef3c7"
      };
    }

    if (result.conclusion === "database_only") {
      return {
        title: "⚠️ 仅命中数据库记录",
        description: "系统内存在该合同记录，但当前没有形成链上哈希验证通过结果，不能视为链上存证成功。",
        border: "1px solid #fde68a",
        background: "#fffbeb",
        titleColor: "#92400e",
        textColor: "#92400e",
        badgeBackground: "#fef3c7"
      };
    }

    return {
      title: "❌ 未找到有效校验结果",
      description: "当前输入既未命中链上有效记录，也未命中数据库记录，请检查合同编号或文件哈希是否正确。",
      border: "1px solid #fecaca",
      background: "#fef2f2",
      titleColor: "#b91c1c",
      textColor: "#991b1b",
      badgeBackground: "#fee2e2"
    };
  };

  const getRecommendationList = (result) => {
    if (!result) {
      return [];
    }

    if (result.conclusion === "verified") {
      return [
        "当前结果已完成链上哈希比对，可作为高可信校验结论。",
        "如需审计留档，建议同时保存交易哈希与原始文件哈希。"
      ];
    }

    if (result.conclusion === "on_chain_record_only") {
      return [
        "补充上传时的原始文件哈希，再执行一次完整校验。",
        "若来自合同详情页，优先使用“系统编号 + 文件哈希”组合验证。"
      ];
    }

    if (result.conclusion === "database_only") {
      return [
        "检查该合同是否真实完成上链，重点核对 contract_id 与 tx_hash。",
        "确认当前输入的文件哈希是否为上传时保存的原始 SHA256。"
      ];
    }

    return [
      "检查合同编号是否填写为系统编号或真实链上存证编号。",
      "重新计算文件 SHA256 哈希后再次验证。"
    ];
  };

  // 验证合同
  const handleVerify = async (e) => {
    e.preventDefault();

    const normalizedContractId = String(contractId || "").trim();
    const normalizedFileHash = String(fileHash || "").trim().toLowerCase();

    if (!normalizedContractId && !normalizedFileHash) {
      setError("请输入合同ID或文件哈希");
      return;
    }

    if (normalizedContractId && (!/^\d+$/.test(normalizedContractId) || Number(normalizedContractId) <= 0)) {
      setError("合同ID格式不正确，请输入正整数");
      return;
    }

    if (normalizedFileHash && !/^[a-f0-9]{64}$/i.test(normalizedFileHash)) {
      setError("文件哈希格式不正确，请输入64位SHA256哈希");
      return;
    }

    setLoading(true);
    setError("");
    setVerifyResult(null);

    try {
      const result = await contractAPI.verifyContract(
        normalizedContractId || null,
        normalizedFileHash || null
      );

      if (result.success) {
        setVerifyResult(result.data);
      } else {
        setError(result.message || "验证失败");
      }
    } catch (err) {
      console.error("验证失败:", err);
      setError(err.response?.data?.message || "验证失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setContractId("");
    setFileHash("");
    setVerifyResult(null);
    setError("");
  };

  const resultMeta = getResultMeta(verifyResult);
  const recommendationList = getRecommendationList(verifyResult);

  return (
    <div className="page-container" style={{ minHeight: "100vh", maxWidth: "none", padding: "24px", background: "#f8fafc" }}>
      <div
        className="page-header"
        style={{
          marginBottom: "16px",
          padding: "20px 24px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)"
        }}
      >
        <div>
          <h1 style={{ color: "#ffffff", fontSize: "28px", marginBottom: "6px", fontWeight: "700" }}>合同真伪验证</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>基于区块链与数据库双通道比对，快速确认合同可信性</p>
        </div>
        <Link to="/contracts" className="btn-secondary" style={{ borderRadius: "10px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff" }}>
          返回列表
        </Link>
      </div>

      <div
        className="verify-card"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
          padding: "20px"
        }}
      >
        <div className="verify-intro">
          <h3>📋 验证说明</h3>
          <p>
            您可以通过以下方式验证合同的真实性：
          </p>
          <ul>
            <li><strong>合同ID：</strong>支持系统合同编号，也兼容链上存证编号</li>
            <li><strong>文件哈希：</strong>输入上传文件对应的 SHA256 哈希值</li>
          </ul>
          <p className="verify-note">
            同时填写合同ID与文件哈希时，系统会优先执行链上哈希一致性比对，结果最可靠。
          </p>
        </div>

        <form onSubmit={handleVerify} className="verify-form">
          <div className="form-group">
            <label htmlFor="contractId">合同ID</label>
            <input
              type="number"
              id="contractId"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="请输入合同ID"
              disabled={loading}
            />
          </div>

          <div className="form-group-divider">或</div>

          <div className="form-group">
            <label htmlFor="fileHash">文件哈希</label>
            <input
              type="text"
              id="fileHash"
              value={fileHash}
              onChange={(e) => setFileHash(e.target.value)}
              placeholder="请输入文件SHA256哈希"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "验证中..." : "🔐 验证"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              重置
            </button>
          </div>
        </form>

        {/* 验证结果 */}
        {verifyResult && (
          <div
            style={{
              marginTop: "16px",
              borderRadius: "12px",
              border: resultMeta.border,
              background: resultMeta.background,
              padding: "14px 16px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, color: resultMeta.titleColor, fontSize: "22px" }}>{resultMeta.title}</h3>
                <p style={{ margin: "8px 0 0", color: resultMeta.textColor, fontSize: "14px", lineHeight: 1.7 }}>{resultMeta.description}</p>
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  background: resultMeta.badgeBackground,
                  color: resultMeta.titleColor,
                  fontSize: "12px",
                  fontWeight: "700",
                  whiteSpace: "nowrap"
                }}
              >
                可信级别：{verifyResult.trustLevel === "high" ? "高" : verifyResult.trustLevel === "medium" ? "中" : "低"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
              {[
                {
                  label: "链上记录",
                  value: verifyResult.onChainRecordFound ? "已找到" : "未找到",
                  background: verifyResult.onChainRecordFound ? "rgba(37, 99, 235, 0.08)" : "rgba(239, 68, 68, 0.08)",
                  color: verifyResult.onChainRecordFound ? "#1d4ed8" : "#b91c1c"
                },
                {
                  label: "文件一致性",
                  value: verifyResult.integrityVerified ? "已验证" : "未验证",
                  background: verifyResult.integrityVerified ? "rgba(22, 163, 74, 0.08)" : "rgba(245, 158, 11, 0.08)",
                  color: verifyResult.integrityVerified ? "#15803d" : "#b45309"
                },
                {
                  label: "数据库记录",
                  value: verifyResult.databaseMatched ? "已命中" : "未命中",
                  background: verifyResult.databaseMatched ? "rgba(120, 53, 15, 0.08)" : "rgba(148, 163, 184, 0.14)",
                  color: verifyResult.databaseMatched ? "#92400e" : "#475569"
                }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: "10px",
                    padding: "12px 14px",
                    background: item.background,
                    border: "1px solid rgba(148, 163, 184, 0.18)"
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{item.label}</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.42)", borderRadius: "12px", padding: "14px 16px", marginBottom: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 18px" }}>
                <p style={{ margin: 0 }}><strong>验证方式：</strong>{verifyResult.method === "blockchain" ? "链上哈希校验" : verifyResult.method === "blockchain_lookup" ? "链上记录查询" : verifyResult.method === "database" ? "数据库记录校验" : "未命中"}</p>
                <p style={{ margin: 0 }}><strong>输入合同ID：</strong>{verifyResult.query?.contractId || "未提供"}</p>
                <p style={{ margin: 0 }}><strong>输入文件哈希：</strong>{verifyResult.query?.fileHash || "未提供"}</p>
                {verifyResult.contract?.contract_id && <p style={{ margin: 0 }}><strong>链上存证ID：</strong>{verifyResult.contract.contract_id}</p>}
                {verifyResult.contract?.id && <p style={{ margin: 0 }}><strong>系统合同ID：</strong>{verifyResult.contract.id}</p>}
                {verifyResult.contract?.tx_hash && <p style={{ margin: 0, wordBreak: "break-all" }}><strong>交易哈希：</strong>{verifyResult.contract.tx_hash}</p>}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.42)", borderRadius: "12px", padding: "14px 16px", marginBottom: verifyResult.contract ? "14px" : "0" }}>
              {verifyResult.contract && (
                <>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>匹配到的合同记录</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 18px" }}>
                    <p style={{ margin: 0 }}><strong>合同名称：</strong>{verifyResult.contract.contract_name}</p>
                    <p style={{ margin: 0 }}><strong>合同状态：</strong>{getStatusText(verifyResult.contract.status)}</p>
                    <p style={{ margin: 0 }}><strong>上传人：</strong>{verifyResult.contract.uploader_name || "未知"}</p>
                    <p style={{ margin: 0 }}><strong>上传时间：</strong>{new Date(verifyResult.contract.created_at).toLocaleString("zh-CN")}</p>
                    <p style={{ margin: 0, wordBreak: "break-all" }}><strong>数据库哈希：</strong>{verifyResult.contract.file_hash}</p>
                    {verifyResult.contract.ipfs_cid && <p style={{ margin: 0, wordBreak: "break-all" }}><strong>IPFS CID：</strong>{verifyResult.contract.ipfs_cid}</p>}
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                borderRadius: "12px",
                padding: "14px 16px",
                background: "rgba(255,255,255,0.36)",
                border: "1px dashed rgba(148, 163, 184, 0.28)"
              }}
            >
              <div style={{ fontWeight: "700", marginBottom: "10px", color: resultMeta.titleColor }}>处理建议</div>
              {recommendationList.map((item) => (
                <p key={item} style={{ margin: "0 0 8px", color: resultMeta.textColor, lineHeight: 1.7 }}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyContract;
