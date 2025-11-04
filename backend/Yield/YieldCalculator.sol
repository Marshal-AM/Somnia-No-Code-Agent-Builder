// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title YieldCalculator
 * @notice A simple yield calculator contract that tracks deposits and calculates yields using ANY ERC20 token
 * @dev Each deposit can use a different ERC20 token - frontend can restrict to STT or any specific token
 */
contract YieldCalculator is Ownable {
    using SafeERC20 for IERC20;
    
    struct Deposit {
        address depositor;
        address tokenAddress; // Token address for this deposit
        uint256 amount;
        uint256 apy; // Annual Percentage Yield in basis points (10000 = 100%)
        uint256 depositTime;
        bool active;
    }

    Deposit[] public deposits;
    mapping(address => uint256[]) public userDeposits; // user => deposit indices
    
    uint256 public totalDeposits;
    uint256 public totalYieldGenerated;
    
    event DepositCreated(address indexed depositor, uint256 depositId, address indexed tokenAddress, uint256 amount, uint256 apy);
    event YieldCalculated(address indexed depositor, uint256 depositId, uint256 yieldAmount);
    event Withdrawn(address indexed to, uint256 depositId, uint256 amount);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @notice Create a new deposit with specified APY using ANY ERC20 token
     * @param tokenAddress Address of the ERC20 token to deposit
     * @param amount Amount of tokens to deposit
     * @param apy Annual Percentage Yield in basis points (e.g., 500 = 5%)
     * @dev User must approve this contract to spend tokens first
     */
    function createDeposit(address tokenAddress, uint256 amount, uint256 apy) external {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Deposit amount must be greater than 0");
        require(apy > 0 && apy <= 10000, "APY must be between 1 and 10000 basis points");
        
        IERC20 token = IERC20(tokenAddress);
        
        // Transfer tokens from user to contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 depositId = deposits.length;
        deposits.push(Deposit({
            depositor: msg.sender,
            tokenAddress: tokenAddress,
            amount: amount,
            apy: apy,
            depositTime: block.timestamp,
            active: true
        }));
        
        userDeposits[msg.sender].push(depositId);
        totalDeposits += amount;
        
        emit DepositCreated(msg.sender, depositId, tokenAddress, amount, apy);
    }
    
    /**
     * @notice Calculate yield for a deposit after a given time period
     * @param depositId The ID of the deposit
     * @param timeInSeconds Time period in seconds to calculate yield for
     * @return yieldAmount The calculated yield amount
     */
    function calculateYield(uint256 depositId, uint256 timeInSeconds) public view returns (uint256 yieldAmount) {
        require(depositId < deposits.length, "Invalid deposit ID");
        Deposit memory deposit = deposits[depositId];
        require(deposit.active, "Deposit is not active");
        
        // Calculate yield: amount * (apy / 10000) * (timeInSeconds / 31536000)
        // 31536000 = seconds in a year
        yieldAmount = (deposit.amount * deposit.apy * timeInSeconds) / (10000 * 31536000);
        return yieldAmount;
    }
    
    /**
     * @notice Get current yield for a deposit (based on actual time passed)
     * @param depositId The ID of the deposit
     * @return yieldAmount The current yield amount
     */
    function getCurrentYield(uint256 depositId) public view returns (uint256 yieldAmount) {
        require(depositId < deposits.length, "Invalid deposit ID");
        Deposit memory deposit = deposits[depositId];
        require(deposit.active, "Deposit is not active");
        
        uint256 timePassed = block.timestamp - deposit.depositTime;
        return calculateYield(depositId, timePassed);
    }
    
    /**
     * @notice Get total amount (principal + yield) for a deposit
     * @param depositId The ID of the deposit
     * @return totalAmount The total amount including yield
     */
    function getTotalAmount(uint256 depositId) external view returns (uint256 totalAmount) {
        require(depositId < deposits.length, "Invalid deposit ID");
        Deposit memory deposit = deposits[depositId];
        require(deposit.active, "Deposit is not active");
        
        uint256 yieldAmount = getCurrentYield(depositId);
        return deposit.amount + yieldAmount;
    }
    
    /**
     * @notice Withdraw a deposit (principal + accrued yield)
     * @param depositId The ID of the deposit to withdraw
     */
    function withdraw(uint256 depositId) external {
        require(depositId < deposits.length, "Invalid deposit ID");
        Deposit storage deposit = deposits[depositId];
        require(deposit.active, "Deposit is not active");
        require(deposit.depositor == msg.sender, "Only depositor can withdraw");
        
        uint256 yieldAmount = getCurrentYield(depositId);
        uint256 totalAmount = deposit.amount + yieldAmount;
        
        IERC20 token = IERC20(deposit.tokenAddress);
        require(token.balanceOf(address(this)) >= totalAmount, "Insufficient contract balance");
        
        deposit.active = false;
        totalDeposits -= deposit.amount;
        totalYieldGenerated += yieldAmount;
        
        // Transfer tokens back to user
        token.safeTransfer(msg.sender, totalAmount);
        
        emit Withdrawn(msg.sender, depositId, totalAmount);
    }
    
    /**
     * @notice Get all deposit IDs for a user
     * @param user The address of the user
     * @return Array of deposit IDs
     */
    function getUserDeposits(address user) external view returns (uint256[] memory) {
        return userDeposits[user];
    }
    
    /**
     * @notice Get deposit information
     * @param depositId The ID of the deposit
     * @return depositor The address of the depositor
     * @return tokenAddress The address of the token used for this deposit
     * @return amount The deposit amount
     * @return apy The APY in basis points
     * @return depositTime The timestamp when deposit was made
     * @return active Whether the deposit is still active
     */
    function getDepositInfo(uint256 depositId) external view returns (
        address depositor,
        address tokenAddress,
        uint256 amount,
        uint256 apy,
        uint256 depositTime,
        bool active
    ) {
        require(depositId < deposits.length, "Invalid deposit ID");
        Deposit memory deposit = deposits[depositId];
        return (deposit.depositor, deposit.tokenAddress, deposit.amount, deposit.apy, deposit.depositTime, deposit.active);
    }
    
    /**
     * @notice Get the token address for a specific deposit
     * @param depositId The ID of the deposit
     * @return The address of the ERC20 token used for this deposit
     */
    function getDepositTokenAddress(uint256 depositId) external view returns (address) {
        require(depositId < deposits.length, "Invalid deposit ID");
        return deposits[depositId].tokenAddress;
    }
    
    /**
     * @notice Get contract statistics
     * @return _totalDeposits Total deposits made
     * @return _totalYieldGenerated Total yield generated
     * @return _totalDepositsCount Total number of deposits
     */
    function getStats() external view returns (
        uint256 _totalDeposits,
        uint256 _totalYieldGenerated,
        uint256 _totalDepositsCount
    ) {
        return (totalDeposits, totalYieldGenerated, deposits.length);
    }
}

