// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Airdrop
 * @dev Gas-efficient airdrop contract for native STT token distribution
 * @notice Anyone can use this contract to batch transfer STT tokens from their wallet to multiple addresses
 * @notice Funds are deducted directly from the caller's wallet - no contract storage needed
 */
contract Airdrop {
    address public owner;
    
    event AirdropExecuted(
        address indexed executor,
        address[] recipients,
        uint256 amount,
        uint256 totalAmount,
        uint256 timestamp
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Airdrop: caller is not the owner");
        _;
    }
    
    /**
     * @dev Constructor sets the contract owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @dev Transfer ownership of the contract to a new account
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Airdrop: new owner is the zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /**
     * @dev Execute airdrop to multiple addresses with the same amount
     * @param recipients Array of recipient addresses
     * @param amount Amount to send to each recipient (in wei)
     * @notice This function is payable - caller must send the required amount with the transaction
     * @notice Total amount sent must equal: amount * recipients.length
     * @notice Funds are deducted from caller's wallet and distributed to recipients
     */
    function airdrop(address[] calldata recipients, uint256 amount) external payable {
        require(recipients.length > 0, "Airdrop: recipients array is empty");
        require(amount > 0, "Airdrop: amount must be greater than 0");
        
        uint256 totalAmount = amount * recipients.length;
        require(msg.value == totalAmount, "Airdrop: incorrect payment amount");
        
        // Batch transfer using low-level call (more gas efficient than transfer)
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Airdrop: recipient cannot be zero address");
            
            // Use low-level call with value for gas efficiency
            (bool success, ) = recipients[i].call{value: amount}("");
            require(success, "Airdrop: transfer failed");
        }
        
        emit AirdropExecuted(
            msg.sender,
            recipients,
            amount,
            totalAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Execute airdrop to multiple addresses with different amounts
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts corresponding to each recipient (in wei)
     * @notice This function is payable - caller must send the exact total amount with the transaction
     * @notice Total amount sent must equal the sum of all amounts in the array
     * @notice Funds are deducted from caller's wallet and distributed to recipients
     */
    function airdropWithAmounts(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable {
        require(recipients.length > 0, "Airdrop: recipients array is empty");
        require(recipients.length == amounts.length, "Airdrop: arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Airdrop: amount must be greater than 0");
            totalAmount += amounts[i];
        }
        
        require(msg.value == totalAmount, "Airdrop: incorrect payment amount");
        
        // Batch transfer using low-level call
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Airdrop: recipient cannot be zero address");
            
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "Airdrop: transfer failed");
        }
        
        emit AirdropExecuted(
            msg.sender,
            recipients,
            0, // Using 0 as placeholder since amounts vary
            totalAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Withdraw any accidental balance (emergency function for owner only)
     * @param to Address to receive the withdrawn funds
     * @notice This should rarely be needed since contract should have zero balance after each airdrop
     */
    function withdraw(address payable to) external onlyOwner {
        require(to != address(0), "Airdrop: recipient cannot be zero address");
        uint256 balance = address(this).balance;
        require(balance > 0, "Airdrop: no balance to withdraw");
        
        (bool success, ) = to.call{value: balance}("");
        require(success, "Airdrop: withdrawal failed");
    }
    
    /**
     * @dev Get contract balance
     * @return Current balance of the contract in wei (should be 0 after each airdrop)
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Fallback function to receive native tokens
     */
    receive() external payable {
        // Contract can receive native tokens
    }
    
    /**
     * @dev Fallback function for calls that don't match any function
     */
    fallback() external payable {
        revert("Airdrop: function does not exist");
    }
}

