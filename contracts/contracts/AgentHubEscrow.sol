// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract AgentHubEscrow {
    // ── State ──────────────────────────────────────────
    address public owner;
    IERC20 public usdc;
    uint256 public jobCount;

    enum Status { OPEN, ACTIVE, REVIEW, COMPLETE, CANCELLED }

    struct Job {
        uint256 id;
        address poster;
        address agent;
        uint256 reward;
        Status status;
        string title;
        string resultHash;
    }

    mapping(uint256 => Job) public jobs;

    // ── Events ─────────────────────────────────────────
    event JobPosted(uint256 indexed id, address indexed poster, uint256 reward, string title);
    event JobAccepted(uint256 indexed id, address indexed agent);
    event ResultSubmitted(uint256 indexed id, string resultHash);
    event PaymentReleased(uint256 indexed id, address indexed agent, uint256 amount);
    event JobCancelled(uint256 indexed id);

    // ── Constructor ────────────────────────────────────
    constructor(address _usdc) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
    }

    // ── Post Job ───────────────────────────────────────
    function postJob(string calldata title, uint256 reward) external returns (uint256) {
        require(reward > 0, "Reward must be greater than 0");
        require(bytes(title).length > 0, "Title required");

        // Lock USDC in escrow
        bool success = usdc.transferFrom(msg.sender, address(this), reward);
        require(success, "USDC transfer failed");

        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            poster: msg.sender,
            agent: address(0),
            reward: reward,
            status: Status.OPEN,
            title: title,
            resultHash: ""
        });

        emit JobPosted(jobCount, msg.sender, reward, title);
        return jobCount;
    }

    // ── Accept Job ─────────────────────────────────────
    function acceptJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == Status.OPEN, "Job not open");
        require(job.poster != msg.sender, "Poster cannot accept own job");

        job.agent = msg.sender;
        job.status = Status.ACTIVE;

        emit JobAccepted(jobId, msg.sender);
    }

    // ── Submit Result ──────────────────────────────────
    function submitResult(uint256 jobId, string calldata resultHash) external {
        Job storage job = jobs[jobId];
        require(job.status == Status.ACTIVE, "Job not active");
        require(job.agent == msg.sender, "Only assigned agent");

        job.resultHash = resultHash;
        job.status = Status.REVIEW;

        emit ResultSubmitted(jobId, resultHash);
    }

    // ── Release Payment ────────────────────────────────
    function releasePayment(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == Status.REVIEW, "Job not in review");
        require(job.poster == msg.sender, "Only poster can release");

        job.status = Status.COMPLETE;

        bool success = usdc.transfer(job.agent, job.reward);
        require(success, "Payment transfer failed");

        emit PaymentReleased(jobId, job.agent, job.reward);
    }

    // ── Cancel Job ─────────────────────────────────────
    function cancelJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == Status.OPEN, "Can only cancel open jobs");
        require(job.poster == msg.sender, "Only poster can cancel");

        job.status = Status.CANCELLED;

        bool success = usdc.transfer(job.poster, job.reward);
        require(success, "Refund failed");

        emit JobCancelled(jobId);
    }

    // ── View ───────────────────────────────────────────
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getJobCount() external view returns (uint256) {
        return jobCount;
    }
}