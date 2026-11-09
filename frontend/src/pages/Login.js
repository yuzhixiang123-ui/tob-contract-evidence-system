import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 验证
    if (!formData.username || !formData.password) {
      setError("请填写用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authAPI.login(formData.username, formData.password);

      if (result.success) {
        // 保存token和用户信息
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
      setError(err.response?.data?.message || "登录失败，请检查用户名和密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔐 合同存证系统</h1>
        <h2 className="auth-subtitle">登录</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="请输入用户名"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="auth-footer">
          还没有账号？ <Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;