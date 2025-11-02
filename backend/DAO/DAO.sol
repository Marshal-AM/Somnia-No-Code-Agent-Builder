// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DAO
 * @dev Individual DAO contract with governance features
 */
contract DAO {
    string public name;
    address public creator;
    uint256 public proposalCount;
    uint256 public memberCount;
    uint256 public votingPeriod; // in seconds
    uint256 public quorumPercentage; // percentage required for proposal to pass
    
    struct Member {
        bool isMember;
        uint256 votingPower;
        uint256 joinedAt;
    }
    
    struct Proposal {
        uint256 id;
        string description;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }
    
    mapping(address => Member) public members;
    mapping(uint256 => Proposal) public proposals;
    address[] public memberList;
    
    event MemberAdded(address indexed member, uint256 votingPower);
    event MemberRemoved(address indexed member);
    event ProposalCreated(uint256 indexed proposalId, string description, address proposer);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    
    modifier onlyMember() {
        require(members[msg.sender].isMember, "Not a member");
        _;
    }
    
    constructor(
        string memory _name,
        address _creator,
        uint256 _votingPeriod,
        uint256 _quorumPercentage
    ) {
        name = _name;
        creator = _creator;
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
        
        // Add creator as first member
        members[_creator] = Member({
            isMember: true,
            votingPower: 1,
            joinedAt: block.timestamp
        });
        memberList.push(_creator);
        memberCount = 1;
    }
    
    function addMember(address _member, uint256 _votingPower) external onlyMember {
        require(!members[_member].isMember, "Already a member");
        require(_votingPower > 0, "Voting power must be greater than 0");
        
        members[_member] = Member({
            isMember: true,
            votingPower: _votingPower,
            joinedAt: block.timestamp
        });
        memberList.push(_member);
        memberCount++;
        
        emit MemberAdded(_member, _votingPower);
    }
    
    function removeMember(address _member) external onlyMember {
        require(members[_member].isMember, "Not a member");
        require(_member != creator, "Cannot remove creator");
        
        members[_member].isMember = false;
        memberCount--;
        
        emit MemberRemoved(_member);
    }
    
    function createProposal(string memory _description) external onlyMember returns (uint256) {
        uint256 proposalId = proposalCount++;
        Proposal storage newProposal = proposals[proposalId];
        
        newProposal.id = proposalId;
        newProposal.description = _description;
        newProposal.proposer = msg.sender;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + votingPeriod;
        newProposal.executed = false;
        newProposal.passed = false;
        
        emit ProposalCreated(proposalId, _description, msg.sender);
        return proposalId;
    }
    
    function vote(uint256 _proposalId, bool _support) external onlyMember {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 weight = members[msg.sender].votingPower;
        proposal.hasVoted[msg.sender] = true;
        
        if (_support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support, weight);
    }
    
    function executeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Already executed");
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalVotingPower = getTotalVotingPower();
        
        // Check if quorum is met and majority voted for
        bool quorumMet = (totalVotes * 100) >= (totalVotingPower * quorumPercentage);
        bool majorityFor = proposal.forVotes > proposal.againstVotes;
        
        proposal.executed = true;
        proposal.passed = quorumMet && majorityFor;
        
        emit ProposalExecuted(_proposalId, proposal.passed);
    }
    
    function getTotalVotingPower() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (members[memberList[i]].isMember) {
                total += members[memberList[i]].votingPower;
            }
        }
        return total;
    }
    
    function getProposalInfo(uint256 _proposalId) external view returns (
        string memory description,
        address proposer,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 endTime,
        bool executed,
        bool passed
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.description,
            proposal.proposer,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.endTime,
            proposal.executed,
            proposal.passed
        );
    }
}

/**
 * @title DAOFactory
 * @dev Factory contract to create and manage DAOs
 */
contract DAOFactory {
    address[] public allDAOs;
    mapping(address => address[]) public creatorDAOs;
    
    event DAOCreated(
        address indexed daoAddress,
        string name,
        address indexed creator,
        uint256 votingPeriod,
        uint256 quorumPercentage
    );
    
    function createDAO(
        string memory _name,
        uint256 _votingPeriod,
        uint256 _quorumPercentage
    ) external returns (address) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_votingPeriod > 0, "Voting period must be greater than 0");
        require(_quorumPercentage > 0 && _quorumPercentage <= 100, "Invalid quorum percentage");
        
        DAO newDAO = new DAO(_name, msg.sender, _votingPeriod, _quorumPercentage);
        address daoAddress = address(newDAO);
        
        allDAOs.push(daoAddress);
        creatorDAOs[msg.sender].push(daoAddress);
        
        emit DAOCreated(daoAddress, _name, msg.sender, _votingPeriod, _quorumPercentage);
        
        return daoAddress;
    }
    
    function getDAOCount() external view returns (uint256) {
        return allDAOs.length;
    }
    
    function getCreatorDAOs(address _creator) external view returns (address[] memory) {
        return creatorDAOs[_creator];
    }
    
    function getAllDAOs() external view returns (address[] memory) {
        return allDAOs;
    }
}