import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: ""
  });

  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
    department: "",
    role: "user"
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authAPI.login(loginForm.username, loginForm.password);
      if (result.success) {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        
        // 根据角色跳转
        const user = result.data.user;
        if (user.role === "admin" || user.role === "auditor") {
          navigate("/admin/dashboard");
        } else {
          navigate("/contracts");
        }
      } else {
        setError(result.message || "登录失败");
      }
    } catch (err) {
      console.error("登录错误:", err);
      setError(err.response?.data?.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    if (registerForm.password.length < 6) {
      setError("密码长度至少6个字符");
      setLoading(false);
      return;
    }

    if (registerForm.username.length < 3) {
      setError("用户名长度至少3个字符");
      setLoading(false);
      return;
    }

    try {
      const result = await authAPI.register(
        registerForm.username,
        registerForm.password,
        registerForm.email,
        registerForm.phone,
        registerForm.department,
        registerForm.role
      );

      if (result.success) {
        alert("注册成功！请登录");
        setActiveTab("login");
        setRegisterForm({
          username: "",
          password: "",
          confirmPassword: "",
          email: "",
          phone: "",
          department: "",
          role: "user"
        });
      } else {
        setError(result.message || "注册失败");
      }
    } catch (err) {
      console.error("注册错误:", err);
      setError(err.response?.data?.message || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px 12px 44px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    transition: "all 0.2s ease",
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#1e293b"
  };

  const inputFocus = (e) => {
    e.target.style.borderColor = "#2563eb";
    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
  };
  const inputBlur = (e) => {
    e.target.style.borderColor = "#e2e8f0";
    e.target.style.boxShadow = "none";
  };

  const regInputStyle = {
    width: "100%",
    padding: "11px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    transition: "all 0.2s ease",
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#1e293b"
  };

  const features = [
    {
      title: "数字身份认证", desc: "为每个业务角色绑定唯一钱包地址", color: "#2563eb",
      svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    },
    {
      title: "全链路存证", desc: "覆盖从上传到销售的四个关键阶段", color: "#3b82f6",
      svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    },
    {
      title: "智能流转审批", desc: "基于链上合约的自动化协同流程", color: "#1d4ed8",
      svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
    },
    {
      title: "透明公开溯源", desc: "面向消费者的扫码即看真实记录", color: "#60a5fa",
      svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    }
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* 左侧白蓝面板 */}
      <div style={{
        flex: "0 0 38%",
        background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* 装饰光晕 */}
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-30%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-15%",
          left: "-20%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "#ffffff",
              fontWeight: "800",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
            }}>
              T
            </div>
            <div>
              <div style={{ color: "#1e293b", fontSize: "16px", fontWeight: "700", lineHeight: 1.2 }}>TrustSign</div>
              <div style={{ color: "#64748b", fontSize: "10px", letterSpacing: "2px", fontWeight: "500" }}>CONTRACT · CHAIN · TRUST</div>
            </div>
          </div>

          {/* 主标题 */}
          <h1 style={{
            fontSize: "34px",
            fontWeight: "800",
            lineHeight: "1.25",
            marginBottom: "16px"
          }}>
            <span style={{ color: "#0f172a" }}>构建企业级的</span>
            <br />
            <span style={{ color: "#2563eb" }}>数字信任档案</span>
          </h1>

          <p style={{
            color: "#475569",
            fontSize: "14px",
            lineHeight: "1.8",
            marginBottom: "40px",
            maxWidth: "320px"
          }}>
            利用区块链技术，为每一份销售合同建立从签署到归档的全链路数字存证。
          </p>

          {/* 特性列表 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {features.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                  color: item.color,
                  fontWeight: "700"
                }}>
                  {item.svg}
                </div>
                <div>
                  <div style={{ color: "#1e293b", fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>{item.title}</div>
                  <div style={{ color: "#64748b", fontSize: "12px", lineHeight: "1.5" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部信息 */}
        <div style={{ position: "relative", zIndex: 1, color: "#94a3b8", fontSize: "12px", marginTop: "40px" }}>
          基于 Ethereum Sepolia 测试网络 · 智能合约自动存证
        </div>
      </div>

      {/* 右侧白色表单区 */}
      <div style={{
        flex: 1,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px"
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {activeTab === "login" ? (
            <>
              <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>欢迎回来</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "32px" }}>登录以访问您的工作空间。</p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>创建账号</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "32px" }}>注册账号开始使用区块链合同存证服务</p>
            </>
          )}

          {/* Tab 切换 */}
          <div style={{ display: "flex", marginBottom: "28px", borderBottom: "2px solid #f1f5f9" }}>
            <button
              onClick={() => { setActiveTab("login"); setError(""); }}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                background: "none",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                color: activeTab === "login" ? "#2563eb" : "#94a3b8",
                borderBottom: activeTab === "login" ? "2px solid #2563eb" : "2px solid transparent",
                marginBottom: "-2px",
                transition: "all 0.2s"
              }}
            >
              登录
            </button>
            <button
              onClick={() => { setActiveTab("register"); setError(""); }}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                background: "none",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                color: activeTab === "register" ? "#2563eb" : "#94a3b8",
                borderBottom: activeTab === "register" ? "2px solid #2563eb" : "2px solid transparent",
                marginBottom: "-2px",
                transition: "all 0.2s"
              }}
            >
              注册
            </button>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              color: "#dc2626",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "13px",
              border: "1px solid #fecaca"
            }}>
              {error}
            </div>
          )}

          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit}>
              {/* 快捷登录角色 */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px", fontWeight: "500" }}>快捷登录</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { label: "管理员", user: "admin" },
                    { label: "普通用户", user: "user" },
                    { label: "审计员", user: "auditor" }
                  ].map((role) => (
                    <button
                      key={role.user}
                      type="button"
                      onClick={() => setLoginForm({ username: role.user, password: "123456" })}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#334155",
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontWeight: "500"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = "#2563eb";
                        e.target.style.color = "#2563eb";
                        e.target.style.background = "#eff6ff";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.color = "#334155";
                        e.target.style.background = "#ffffff";
                      }}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>
                  用户名
                </label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="输入用户名"
                    disabled={loading}
                    required
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "28px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>
                  密码
                </label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="输入密码"
                    disabled={loading}
                    required
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => { if (!loading) e.target.style.background = "#1d4ed8"; }}
                onMouseLeave={(e) => { e.target.style.background = "#2563eb"; }}
              >
                {loading ? "登录中..." : "登录工作空间  >"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>用户名 *</label>
                  <input type="text" value={registerForm.username} onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} placeholder="请输入用户名" disabled={loading} required style={regInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>邮箱</label>
                  <input type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="请输入邮箱" disabled={loading} style={regInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>手机号</label>
                  <input type="tel" value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="请输入手机号" disabled={loading} style={regInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>所属部门</label>
                  <input type="text" value={registerForm.department} onChange={(e) => setRegisterForm({ ...registerForm, department: e.target.value })} placeholder="请输入部门" disabled={loading} style={regInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>系统角色 *</label>
                  <select value={registerForm.role} onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })} disabled={loading} required style={{ ...regInputStyle, cursor: "pointer" }}>
                    <option value="user">普通成员 (上传合同/申请存证)</option>
                    <option value="admin">系统管理员 (审批/用户管理/审计)</option>
                    <option value="auditor">独立审计员 (只读查看/系统审计)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>密码 *</label>
                  <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="至少6位" disabled={loading} required style={regInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#334155", marginBottom: "6px" }}>确认密码 *</label>
                  <input type="password" value={registerForm.confirmPassword} onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} placeholder="再次输入" disabled={loading} required style={regInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => { if (!loading) e.target.style.background = "#1d4ed8"; }}
                onMouseLeave={(e) => { e.target.style.background = "#2563eb"; }}
              >
                {loading ? "注册中..." : "注册"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
