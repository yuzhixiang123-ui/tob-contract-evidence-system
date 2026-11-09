// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ContractEvidence
 * @dev 区块链合同存证智能合约
 * @notice 用于存储、审批和查询ToB销售合同的存证信息
 * @dev 支持IPFS CID存储，完整追踪合同生命周期
 */
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
        string cid;              // IPFS CID (内容标识符)
        string hash;             // 文件SHA256哈希
        address uploader;        // 上传者地址
        address approver;        // 审批者地址
        ContractStatus status;  // 合同状态
        uint256 timestamp;       // 存证时间戳
    }

    // 状态变量
    uint256 private _contractCount;  // 合同计数器
    mapping(uint256 => ContractRecord) private _contracts;  // 合同ID到记录的映射
    mapping(address => uint256[]) private _userContracts;  // 用户地址到合同ID数组的映射

    // 事件
    event ContractStored(
        uint256 indexed contractId,
        string cid,
        string hash,
        address indexed uploader,
        uint256 timestamp
    );

    event ContractApproved(
        uint256 indexed contractId,
        address indexed approver,
        uint256 timestamp
    );

    event ContractRejected(
        uint256 indexed contractId,
        address indexed approver,
        uint256 timestamp
    );

    /**
     * @dev 存储新的合同存证
     * @param cid IPFS内容标识符
     * @param hash 文件的SHA256哈希值
     * @return contractId 存储的合同ID
     */
    function storeContract(string memory cid, string memory hash) public returns (uint256) {
        // 输入验证
        require(bytes(cid).length > 0, "IPFS CID cannot be empty");
        require(bytes(hash).length > 0, "File hash cannot be empty");

        // 创建合同记录
        _contractCount++;
        uint256 contractId = _contractCount;

        _contracts[contractId] = ContractRecord({
            id: contractId,
            cid: cid,
            hash: hash,
            uploader: msg.sender,
            approver: address(0),
            status: ContractStatus.Pending,
            timestamp: block.timestamp
        });

        // 更新用户的合同列表
        _userContracts[msg.sender].push(contractId);

        // 触发事件
        emit ContractStored(contractId, cid, hash, msg.sender, block.timestamp);

        return contractId;
    }

    /**
     * @dev 审批合同
     * @param contractId 合同ID
     */
    function approveContract(uint256 contractId) public {
        require(contractId > 0 && contractId <= _contractCount, "Contract does not exist");
        require(_contracts[contractId].status == ContractStatus.Pending, "Contract is not pending");

        _contracts[contractId].status = ContractStatus.Approved;
        _contracts[contractId].approver = msg.sender;

        emit ContractApproved(contractId, msg.sender, block.timestamp);
    }

    /**
     * @dev 拒绝合同
     * @param contractId 合同ID
     */
    function rejectContract(uint256 contractId) public {
        require(contractId > 0 && contractId <= _contractCount, "Contract does not exist");
        require(_contracts[contractId].status == ContractStatus.Pending, "Contract is not pending");

        _contracts[contractId].status = ContractStatus.Rejected;
        _contracts[contractId].approver = msg.sender;

        emit ContractRejected(contractId, msg.sender, block.timestamp);
    }

    /**
     * @dev 根据ID获取合同详情
     * @param contractId 合同ID
     * @return id 合同ID
     * @return cid IPFS CID
     * @return hash 文件哈希
     * @return uploader 上传者地址
     * @return approver 审批者地址
     * @return status 合同状态
     * @return timestamp 时间戳
     */
    function getContract(uint256 contractId) public view returns (
        uint256 id,
        string memory cid,
        string memory hash,
        address uploader,
        address approver,
        uint8 status,
        uint256 timestamp
    ) {
        require(contractId > 0 && contractId <= _contractCount, "Contract does not exist");

        ContractRecord memory record = _contracts[contractId];
        return (
            record.id,
            record.cid,
            record.hash,
            record.uploader,
            record.approver,
            uint8(record.status),
            record.timestamp
        );
    }

    /**
     * @dev 获取合同总数
     * @return count 合同总数
     */
    function getContractCount() public view returns (uint256) {
        return _contractCount;
    }

    /**
     * @dev 获取用户的合同列表
     * @param user 用户地址
     * @return contractIds 用户的所有合同ID数组
     */
    function getUserContracts(address user) public view returns (uint256[] memory) {
        return _userContracts[user];
    }

    /**
     * @dev 验证合同哈希是否匹配
     * @param contractId 合同ID
     * @param hash 要验证的哈希值
     * @return isValid 是否匹配
     */
    function verifyHash(uint256 contractId, string memory hash) public view returns (bool) {
        require(contractId > 0 && contractId <= _contractCount, "Contract does not exist");
        return keccak256(bytes(_contracts[contractId].hash)) == keccak256(bytes(hash));
    }

    /**
     * @dev 获取合同URI (用于NFT风格展示)
     * @param contractId 合同ID
     * @return uri IPFS URI
     */
    function getContractURI(uint256 contractId) public view returns (string memory) {
        require(contractId > 0 && contractId <= _contractCount, "Contract does not exist");
        return string(abi.encodePacked("ipfs://", _contracts[contractId].cid));
    }
}