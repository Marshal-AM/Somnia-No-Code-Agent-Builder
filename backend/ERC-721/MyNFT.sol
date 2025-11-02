// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyNFT
 * @dev ERC-721 NFT with additional features:
 * - Minting capability (owner only)
 * - Burning capability
 * - Pausable transfers (owner only)
 * - URI storage for metadata
 */
contract MyNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;
    bool private _paused;
    string private _baseTokenURI;
    
    event Paused(address account);
    event Unpaused(address account);
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor that initializes the NFT collection
     * @param name NFT collection name
     * @param symbol NFT collection symbol
     * @param baseURI Base URI for token metadata
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _paused = false;
        _baseTokenURI = baseURI;
        _nextTokenId = 1; // Start token IDs from 1
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused
     */
    modifier whenNotPaused() {
        require(!_paused, "NFT transfers are paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused
     */
    modifier whenPaused() {
        require(_paused, "NFT transfers are not paused");
        _;
    }

    /**
     * @dev Returns true if the contract is paused
     */
    function paused() public view returns (bool) {
        return _paused;
    }

    /**
     * @dev Triggers paused state
     */
    function pause() public onlyOwner whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Returns to normal state
     */
    function unpause() public onlyOwner whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev Base URI for computing {tokenURI}
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Update the base URI (only owner can call)
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @dev Mint a new NFT to the specified address (only owner can call)
     * @param to Address to receive the minted NFT
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    /**
     * @dev Mint a new NFT with custom URI to the specified address (only owner can call)
     * @param to Address to receive the minted NFT
     * @param uri Token-specific URI for metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintWithURI(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Mint multiple NFTs to the specified address (only owner can call)
     * @param to Address to receive the minted NFTs
     * @param amount Number of NFTs to mint
     * @return startTokenId The ID of the first minted token
     */
    function mintBatch(address to, uint256 amount) public onlyOwner returns (uint256 startTokenId) {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 100, "Cannot mint more than 100 at once");
        
        startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
        }
        
        return startTokenId;
    }

    /**
     * @dev Update token URI for a specific token (only owner can call)
     */
    function setTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev Get the next token ID that will be minted
     */
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Get total number of tokens minted
     */
    function totalMinted() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Get all token IDs owned by an address
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId < _nextTokenId; tokenId++) {
            if (_ownerOf(tokenId) == owner) {
                tokens[index] = tokenId;
                index++;
                if (index == balance) break;
            }
        }
        
        return tokens;
    }

    /**
     * @dev Override transfer function to add pause functionality
     */
    function transferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        whenNotPaused
    {
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Override safeTransferFrom function to add pause functionality
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        override(ERC721, IERC721)
        whenNotPaused
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // Required overrides for multiple inheritance
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}