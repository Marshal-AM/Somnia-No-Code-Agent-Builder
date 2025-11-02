// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyNFT.sol";

/**
 * @title NFTFactory
 * @dev Factory contract that allows anyone to deploy their own ERC-721 NFT collections on Somnia
 * Each NFT collection is a separate MyNFT contract with customizable parameters
 */
contract NFTFactory {
    // Array to store all deployed NFT collection addresses
    address[] public deployedCollections;
    
    // Mapping from creator address to their deployed collections
    mapping(address => address[]) public creatorToCollections;
    
    // Mapping from collection address to collection info
    mapping(address => CollectionInfo) public collectionInfo;
    
    // Struct to store NFT collection metadata
    struct CollectionInfo {
        address collectionAddress;
        address creator;
        string name;
        string symbol;
        string baseURI;
        uint256 deployedAt;
    }
    
    // Events
    event CollectionCreated(
        address indexed collectionAddress,
        address indexed creator,
        string name,
        string symbol,
        string baseURI,
        uint256 timestamp
    );
    
    /**
     * @dev Create a new ERC-721 NFT collection
     * @param name NFT collection name (e.g., "My NFT Collection")
     * @param symbol NFT collection symbol (e.g., "MNFT")
     * @param baseURI Base URI for token metadata (e.g., "ipfs://QmXxx/")
     * @return collectionAddress Address of the newly created NFT collection
     */
    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) external returns (address collectionAddress) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        
        // Deploy new MyNFT contract
        MyNFT newCollection = new MyNFT(name, symbol, baseURI);
        
        // Transfer ownership to the creator
        newCollection.transferOwnership(msg.sender);
        
        collectionAddress = address(newCollection);
        
        // Store collection information
        CollectionInfo memory info = CollectionInfo({
            collectionAddress: collectionAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            baseURI: baseURI,
            deployedAt: block.timestamp
        });
        
        collectionInfo[collectionAddress] = info;
        deployedCollections.push(collectionAddress);
        creatorToCollections[msg.sender].push(collectionAddress);
        
        emit CollectionCreated(
            collectionAddress,
            msg.sender,
            name,
            symbol,
            baseURI,
            block.timestamp
        );
        
        return collectionAddress;
    }
    
    /**
     * @dev Get total number of collections deployed
     */
    function getTotalCollectionsDeployed() external view returns (uint256) {
        return deployedCollections.length;
    }
    
    /**
     * @dev Get all deployed collection addresses
     */
    function getAllDeployedCollections() external view returns (address[] memory) {
        return deployedCollections;
    }
    
    /**
     * @dev Get collections created by a specific address
     */
    function getCollectionsByCreator(address creator) external view returns (address[] memory) {
        return creatorToCollections[creator];
    }
    
    /**
     * @dev Get detailed information about a collection
     */
    function getCollectionInfo(address collectionAddress) external view returns (
        address creator,
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 deployedAt,
        uint256 totalMinted,
        address owner
    ) {
        CollectionInfo memory info = collectionInfo[collectionAddress];
        require(info.collectionAddress != address(0), "Collection not found");
        
        MyNFT collection = MyNFT(collectionAddress);
        
        return (
            info.creator,
            info.name,
            info.symbol,
            info.baseURI,
            info.deployedAt,
            collection.totalMinted(),
            collection.owner()
        );
    }
    
    /**
     * @dev Get paginated list of deployed collections
     * @param startIndex Starting index
     * @param count Number of collections to return
     */
    function getDeployedCollectionsPaginated(uint256 startIndex, uint256 count) 
        external 
        view 
        returns (address[] memory) 
    {
        require(startIndex < deployedCollections.length, "Start index out of bounds");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > deployedCollections.length) {
            endIndex = deployedCollections.length;
        }
        
        uint256 resultLength = endIndex - startIndex;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = deployedCollections[startIndex + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get the latest N collections deployed
     * @param count Number of latest collections to return
     */
    function getLatestCollections(uint256 count) external view returns (address[] memory) {
        uint256 totalCollections = deployedCollections.length;
        require(totalCollections > 0, "No collections deployed yet");
        
        uint256 resultLength = count > totalCollections ? totalCollections : count;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = deployedCollections[totalCollections - 1 - i];
        }
        
        return result;
    }
    
    /**
     * @dev Get collection statistics
     */
    function getCollectionStats(address collectionAddress) external view returns (
        uint256 totalMinted,
        bool isPaused,
        uint256 nextTokenId
    ) {
        require(collectionInfo[collectionAddress].collectionAddress != address(0), "Collection not found");
        
        MyNFT collection = MyNFT(collectionAddress);
        
        return (
            collection.totalMinted(),
            collection.paused(),
            collection.getNextTokenId()
        );
    }
}