import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  connectWallet,
  disconnectWallet,
  isMetaMaskInstalled,
  storeContractOnChain,
  getCurrentAccount,
  onAccountChanged,
  switchNetwork,
  checkEnvironmentHealth
} from "../utils/web3";
import { contractAPI } from "../utils/api";

function UploadContract() {
  const navigate = useNavigate();
  const location = useLocation();
  const [wallet, setWallet] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contractName, setContractName] = useState("");
  const [contractType, setContractType] = useState("");
  const [signerMy, setSignerMy] = useState("");
  const [signerOther, setSignerOther] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [contractDescription, setContractDescription] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [versionSourceName, setVersionSourceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isUploadingRef = useRef(false);
  const searchParams = new URLSearchParams(location.search);
  const fromContractId = searchParams.get("fromContractId");

  // 检查MetaMask连接状态
  useEffect(() => {
    checkWalletConnection();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (fromContractId) {
      loadVersionBaseContract(fromContractId);
    }
  }, [fromContractId]);

  // 组件卸载时如果正在上链，提醒用户
  useEffect(() => {
    return () => {
      if (isUploadingRef.current) {
        console.warn("⚠️ 组件卸载时仍有上链操作进行中，交易可能仍在MetaMask中等待确认");
      }
    };
  }, []);

  const checkWalletConnection = async () => {
    if (!isMetaMaskInstalled()) {
      setError("请安装MetaMask钱包插件");
      return;
    }

    try {
      const account = await getCurrentAccount();
      if (account) {
        const savedAddress = localStorage.getItem("walletAddress");
        if (savedAddress === account) {
          await connectMetaMask();
        }
      }
    } catch (err) {
      console.error("检查钱包连接失败:", err);
    }
  };

  const connectMetaMask = async () => {
    try {
      setError("");
      const result = await connectWallet();
      setWallet(result.address);
      setSigner(result.signer);
      // 设置 provider 用于后续环境健康检查
      if (result.provider) {
        setProvider(result.provider);
      } else if (window.ethereum) {
        const ethers = require("ethers");
        setProvider(new ethers.providers.Web3Provider(window.ethereum));
      }
      setChainId(result.chainId);

      // 保存到localStorage
      localStorage.setItem("walletAddress", result.address);
      localStorage.setItem("walletConnected", "true");

      // 监听账户变化
      onAccountChanged(async (newAccount) => {
        if (newAccount) {
          await connectMetaMask();
        } else {
          handleDisconnect();
        }
      });
    } catch (err) {
      setError(err.message || "连接MetaMask失败");
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await contractAPI.getTemplates();
      if (result.success) {
        setTemplates(result.data || []);
      }
    } catch (err) {
      console.error("获取模板失败:", err);
    }
  };

  const applyTemplate = (templateId) => {
    const template = templates.find((item) => String(item.id) === String(templateId));
    if (!template) return;

    setSelectedTemplateId(String(template.id));
    setContractName(template.contract_name || "");
    setContractType(template.contract_type || "");
    setSignerMy(template.signer_my || "");
    setSignerOther(template.signer_other || "");
    setContractAmount(template.contract_amount || "");
    setContractDescription(template.contract_description || "");

    if (template.expire_days) {
      const date = new Date();
      date.setDate(date.getDate() + Number(template.expire_days));
      setExpireAt(date.toISOString().slice(0, 16));
    }
  };

  const loadVersionBaseContract = async (contractId) => {
    try {
      const result = await contractAPI.getContractById(contractId);
      if (!result.success) return;

      const baseContract = result.data;
      setVersionSourceName(baseContract.contract_name);
      setContractName(`${baseContract.contract_name} V${Number(baseContract.version_no || 1) + 1}`);
      setContractType(baseContract.contract_type || "");
      setSignerMy(baseContract.signer_my || "");
      setSignerOther(baseContract.signer_other || "");
      setContractAmount(baseContract.contract_amount || "");
      setContractDescription(baseContract.contract_description || "");
      if (baseContract.expire_at) {
        setExpireAt(new Date(baseContract.expire_at).toISOString().slice(0, 16));
      }
    } catch (err) {
      console.error("加载版本基准合同失败:", err);
    }
  };

  const handleSaveTemplate = async () => {
    if (!contractName.trim()) {
      setError("请先填写合同名称后再保存模板");
      return;
    }

    setTemplateBusy(true);
    setError("");
    try {
      const result = await contractAPI.createTemplate({
        templateName: `${contractName}模板`,
        contractName,
        contractType,
        signerMy,
        signerOther,
        contractAmount,
        contractDescription,
        expireDays: expireAt
          ? Math.max(0, Math.ceil((new Date(expireAt) - new Date()) / (24 * 60 * 60 * 1000)))
          : null
      });

      if (result.success) {
        await loadTemplates();
        setSuccess("模板保存成功，可直接复用于后续合同录入");
      }
    } catch (err) {
      console.error("保存模板失败:", err);
      setError(err.response?.data?.message || "保存模板失败");
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("确定删除该合同模板吗？")) {
      return;
    }

    setTemplateBusy(true);
    try {
      const result = await contractAPI.deleteTemplate(templateId);
      if (result.success) {
        await loadTemplates();
        if (String(selectedTemplateId) === String(templateId)) {
          setSelectedTemplateId("");
        }
      }
    } catch (err) {
      console.error("删除模板失败:", err);
      setError(err.response?.data?.message || "删除模板失败");
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWallet(null);
    setSigner(null);
    setChainId(null);
    setError("");
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork(11155111);
      await connectMetaMask();
    } catch (err) {
      setError("切换网络失败，请手动在MetaMask中切换到 Sepolia 测试网");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError("文件大小不能超过50MB");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (isUploadingRef.current) return;

    if (!wallet || !signer) {
      setError("请先连接MetaMask钱包");
      return;
    }

    if (!contractName.trim()) {
      setError("请输入合同名称");
      return;
    }

    if (!selectedFile) {
      setError("请选择要上传的合同文件");
      return;
    }

    // 检查钱包绑定状态
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user?.wallet_address) {
      setError("❌ 未检测到绑定的钱包地址。上链存证需要先在首页工作台完成钱包绑定。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    isUploadingRef.current = true;

    try {
      // 0. 环境健康检查 (确保上链前环境正常)
      if (provider && signer) {
        console.log("🔍 正在进行环境健康检查...");
        const health = await checkEnvironmentHealth(provider, signer);
        if (!health.ok) {
          setError(`❌ 环境异常：${health.message}`);
          setLoading(false);
          isUploadingRef.current = false;
          return;
        }
        console.log("✅ 环境健康检查通过");
      }

      const prepareFormData = new FormData();
      prepareFormData.append("file", selectedFile);

      setSuccess("⏳ 正在上传到 IPFS，生成真实存证标识...");
      const prepareResult = await contractAPI.prepareUpload(prepareFormData);

      if (!prepareResult.success) {
        throw new Error(prepareResult.message || "合同预处理失败");
      }

      const { fileHash, ipfsCid } = prepareResult.data;

      console.log("📄 文件哈希:", fileHash);
      console.log("📤 真实IPFS CID:", ipfsCid);

      setSuccess("⏳ 正在上链存证，请确认MetaMask交易...");
      console.log("⛓️ 开始上链...");

      const result = await storeContractOnChain(signer, ipfsCid, fileHash);

      console.log("✅ 上链成功!");
      console.log("   合同ID:", result.contractId);
      console.log("   交易哈希:", result.txHash);

      // 4. 保存到后端数据库
      setSuccess("⏳ 上链成功，正在保存到数据库...");

      const formData = new FormData();
      formData.append("contractName", contractName);
      if (contractType) formData.append("contractType", contractType);
      if (signerMy) formData.append("signerMy", signerMy);
      if (signerOther) formData.append("signerOther", signerOther);
      if (contractAmount) formData.append("contractAmount", contractAmount);
      if (contractDescription) formData.append("contractDescription", contractDescription);
      if (expireAt) formData.append("expireAt", expireAt);
      if (selectedTemplateId) formData.append("templateId", selectedTemplateId);
      if (fromContractId) formData.append("baseContractId", fromContractId);
      formData.append("file", selectedFile);
      formData.append("wallet_address", wallet);
      formData.append("fileHash", fileHash);
      formData.append("ipfsCid", ipfsCid);
      if (result.txHash) formData.append("txHash", result.txHash);
      if (result.contractId) formData.append("contractId", result.contractId);

      const saveResult = await contractAPI.uploadContract(formData);

      if (saveResult.success) {
        console.log("✅ 保存到数据库成功!");
        setSuccess(`🎉 合同上链存证成功！

合同名称: ${contractName}
区块链合同ID: ${result.contractId}
交易哈希: ${result.txHash}
IPFS CID: ${ipfsCid}
文件哈希: ${fileHash.substring(0, 20)}...

数据库记录ID: ${saveResult.data.id}
数据库合同ID: ${saveResult.data.blockchainContractId}
`);
      } else {
        console.warn("⚠️ 保存到数据库失败，但上链成功");
        setSuccess(`🎉 合同上链存证成功！（数据库保存失败）

区块链合同ID: ${result.contractId}
交易哈希: ${result.txHash}
IPFS CID: ${ipfsCid}
文件哈希: ${fileHash.substring(0, 20)}...`);
      }

      // 清空表单
      setContractName("");
      setContractType("");
      setSignerMy("");
      setSignerOther("");
      setContractAmount("");
      setContractDescription("");
      setExpireAt("");
      setSelectedFile(null);
      setSelectedTemplateId("");

      // 3秒后跳转到合同列表
      setTimeout(() => {
        navigate("/contracts");
      }, 3000);
    } catch (err) {
      console.error("上传失败:", err);
      console.error("上传失败详情:", {
        requestUrl: err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : err.config?.url,
        status: err.response?.status,
        response: err.response?.data
      });

      if (err.code === "USER_REJECTED") {
        setError("❌ 您取消了交易，请在上链存证页面点击「确认」按钮完成上链");
      } else if (err.response?.status === 404) {
        setError("❌ 合同预处理接口未命中。当前代码已确认存在该接口，这通常是本地服务缓存或未重启导致。请刷新页面并重启前后端服务后重试。");
      } else if (err.response?.status === 401) {
        setError("❌ 登录状态已失效，请重新登录后再上传。");
      } else if (err.code === "TIMEOUT") {
        setError("⏳ 交易确认超时，请稍后在MetaMask中查看交易状态。交易哈希: " + (err.txHash || "无"));
      } else if (err.code === "GAS_ERROR") {
        setError("❌ 交易失败：Gas费用过低，请稍后重试");
      } else if (err.code === "ACTION_REJECTED") {
        setError("❌ 交易被拒绝，请确保MetaMask中点击了「确认」");
      } else if (err.code === "REPLACED") {
        setError("❌ 交易被替换或取消，请重试");
      } else if (err.message && err.message.includes("user rejected")) {
        setError("❌ 用户取消了交易，请点击「确认」完成上链");
      } else if (err.code === "METAMASK_RPC_ERROR" || err.code === -32603) {
        setError("❌ " + (err.message || "MetaMask请求超时，请检查网络连接后重试。如果交易已发送，请在MetaMask中查看pending交易。"));
      } else if (err.pendingMessage) {
        setError("❌ " + err.pendingMessage);
      } else {
        setError(err.message || "上链存证失败，请重试");
      }
      setSuccess("");
    } finally {
      setLoading(false);
      isUploadingRef.current = false;
    }
  };

  // --- 企业级样式配置 (Dark Enterprise Theme) ---
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
    padding: "20px",
    color: "#1e293b"
  };

  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
    marginTop: "6px"
  };

  return (
    <div style={pageBackgroundStyle}>
      <div style={gridBackgroundStyle} />
      
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "28px 24px", position: "relative", zIndex: 1 }}>
        <div
          className="page-header"
          style={{
            marginBottom: "18px",
            padding: "22px 24px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h1 style={{ color: "#ffffff", fontSize: "28px", marginBottom: "6px", fontWeight: "700" }}>合同上链存证</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>企业级链上确权、可追溯管理与可信凭证归档</p>
          </div>
          <Link to="/contracts" className="btn-secondary" style={{ borderRadius: "10px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", fontWeight: "600" }}>
            返回列表
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* MetaMask连接状态 */}
            <div style={cardStyle}>
              <h3 style={{ color: "#0f172a", fontSize: "18px", marginBottom: "16px", borderLeft: "4px solid #2563eb", paddingLeft: "12px" }}>钱包连接</h3>

              {!wallet ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <p style={{ color: "#64748b", marginBottom: "16px", fontSize: "14px" }}>连接钱包以进行存证</p>
                  <button onClick={connectMetaMask} className="btn-primary" style={{ width: "100%", padding: "12px", borderRadius: "10px" }}>
                    🦊 连接 MetaMask
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: "14px" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ color: "#10b981", fontWeight: "700", marginBottom: "4px" }}>✅ 已成功连接</div>
                    <div style={{ color: "#475569", fontFamily: "monospace" }}>{wallet.substring(0, 12)}...{wallet.substring(34)}</div>
                  </div>
                  <div style={{ color: "#64748b", marginBottom: "16px" }}>网络: <span style={{ color: "#1e293b" }}>Sepolia (11155111)</span></div>
                  <button onClick={handleDisconnect} className="btn-secondary" style={{ width: "100%", padding: "8px", borderRadius: "8px", fontSize: "13px" }}>
                    断开连接
                  </button>
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, background: "rgba(241, 245, 249, 0.8)" }}>
              <h3 style={{ color: "#0f172a", fontSize: "16px", marginBottom: "12px" }}>存证须知</h3>
              <ul style={{ color: "#475569", fontSize: "13px", paddingLeft: "18px", lineHeight: "1.8" }}>
                <li>文件哈希将在本地计算，保护隐私</li>
                <li>存证后不可篡改，具有法律效力</li>
                <li>需消耗少量 Sepolia ETH 作为 Gas</li>
                <li>支持 PDF, JPG, PNG, DOCX 等格式</li>
              </ul>
            </div>
          </div>

          {/* 上传表单 */}
          <div style={cardStyle}>
            <h3 style={{ color: "#0f172a", fontSize: "18px", marginBottom: "20px", borderLeft: "4px solid #2563eb", paddingLeft: "12px" }}>合同存证表单</h3>

            {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}
            {success && <div className="success-message" style={{ whiteSpace: "pre-wrap", marginBottom: "16px" }}>{success}</div>}
            {fromContractId && (
              <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "12px", background: "rgba(219,234,254,0.9)", border: "1px solid rgba(96,165,250,0.35)", color: "#1e3a8a", fontWeight: "600" }}>
                当前正在基于合同《{versionSourceName || fromContractId}》创建新版本，提交后会自动纳入同一版本链。
              </div>
            )}

            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr auto", gap: "12px", alignItems: "end" }}>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>合同模板</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      if (e.target.value) applyTemplate(e.target.value);
                    }}
                    style={inputStyle}
                    disabled={loading || templateBusy}
                  >
                    <option value="">请选择模板（可选）</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.template_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={loading || templateBusy || !wallet}
                    className="btn-secondary"
                    style={{ borderRadius: "10px" }}
                  >
                    {templateBusy ? "处理中..." : "保存为模板"}
                  </button>
                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplateId)}
                      disabled={loading || templateBusy}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid rgba(244,63,94,0.3)",
                        background: "rgba(244,63,94,0.12)",
                        color: "#fda4af",
                        cursor: "pointer"
                      }}
                    >
                      删除模板
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>合同名称 *</label>
                  <input
                    type="text"
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    placeholder="例如：2024年度采购协议"
                    style={inputStyle}
                    disabled={loading || !wallet}
                    required
                  />
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>合同金额</label>
                  <input
                    type="text"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    placeholder="例如：50,000"
                    style={inputStyle}
                    disabled={loading || !wallet}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>合同类型</label>
                  <input
                    type="text"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    placeholder="例如：销售采购 / 服务协议"
                    style={inputStyle}
                    disabled={loading || !wallet}
                  />
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>到期时间</label>
                  <input
                    type="datetime-local"
                    value={expireAt}
                    onChange={(e) => setExpireAt(e.target.value)}
                    style={inputStyle}
                    disabled={loading || !wallet}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>我方签署人</label>
                  <input
                    type="text"
                    value={signerMy}
                    onChange={(e) => setSignerMy(e.target.value)}
                    placeholder="请输入姓名"
                    style={inputStyle}
                    disabled={loading || !wallet}
                  />
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: "13px" }}>对方签署人</label>
                  <input
                    type="text"
                    value={signerOther}
                    onChange={(e) => setSignerOther(e.target.value)}
                    placeholder="请输入姓名/公司名"
                    style={inputStyle}
                    disabled={loading || !wallet}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: "#64748b", fontSize: "13px" }}>合同备注描述</label>
                <textarea
                  value={contractDescription}
                  onChange={(e) => setContractDescription(e.target.value)}
                  placeholder="请输入合同详细背景或摘要信息"
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  disabled={loading || !wallet}
                />
              </div>

              <div 
                style={{ 
                  border: "2px dashed rgba(148, 163, 184, 0.3)", 
                  borderRadius: "12px", 
                  padding: "30px", 
                  textAlign: "center",
                  background: "rgba(241, 245, 249, 0.8)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = "#38bdf8"}
                onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)"}
                onClick={() => document.getElementById("file-upload").click()}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  disabled={loading || !wallet}
                />
                {selectedFile ? (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "10px" }}>📄</div>
                    <div style={{ color: "#1e293b", fontWeight: "600" }}>{selectedFile.name}</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>{(selectedFile.size / 1024).toFixed(2)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "10px" }}>📤</div>
                    <div style={{ color: "#1e293b", fontWeight: "600" }}>点击或拖拽上传合同文件</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>支持 PDF, DOCX, PNG, JPG (最大 50MB)</div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: "10px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ 
                    width: "100%", 
                    padding: "14px", 
                    borderRadius: "12px", 
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    fontSize: "16px",
                    fontWeight: "700",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)"
                  }}
                  disabled={loading || !wallet || !selectedFile}
                >
                  {loading ? "🚀 正在处理存证流程..." : "🔒 确认上链存证"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadContract;
