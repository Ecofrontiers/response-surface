// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ResponseFund {
    IERC20 public token;
    address public coordinator;
    uint256 public cycleNumber;
    uint256 public totalAllocated;

    struct Allocation {
        address agent;
        uint256 amount;
        string ensName;
        string disasterId;
        uint256 timestamp;
        bytes32 assessmentHash;
        bool teeVerified;
    }

    struct ProofRecord {
        address responder;
        string ensName;
        bytes32 proofHash;
        uint256 credibilityScore;
        string disasterId;
        uint256 timestamp;
    }

    Allocation[] public allocations;
    ProofRecord[] public proofs;

    mapping(address => uint256) public agentCredibility;
    mapping(string => uint256) public disasterFunding;

    event FundDeposited(address indexed depositor, uint256 amount);
    event AllocationExecuted(uint256 indexed cycle, address indexed agent, uint256 amount, string disasterId);
    event ProofSubmitted(address indexed responder, string disasterId, uint256 credibility);
    event CycleAdvanced(uint256 indexed newCycle);

    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "Not coordinator");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
        coordinator = msg.sender;
        cycleNumber = 1;
    }

    function deposit(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit FundDeposited(msg.sender, amount);
    }

    function balance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function executeAllocations(
        address[] calldata agents,
        uint256[] calldata amounts,
        string[] calldata ensNames,
        string[] calldata disasterIds,
        bytes32[] calldata assessmentHashes,
        bool[] calldata teeFlags
    ) external onlyCoordinator {
        require(agents.length == amounts.length, "Length mismatch");
        require(agents.length == ensNames.length, "Length mismatch");
        require(agents.length == disasterIds.length, "Length mismatch");
        require(agents.length == assessmentHashes.length, "Length mismatch");
        require(agents.length == teeFlags.length, "Length mismatch");

        uint256 totalThisCycle;
        for (uint256 i = 0; i < agents.length; i++) {
            totalThisCycle += amounts[i];
        }
        require(token.balanceOf(address(this)) >= totalThisCycle, "Insufficient funds");

        for (uint256 i = 0; i < agents.length; i++) {
            allocations.push(Allocation({
                agent: agents[i],
                amount: amounts[i],
                ensName: ensNames[i],
                disasterId: disasterIds[i],
                timestamp: block.timestamp,
                assessmentHash: assessmentHashes[i],
                teeVerified: teeFlags[i]
            }));

            disasterFunding[disasterIds[i]] += amounts[i];
            totalAllocated += amounts[i];

            require(token.transfer(agents[i], amounts[i]), "Transfer failed");

            emit AllocationExecuted(cycleNumber, agents[i], amounts[i], disasterIds[i]);
        }
    }

    function submitProof(
        string calldata ensName,
        bytes32 proofHash,
        uint256 credibilityScore,
        string calldata disasterId
    ) external {
        proofs.push(ProofRecord({
            responder: msg.sender,
            ensName: ensName,
            proofHash: proofHash,
            credibilityScore: credibilityScore,
            disasterId: disasterId,
            timestamp: block.timestamp
        }));

        uint256 current = agentCredibility[msg.sender];
        agentCredibility[msg.sender] = current == 0
            ? credibilityScore
            : (current + credibilityScore) / 2;

        emit ProofSubmitted(msg.sender, disasterId, credibilityScore);
    }

    function advanceCycle() external onlyCoordinator {
        cycleNumber++;
        emit CycleAdvanced(cycleNumber);
    }

    function getAllocationCount() external view returns (uint256) {
        return allocations.length;
    }

    function getProofCount() external view returns (uint256) {
        return proofs.length;
    }

    function getDisasterFunding(string calldata disasterId) external view returns (uint256) {
        return disasterFunding[disasterId];
    }
}
