import axios from "axios";

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

// 请求拦截器 - 添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    if (error.response && error.response.status === 403) {
      const message = error.response.data?.message || "";
      if (message.includes("停用")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.alert("账号已被停用，请重新登录并联系管理员。");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * 认证相关API
 */
export const authAPI = {
  // 用户注册（支持角色选择）
  register: async (username, password, email, phone, department, role) => {
    const response = await api.post("/api/auth/register", {
      username,
      password,
      email,
      phone,
      department,
      role
    });
    return response.data;
  },

  // 用户登录
  login: async (username, password) => {
    const response = await api.post("/api/auth/login", {
      username,
      password
    });
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  // 更新钱包地址
  updateWalletAddress: async (wallet_address) => {
    const response = await api.put("/api/auth/wallet", { wallet_address });
    return response.data;
  }
};

/**
 * 合同相关API
 */
export const contractAPI = {
  prepareUpload: async (formData) => {
    const response = await api.post("/api/contracts/prepare-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  },

  // 上传合同
  uploadContract: async (formData) => {
    const response = await api.post("/api/contracts/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  },

  // 获取合同列表（支持分页、状态和关键词搜索）
  getContracts: async (page = 1, limit = 10, status = null, keyword = null, archiveStatus = "active", expiryFilter = null) => {
    const params = { page, limit };
    if (status) {
      params.status = status;
    }
    if (keyword) {
      params.keyword = keyword;
    }
    if (archiveStatus) {
      params.archiveStatus = archiveStatus;
    }
    if (expiryFilter) {
      params.expiryFilter = expiryFilter;
    }
    const response = await api.get("/api/contracts", { params });
    return response.data;
  },

  // 获取单个合同详情
  getContractById: async (id) => {
    const response = await api.get(`/api/contracts/${id}`);
    return response.data;
  },

  getContractVersions: async (id) => {
    const response = await api.get(`/api/contracts/${id}/versions`);
    return response.data;
  },

  downloadContractFile: async (id) => {
    const response = await api.get(`/api/contracts/${id}/download`, {
      responseType: "blob"
    });
    const disposition = response.headers["content-disposition"] || "";
    const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
    const fileName = encodedFileName ? decodeURIComponent(encodedFileName) : `contract-${id}`;

    return {
      blob: response.data,
      fileName
    };
  },

  // 审批合同
  approveContract: async (contractId, wallet_address) => {
    const response = await api.post("/api/contracts/approve", {
      contractId,
      wallet_address
    });
    return response.data;
  },

  // 拒绝合同
  rejectContract: async (contractId, wallet_address) => {
    const response = await api.post("/api/contracts/reject", {
      contractId,
      wallet_address
    });
    return response.data;
  },

  // 验证合同
  verifyContract: async (contractId, fileHash) => {
    const response = await api.post("/api/contracts/verify", {
      contractId,
      fileHash
    });
    return response.data;
  },

  archiveContract: async (contractId) => {
    const response = await api.post(`/api/contracts/${contractId}/archive`);
    return response.data;
  },

  unarchiveContract: async (contractId) => {
    const response = await api.post(`/api/contracts/${contractId}/unarchive`);
    return response.data;
  },

  getTemplates: async () => {
    const response = await api.get("/api/contracts/templates");
    return response.data;
  },

  createTemplate: async (templateData) => {
    const response = await api.post("/api/contracts/templates", templateData);
    return response.data;
  },

  updateTemplate: async (templateId, templateData) => {
    const response = await api.put(`/api/contracts/templates/${templateId}`, templateData);
    return response.data;
  },

  deleteTemplate: async (templateId) => {
    const response = await api.delete(`/api/contracts/templates/${templateId}`);
    return response.data;
  }
};

/**
 * 管理员相关API
 */
export const adminAPI = {
  // 获取所有用户
  getAllUsers: async () => {
    const response = await api.get("/api/admin/users");
    return response.data;
  },

  // 更新用户
  updateUser: async (userId, userData) => {
    const response = await api.put(`/api/admin/users/${userId}`, userData);
    return response.data;
  },

  // 删除用户
  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  // 切换用户状态
  toggleUserStatus: async (userId) => {
    const response = await api.put(`/api/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  // 获取所有评分
  getAllRatings: async () => {
    const response = await api.get("/api/admin/ratings");
    return response.data;
  },

  // 创建评分
  createRating: async (ratingData) => {
    const response = await api.post("/api/admin/ratings", ratingData);
    return response.data;
  },

  // 更新评分
  updateRating: async (ratingId, ratingData) => {
    const response = await api.put(`/api/admin/ratings/${ratingId}`, ratingData);
    return response.data;
  },

  // 删除评分
  deleteRating: async (ratingId) => {
    const response = await api.delete(`/api/admin/ratings/${ratingId}`);
    return response.data;
  },

  // 批量删除评分
  batchDeleteRatings: async (ids) => {
    const response = await api.post("/api/admin/ratings/batch-delete", { ids });
    return response.data;
  },

  // 获取系统操作日志
  getLogs: async (params = {}) => {
    const response = await api.get("/api/admin/logs", { params });
    return response.data;
  },

  // 获取数据看板统计
  getDashboardStats: async () => {
    const response = await api.get("/api/admin/dashboard-stats");
    return response.data;
  }
};

export default api;
