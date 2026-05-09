// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICollegeRegistry {
    function isRegisteredCollege(address college) external view returns (bool);
}

contract SupremeAuthority {

    string public constant VERSION = "5.0.0";

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotSupreme();
    error InvalidAddress();
    error InvalidInput();
    error AlreadyExists();
    error NotFound();
    error SystemPaused();
    error NotCertificateIssuer();
    error NotAllowed();

    ICollegeRegistry public collegeRegistry;
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Degree {
        bytes32 degreeId;
        string name;
        uint256 level;
        bool exists;
    }

    struct Board {
        string name;
        bool active;
    }

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    address public supreme;
    bool public systemPaused;
    address public certificateIssuer;

    mapping(address => bool) private studentRole;
    mapping(address => bool) private studentBlacklisted;

    mapping(address => Board) private boards;
    mapping(address => mapping(bytes32 => bool)) private boardDegreePermission;

    mapping(bytes32 => Degree) private degrees;
    mapping(bytes32 => bytes32) private degreeNameHashToId;
    bytes32[] private allDegrees;
    mapping(address => mapping(bytes32 => bool)) private collegeDegreeAllowed;

    mapping(address => bool) private blockedColleges;
    
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BoardApproved(address indexed board, string name);
    event CertificateIssued(address indexed student, bytes32 degreeId, address indexed college);
    event StudentBlacklisted(address indexed student);
    event StudentUnblacklisted(address indexed student);
    event BoardRevoked(address board);
    event CollegeBlocked(address college);
    event CollegeUnblocked(address college);
    event IssuerUpdated(address issuer);
    event BoardDegreeRevoked(address indexed board, bytes32 indexed degreeId);
    event BoardDegreeApproved(address indexed board, bytes32 indexed degreeId);

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlySupreme() {
        if (msg.sender != supreme) revert NotSupreme();
        _;
    }

    modifier onlyIssuer() {
        if (msg.sender != certificateIssuer) revert NotCertificateIssuer();
        _;
    }

    modifier onlyBoard() {
        if (!boards[msg.sender].active) revert NotAllowed();
        _;
    }

   

    modifier whenNotPaused() {
        if (systemPaused) revert SystemPaused();
        _;
    }

    constructor() {
        supreme = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                        SYSTEM CONTROL
    //////////////////////////////////////////////////////////////*/

    function pauseSystem() external onlySupreme {
        systemPaused = true;
    }

    function unpauseSystem() external onlySupreme {
        systemPaused = false;
    }

    function isSystemPaused() external view returns (bool) {
        return systemPaused;
    }

    /*//////////////////////////////////////////////////////////////
                        DEGREE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function registerDegree(
    string memory name,
    uint256 level
)
    public
    onlySupreme
    whenNotPaused
{
    if (bytes(name).length == 0) revert InvalidInput();

    string memory normalized = _toLower(name);

    bytes32 degreeId = keccak256(abi.encode(normalized, level));
    if (degrees[degreeId].exists) revert AlreadyExists();

    degrees[degreeId] = Degree(degreeId, name, level, true);

    degreeNameHashToId[
        keccak256(abi.encode(normalized, level))
    ] = degreeId;

    allDegrees.push(degreeId);
}

    function batchRegisterDegrees(
    string[] calldata names,
    uint256[] calldata levels
)
    external
    onlySupreme
    whenNotPaused
{
    uint256 len = names.length;
    if (len != levels.length) revert InvalidInput();

    for (uint256 i = 0; i < len; ) {
        string memory name = names[i];
        uint256 level = levels[i];

        if (bytes(name).length == 0) revert InvalidInput();

        string memory normalized = _toLower(name);

        bytes32 degreeId = keccak256(abi.encode(normalized, level));
        if (degrees[degreeId].exists) revert AlreadyExists();

        degrees[degreeId] = Degree({
            degreeId: degreeId,
            name: name,
            level: level,
            exists: true
        });

        degreeNameHashToId[
            keccak256(abi.encode(normalized, level))
        ] = degreeId;

        allDegrees.push(degreeId);

        unchecked { ++i; }
    }
}
    function getDegreeByNameAndLevel(
    string calldata name,
    uint256 level
)
    external
    view
    returns (Degree memory)
{
    bytes32 id = degreeNameHashToId[
        keccak256(abi.encode(_toLower(name), level))
    ];

    if (!degrees[id].exists) revert NotFound();
    return degrees[id];
}

    function getAllDegreeIds()
    external
    view
    returns (bytes32[] memory)
{
    return allDegrees;
}

    function getAllDegrees()
        external
        view
        returns (Degree[] memory)
    {
        uint256 len = allDegrees.length;
        Degree[] memory result = new Degree[](len);

        for (uint256 i = 0; i < len; i++) {
            result[i] = degrees[allDegrees[i]];
        }

        return result;
    }

    /*//////////////////////////////////////////////////////////////
                        BOARD MANAGEMENT
    //////////////////////////////////////////////////////////////*/

function approveBoard(address board, string memory name)
    public
    onlySupreme
{
    if (board == address(0)) revert InvalidAddress();
    if (bytes(name).length == 0) revert InvalidInput();

    if (boards[board].active) revert AlreadyExists();
    if (address(collegeRegistry) != address(0)) {
    if (collegeRegistry.isRegisteredCollege(board))
        revert NotAllowed();
}

    boards[board] = Board({
        name: name,
        active: true
    });

    emit BoardApproved(board, name);
}

    function approveBoardForDegree(address board, bytes32 degreeId)
        public
        onlySupreme
    {
        if (!boards[board].active) revert NotFound();
        if (!degrees[degreeId].exists) revert NotFound();

        boardDegreePermission[board][degreeId] = true;
    }

    function approveBoardWithDegrees(
        address board,
        string memory name,
        bytes32[] memory degreeIds
    )
        external
        onlySupreme
    {
        approveBoard(board, name);

        for (uint i = 0; i < degreeIds.length; i++) {
            approveBoardForDegree(board, degreeIds[i]);
        }
    }

    function isApprovedBoard(address board)
        external
        view
        returns (bool)
    {
        return boards[board].active;
    }

    function canBoardUseDegree(address board, bytes32 degreeId)
        public
        view
        returns (bool)
    {
        return boardDegreePermission[board][degreeId];
    }

    function getBoard(address board)
    external
    view
    returns (string memory name, bool active)
{
    Board memory b = boards[board];
    return (b.name, b.active);
}

function blockCollege(address college) external onlySupreme {
    blockedColleges[college] = true;
    emit CollegeBlocked(college);
}

function unblockCollege(address college) external onlySupreme {
    blockedColleges[college] = false;
    emit CollegeUnblocked(college);
}

function isCollegeBlocked(address college) external view returns (bool) {
    return blockedColleges[college];
}

    function revokeBoard(address board) external onlySupreme {
    Board storage b = boards[board];

    if (bytes(b.name).length == 0) revert NotFound(); // not registered
    if (!b.active) revert NotAllowed(); // already inactive

    b.active = false;
    emit BoardRevoked(board);
}


    /*//////////////////////////////////////////////////////////////
                        ISSUER CONTROL
    //////////////////////////////////////////////////////////////*/

    function setCertificateIssuer(address _issuer)
        external
        onlySupreme
    {
        if (_issuer == address(0)) revert InvalidAddress();
        certificateIssuer = _issuer;
        emit IssuerUpdated(_issuer);
    }

    function grantStudentRole(address student)
        external
        onlyIssuer
    {
        studentRole[student] = true;
    }

    function revokeStudentRole(address student)
        external
        onlyIssuer
    {
        studentRole[student] = false;
    }

    function isStudentBlacklisted(address student)
        external
        view
        returns (bool)
    {
        return studentBlacklisted[student];
    }

    function blacklistStudent(address student) external onlySupreme {
    studentBlacklisted[student] = true;
    emit StudentBlacklisted(student);
}

function removeFromBlacklist(address student) external onlySupreme {
    studentBlacklisted[student] = false;
    emit StudentUnblacklisted(student);
}

    /*//////////////////////////////////////////////////////////////
                        ROLE HELPERS
    //////////////////////////////////////////////////////////////*/

    function isBoard(address user) external view returns (bool) {
        return boards[user].active;
    }

    function isDegreeValid(bytes32 degreeId)
    external
    view
    returns (bool)
{
    return degrees[degreeId].exists;
}

function isStudent(address user) external view returns (bool) {
    return studentRole[user];
}

    function _toLower(string memory str) internal pure returns (string memory) {
    bytes memory bStr = bytes(str);
    for (uint i = 0; i < bStr.length; i++) {
        if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
            bStr[i] = bytes1(uint8(bStr[i]) + 32);
        }
    }
    return string(bStr);
}


function revokeBoardForDegree(address board, bytes32 degreeId)
    external
    onlySupreme
{
    if (!boards[board].active) revert NotFound();
    if (!degrees[degreeId].exists) revert NotFound();

    if (!boardDegreePermission[board][degreeId])
        revert NotAllowed();

    boardDegreePermission[board][degreeId] = false;

    emit BoardDegreeRevoked(board, degreeId);
}

function batchApproveBoardsWithDegrees(
    address[] calldata boardAddresses,
    string[] calldata names,
    bytes32[][] calldata degreeIds
)
    external
    onlySupreme
    whenNotPaused
{
    uint256 len = boardAddresses.length;

    if (len != names.length || len != degreeIds.length)
        revert InvalidInput();

    if (len == 0 || len > 100) revert InvalidInput();

    for (uint256 i = 0; i < len; ) {
        address board = boardAddresses[i];
        string memory name = names[i];

        if (board == address(0)) revert InvalidAddress();
        if (bytes(name).length == 0) revert InvalidInput();

        if (address(collegeRegistry) != address(0)) {
            if (collegeRegistry.isRegisteredCollege(board))
                revert NotAllowed();
        }

        bytes32[] calldata degs = degreeIds[i];
        if (degs.length == 0) revert InvalidInput();

        if (!boards[board].active) {
            boards[board] = Board({ name: name, active: true });
            emit BoardApproved(board, name);
        } else {
            boards[board].name = name; // optional sync
        }

        for (uint256 j = 0; j < degs.length; ) {
            bytes32 degreeId = degs[j];

            if (!degrees[degreeId].exists) revert NotFound();

            if (!boardDegreePermission[board][degreeId]) {
    boardDegreePermission[board][degreeId] = true;
    emit BoardDegreeApproved(board, degreeId);
}

            unchecked { ++j; }
        }

        unchecked { ++i; }
    }
}

function setCollegeRegistry(address _registry) external onlySupreme {
    if (_registry == address(0)) revert InvalidAddress();
    collegeRegistry = ICollegeRegistry(_registry);
}
function getDegreeLevel(bytes32 degreeId) external view returns (uint256) {
    return degrees[degreeId].level;
}

}