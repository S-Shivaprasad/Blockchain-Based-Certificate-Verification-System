// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISupremeAuthority {
    function isApprovedBoard(address board) external view returns (bool);
    function canBoardUseDegree(address board, bytes32 degreeId) external view returns (bool);
    function isCollegeBlocked(address college) external view returns (bool);
    function isStudentBlacklisted(address student) external view returns (bool);
    function isSystemPaused() external view returns (bool);

    function getBoard(address board)
        external
        view
        returns (string memory name, bool active);

    function getCollege(address college)
        external
        view
        returns (
            string memory name,
            bool active,
            bool approvedByBoard,
            address board,
            uint256 activatedAt
        );

    function getAllDegreeIds() external view returns (bytes32[] memory);
}
interface ICollegeRegistry {
    function isRegisteredCollege(address college) external view returns (bool);
    function getCollegeBoard(address college) external view returns (address); // ✅ ADD THIS
}

contract BoardAuthority {

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotApprovedBoard();
    error NotRegisteredCollege();
    error SystemPaused();
    error InvalidAddress();
    error AlreadyApproved();
    error NotApprovedCollege();
    error DegreeNotAllowed();
    error AlreadyExists();
    error NotAllowed();
    error DegreeNotApproved();

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    ISupremeAuthority public immutable supremeAuthority;
    ICollegeRegistry public immutable collegeRegistry;

    mapping(address => mapping(address => bool)) private approvedColleges;
    mapping(address => address[]) private boardColleges;
  

    mapping(address => mapping(address => mapping(bytes32 => bool)))
        private collegeDegreePermissions;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event CollegeApproved(address indexed board, address indexed college);
    event CollegeRevoked(address indexed board, address indexed college);

    event CollegeDegreeAllowed(address indexed board, address indexed college, bytes32 indexed degreeId);
    event CollegeDegreeRevoked(address indexed board, address indexed college, bytes32 indexed degreeId);

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _supremeAuthority, address _collegeRegistry) {
        if (_supremeAuthority == address(0) || _collegeRegistry == address(0))
            revert InvalidAddress();

        supremeAuthority = ISupremeAuthority(_supremeAuthority);
        collegeRegistry = ICollegeRegistry(_collegeRegistry);
    }

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyApprovedBoard() {
        if (!supremeAuthority.isApprovedBoard(msg.sender))
            revert NotApprovedBoard();
        _;
    }

    modifier systemActive() {
        if (supremeAuthority.isSystemPaused())
            revert SystemPaused();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        COLLEGE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function approveCollege(address college)
        public
        onlyApprovedBoard
        systemActive
    {
        if (college == address(0)) revert InvalidAddress();
        if (supremeAuthority.isCollegeBlocked(college))
            revert NotAllowed();
        if (!collegeRegistry.isRegisteredCollege(college))
            revert NotRegisteredCollege();
        if (approvedColleges[msg.sender][college])
            revert AlreadyApproved();
        if (collegeRegistry.getCollegeBoard(college) != msg.sender)
    revert NotAllowed(); // ensures correct board owns college

        approvedColleges[msg.sender][college] = true;
        
        boardColleges[msg.sender].push(college);

        emit CollegeApproved(msg.sender, college);
    }

    // 🔥 BATCH APPROVE
    function batchApproveColleges(address[] calldata colleges)
    external
{
    if (supremeAuthority.isSystemPaused()) revert SystemPaused();
    if (!supremeAuthority.isApprovedBoard(msg.sender)) revert NotApprovedBoard();

    uint256 len = colleges.length;

    for (uint256 i = 0; i < len; ) {
        address college = colleges[i];

        if (college == address(0)) revert InvalidAddress();

        if (supremeAuthority.isCollegeBlocked(college))
            revert NotAllowed();

        if (!collegeRegistry.isRegisteredCollege(college))
            revert NotRegisteredCollege();

        if (approvedColleges[msg.sender][college])
    revert AlreadyApproved();

if (collegeRegistry.getCollegeBoard(college) != msg.sender)
    revert NotAllowed();

        approvedColleges[msg.sender][college] = true;
        
        boardColleges[msg.sender].push(college);

        emit CollegeApproved(msg.sender, college);

        unchecked {
            ++i;
        }
    }
}

  function revokeCollege(address college)
    external
    onlyApprovedBoard
    systemActive
{
    if (collegeRegistry.getCollegeBoard(college) != msg.sender)
    revert NotApprovedCollege();
    if (!approvedColleges[msg.sender][college])
    revert NotApprovedCollege();
    approvedColleges[msg.sender][college] = false;
   

    // remove from boardColleges array
    address[] storage list = boardColleges[msg.sender];
    for (uint256 i = 0; i < list.length; i++) {
        if (list[i] == college) {
            list[i] = list[list.length - 1];
            list.pop();
            break;
        }
    }

    emit CollegeRevoked(msg.sender, college);
}


function getApprovedColleges(address board)
    external
    view
    returns (address[] memory)
{
    address[] memory list = boardColleges[board];

    uint count = 0;

    for (uint i = 0; i < list.length; i++) {
        if (approvedColleges[board][list[i]]) {
            count++;
        }
    }

    address[] memory result = new address[](count);
    uint index = 0;

    for (uint i = 0; i < list.length; i++) {
        if (approvedColleges[board][list[i]]) {
            result[index++] = list[i];
        }
    }

    return result;
}

    /*//////////////////////////////////////////////////////////////
                        DEGREE PERMISSIONS
    //////////////////////////////////////////////////////////////*/

   function allowCollegeDegree(address college, bytes32 degreeId)
    public
    onlyApprovedBoard
    systemActive
{
    if (collegeRegistry.getCollegeBoard(college) != msg.sender)
    revert NotApprovedCollege();
    if (supremeAuthority.isCollegeBlocked(college))
    revert NotAllowed();

    if (!supremeAuthority.canBoardUseDegree(msg.sender, degreeId))
        revert DegreeNotAllowed();

    if (!approvedColleges[msg.sender][college])
    revert NotApprovedCollege();

    if (collegeDegreePermissions[msg.sender][college][degreeId])
        revert AlreadyExists();

    // local state
    collegeDegreePermissions[msg.sender][college][degreeId] = true;

    

    emit CollegeDegreeAllowed(msg.sender, college, degreeId);
}


function allowCollegeDegrees(
    address college,
    bytes32[] calldata degreeIds
)
    external
    onlyApprovedBoard
    systemActive
{
    if (collegeRegistry.getCollegeBoard(college) != msg.sender)
        revert NotApprovedCollege();

    if (!approvedColleges[msg.sender][college])
        revert NotApprovedCollege();

    for (uint256 i = 0; i < degreeIds.length; i++) {
    bytes32 degreeId = degreeIds[i];

    if (!supremeAuthority.canBoardUseDegree(msg.sender, degreeId))
        revert DegreeNotAllowed();

    if (collegeDegreePermissions[msg.sender][college][degreeId])
        revert AlreadyExists();

    collegeDegreePermissions[msg.sender][college][degreeId] = true;

    emit CollegeDegreeAllowed(msg.sender, college, degreeId);
}
}

    function revokeCollegeDegree(address college, bytes32 degreeId)
        external
        onlyApprovedBoard
        systemActive
    {
        if (collegeRegistry.getCollegeBoard(college) != msg.sender)
    revert NotApprovedCollege();

if (!collegeDegreePermissions[msg.sender][college][degreeId])
    revert DegreeNotApproved();

collegeDegreePermissions[msg.sender][college][degreeId] = false;

        emit CollegeDegreeRevoked(msg.sender, college, degreeId);
    }

    /*//////////////////////////////////////////////////////////////
                        🔥 FRONTEND FIX (IMPORTANT)
    //////////////////////////////////////////////////////////////*/

    function getCollegeAllowedDegrees(
        address board,
        address college
    )
        external
        view
        returns (bytes32[] memory)
    {
        bytes32[] memory all = supremeAuthority.getAllDegreeIds();

        uint256 count = 0;

        for (uint256 i = 0; i < all.length; i++) {
            if (collegeDegreePermissions[board][college][all[i]]) {
                count++;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < all.length; i++) {
            if (collegeDegreePermissions[board][college][all[i]]) {
                result[index++] = all[i];
            }
        }

        return result;
    }

    /*//////////////////////////////////////////////////////////////
                        ISSUER VALIDATION
    //////////////////////////////////////////////////////////////*/

   function canIssue(
    address board,
    address college,
    bytes32 degreeId
)
    external
    view
    returns (bool)
{
    if (supremeAuthority.isSystemPaused()) return false;

    // board validation
    if (!supremeAuthority.isApprovedBoard(board)) return false;

    // college blocked check
    if (supremeAuthority.isCollegeBlocked(college)) return false;

    // college must belong to board
    if (collegeRegistry.getCollegeBoard(college) != board) return false;
    if (!collegeRegistry.isRegisteredCollege(college)) return false;

    if (!supremeAuthority.canBoardUseDegree(board, degreeId)) return false;
    return (
        approvedColleges[board][college] &&
        collegeDegreePermissions[board][college][degreeId]
    );
}
    /*//////////////////////////////////////////////////////////////
                        HELPERS
    //////////////////////////////////////////////////////////////*/

    function getCollegeBoard(address college)
        external
        view
        returns (address)
    {
        return collegeRegistry.getCollegeBoard(college);
    }

    function isCollegeAllowedForDegree(
        address board,
        address college,
        bytes32 degreeId
    )
        external
        view
        returns (bool)
    {
        return collegeDegreePermissions[board][college][degreeId];
    }
}