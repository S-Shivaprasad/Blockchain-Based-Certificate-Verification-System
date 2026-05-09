// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISupremeAuthority {
    function isApprovedBoard(address board) external view returns (bool);
    function isSystemPaused() external view returns (bool);
    function isCollegeBlocked(address college) external view returns (bool);
}

contract CollegeRegistry {

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotApprovedBoard();
    error SystemPaused();
    error InvalidAddress();
    error NameRequired();
    error CodeRequired();
    error CodeAlreadyUsed();
    error NotActive();
    error NotYourCollege();
    error NotFound();
    error WalletAlreadyUsed();
    error LengthMismatch();
    error NotAllowed();

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    ISupremeAuthority public immutable supremeAuthority;

    struct College {
        string name;
        string collegeCodeString;   // ✅ readable code (CBIT)
        bytes32 collegeCodeHash;    // ✅ for uniqueness
        string metadataURI;
        address registeredByBoard;
        bool active;
        uint256 registeredAt;
        uint256 revokedAt;
    }

    mapping(address => College) private colleges;

    // Uniqueness
    mapping(bytes32 => bool) private usedCollegeCodes;

    // 🔍 Search support
    mapping(bytes32 => address) public codeToCollege;
    mapping(bytes32 => address[]) public nameToColleges;

    // Indexing
    mapping(address => address[]) private boardColleges;
    address[] private allColleges;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event CollegeRegistered(
        address indexed collegeWallet,
        address indexed board,
        string name,
        string code,
        string metadataURI
    );

    event CollegeRevoked(address indexed collegeWallet, address indexed board);

    event CollegeWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        address indexed board
    );

    event CollegeMetadataUpdated(
        address indexed collegeWallet,
        string newMetadataURI
    );

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _supremeAuthority) {
        if (_supremeAuthority == address(0)) revert InvalidAddress();
        supremeAuthority = ISupremeAuthority(_supremeAuthority);
    }

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyApprovedBoard() {
        if (!supremeAuthority.isApprovedBoard(msg.sender))
            revert NotApprovedBoard();
        _;
    }

    modifier whenNotPaused() {
        if (supremeAuthority.isSystemPaused())
            revert SystemPaused();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        REGISTER COLLEGE
    //////////////////////////////////////////////////////////////*/

   function _toLower(string memory str) internal pure returns (string memory) {
    bytes memory bStr = bytes(str);
    for (uint i = 0; i < bStr.length; i++) {
        if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
            bStr[i] = bytes1(uint8(bStr[i]) + 32);
        }
    }
    return string(bStr);
}

function registerCollege(
    address collegeWallet,
    string calldata name,
    string calldata collegeCodeString,
    string calldata metadataURI
)
    public
    onlyApprovedBoard
    whenNotPaused
{
    if (collegeWallet == address(0)) revert InvalidAddress();
    if (supremeAuthority.isCollegeBlocked(collegeWallet))
    revert NotAllowed();
    if (bytes(name).length == 0) revert NameRequired();
    if (bytes(collegeCodeString).length == 0) revert CodeRequired();
    if (colleges[collegeWallet].registeredAt != 0)
    revert WalletAlreadyUsed();

    string memory normalized = _toLower(collegeCodeString);
    bytes32 codeHash = keccak256(bytes(normalized));

    if (usedCollegeCodes[codeHash]) revert CodeAlreadyUsed();

    colleges[collegeWallet] = College({
        name: name,
        collegeCodeString: collegeCodeString,
        collegeCodeHash: codeHash,
        metadataURI: metadataURI,
        registeredByBoard: msg.sender,
        active: true,
        registeredAt: block.timestamp,
        revokedAt: 0
    });

    usedCollegeCodes[codeHash] = true;

    // 🔍 Search mappings
    codeToCollege[codeHash] = collegeWallet;
    bytes32 nameHash = keccak256(bytes(_toLower(name)));
nameToColleges[nameHash].push(collegeWallet);

    boardColleges[msg.sender].push(collegeWallet);
    allColleges.push(collegeWallet);

    emit CollegeRegistered(
        collegeWallet,
        msg.sender,
        name,
        collegeCodeString,
        metadataURI
    );
}
    /*//////////////////////////////////////////////////////////////
                        BATCH REGISTER
    //////////////////////////////////////////////////////////////*/

    function batchRegisterColleges(
        address[] calldata wallets,
        string[] calldata names,
        string[] calldata codes,
        string[] calldata uris
    )
        external
        onlyApprovedBoard
        whenNotPaused
    {
        uint256 len = wallets.length;
        if (len != names.length || len != codes.length || len != uris.length)
    revert LengthMismatch();

        for (uint256 i = 0; i < len; ) {
    registerCollege(wallets[i], names[i], codes[i], uris[i]);
    unchecked { ++i; }
}
    }

    /*//////////////////////////////////////////////////////////////
                        REVOKE
    //////////////////////////////////////////////////////////////*/

    function revokeCollege(address collegeWallet)
        external
        onlyApprovedBoard
        whenNotPaused
    {
        College storage college = colleges[collegeWallet];

        if (college.registeredAt == 0) revert NotFound();
        if (!college.active) revert NotActive();
        if (college.registeredByBoard != msg.sender)
            revert NotYourCollege();

        college.active = false;
        college.revokedAt = block.timestamp;

        emit CollegeRevoked(collegeWallet, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                        UPDATE METADATA
    //////////////////////////////////////////////////////////////*/

    function updateMetadata(
        address collegeWallet,
        string calldata newURI
    )
        external
        onlyApprovedBoard
        whenNotPaused
    {
        College storage college = colleges[collegeWallet];

        if (college.registeredAt == 0) revert NotFound();
        if (!college.active) revert NotActive();
        if (college.registeredByBoard != msg.sender)
            revert NotYourCollege();

        college.metadataURI = newURI;

        emit CollegeMetadataUpdated(collegeWallet, newURI);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getCollege(address collegeWallet)
        external
        view
        returns (College memory)
    {
        if (colleges[collegeWallet].registeredAt == 0)
            revert NotFound();
        return colleges[collegeWallet];
    }

   function getCollegeByCode(string calldata code)
    external
    view
    returns (address)
{
    return codeToCollege[keccak256(bytes(_toLower(code)))];
}

    function searchByName(string calldata name)
        external
        view
        returns (address[] memory)
    {
        return nameToColleges[keccak256(bytes(_toLower(name)))];
    }

    function getAllColleges() external view returns (address[] memory) {
        return allColleges;
    }

    function getBoardColleges(address board)
        external
        view
        returns (address[] memory)
    {
        return boardColleges[board];
    }

   function isRegisteredCollege(address collegeWallet)
    external
    view
    returns (bool)
{
    return colleges[collegeWallet].registeredAt != 0 &&
       colleges[collegeWallet].active &&
       !supremeAuthority.isCollegeBlocked(collegeWallet);
}

function isActiveCollege(address collegeWallet)
    external
    view
    returns (bool)
{
    return colleges[collegeWallet].active;
}

function getCollegeBoard(address collegeWallet)
    external
    view
    returns (address)
{
    if (colleges[collegeWallet].registeredAt == 0)
        revert NotFound();

    return colleges[collegeWallet].registeredByBoard;
}

function updateCollegeWallet(address oldWallet, address newWallet)
    external
    onlyApprovedBoard
    whenNotPaused
{
    if (newWallet == address(0)) revert InvalidAddress();

    College storage college = colleges[oldWallet];

    if (college.registeredAt == 0) revert NotFound();
    if (college.registeredByBoard != msg.sender) revert NotYourCollege();
    if (!college.active) revert NotActive();
    if (colleges[newWallet].registeredAt != 0) revert WalletAlreadyUsed();

    // Update code mapping
    codeToCollege[college.collegeCodeHash] = newWallet;

    // Update name mapping
    bytes32 nameHash = keccak256(bytes(_toLower(college.name)));
    address[] storage list = nameToColleges[nameHash];
    for (uint i = 0; i < list.length; i++) {
        if (list[i] == oldWallet) {
            list[i] = newWallet;
            break;
        }
    }

    // Update board list
    address[] storage boardList = boardColleges[msg.sender];
    for (uint i = 0; i < boardList.length; i++) {
        if (boardList[i] == oldWallet) {
            boardList[i] = newWallet;
            break;
        }
    }

    

    // Update allColleges
    for (uint i = 0; i < allColleges.length; i++) {
        if (allColleges[i] == oldWallet) {
            allColleges[i] = newWallet;
            break;
        }
    }

    // Move storage
    colleges[newWallet] = college;
    delete colleges[oldWallet];

    emit CollegeWalletUpdated(oldWallet, newWallet, msg.sender);
}

function isValidCollege(address college)
    external
    view
    returns (bool)
{
    College memory c = colleges[college];

    return (
        c.registeredAt != 0 &&
        c.active &&
        !supremeAuthority.isCollegeBlocked(college)
    );
}

}