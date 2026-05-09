// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/*//////////////////////////////////////////////////////////////
                        INTERFACES
//////////////////////////////////////////////////////////////*/

interface ICertificateStorage {
    function createCertificate(
        address student,
        address board,
        address college,
        bytes32 degreeId,
        string calldata cid
    ) external returns (uint256);

    function revokeCertificate(uint256 certId) external;

    function incrementBoardNonce(address board) external;

    function boardNonce(address board) external view returns (uint256);

    function getActiveCertificateCount(address student)
        external
        view
        returns (uint256);

    function certificates(uint256 certId)
        external
        view
        returns (
            uint256,
            address,
            address,
            address,
            bytes32,
            string memory,
            uint256,
            bool
        );
        function studentMaxLevel(address student) external view returns (uint256);
}

interface ISupremeAuthority {
    function isApprovedBoard(address board) external view returns (bool);
    function isSystemPaused() external view returns (bool);
    function isStudentBlacklisted(address student) external view returns (bool);
    
    // ✅ Change from isValidDegree to isDegreeValid
    function isDegreeValid(bytes32 degreeId) external view returns (bool);

    function grantStudentRole(address student) external;
    function revokeStudentRole(address student) external;
    function getDegreeLevel(bytes32 degreeId) external view returns (uint256);
}

interface ICollegeRegistry {
    // ✅ Change from isActiveCollege to isRegisteredCollege
    function isRegisteredCollege(address college) external view returns (bool);
    
    function getCollegeBoard(address college) external view returns (address);
}

interface IBoardAuthority {
    function canIssue(
        address board,
        address college,
        bytes32 degreeId
    ) external view returns (bool);
}

/*//////////////////////////////////////////////////////////////
                    CERTIFICATE ISSUER
//////////////////////////////////////////////////////////////*/

contract CertificateIssuer is ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    ICertificateStorage public immutable storageContract;
    ISupremeAuthority public immutable supremeAuthority;
    ICollegeRegistry public immutable collegeRegistry;
    IBoardAuthority public immutable boardAuthority;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidAddress();
    error InvalidCID();
    error NotApprovedBoard();
    error NotApprovedCollege();
    error NotAllowed();
    error StudentBlacklisted();
    error InvalidBoardSignature();
    error InvalidCollegeSignature();
    error AlreadyRevoked();
    error NotIssuingBoard();
    error SystemPaused();
    error LengthMismatch();
    error MissingPrerequisite();
    
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event CertificateIssued(
        uint256 indexed certId,
        address indexed student,
        address indexed board,
        address college,
        bytes32 degreeId,
        string cid
    );

    event CertificateRevoked(
        uint256 indexed certId,
        address indexed student
    );

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    

    /*//////////////////////////////////////////////////////////////
                                MODIFIER
    //////////////////////////////////////////////////////////////*/

    modifier whenNotPaused() {
        if (supremeAuthority.isSystemPaused()) revert SystemPaused();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _storage,
        address _supreme,
        address _college,
        address _boardAuthority
    ) {
        if (
            _storage == address(0) ||
            _supreme == address(0) ||
            _college == address(0) ||
            _boardAuthority == address(0)
        ) revert InvalidAddress();

        storageContract = ICertificateStorage(_storage);
        supremeAuthority = ISupremeAuthority(_supreme);
        collegeRegistry = ICollegeRegistry(_college);
        boardAuthority = IBoardAuthority(_boardAuthority);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL HASH
    //////////////////////////////////////////////////////////////*/

    function _getDigest(
        address board,
        address student,
        address college,
        bytes32 degreeId,
        string calldata cid,
        uint256 nonce
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                block.chainid,
                address(this),
                board,
                student,
                college,
                degreeId,
                cid,
                nonce
            )
        ).toEthSignedMessageHash();
    }

    /*//////////////////////////////////////////////////////////////
                    INTERNAL ISSUE (FIXED)
    //////////////////////////////////////////////////////////////*/

    function _issueSingle(
    address board,
    address student,
    address college,
    bytes32 degreeId,
    string calldata cid,
    bytes calldata boardSig,
    bytes calldata collegeSig,
    uint256 nonce
) internal returns (uint256 certId) {

    if (student == address(0) || college == address(0))
        revert InvalidAddress();

    if (bytes(cid).length == 0)
        revert InvalidCID();

    if (!supremeAuthority.isDegreeValid(degreeId))
        revert NotAllowed();

    if (!collegeRegistry.isRegisteredCollege(college))
        revert NotApprovedCollege();

    address collegeBoard = collegeRegistry.getCollegeBoard(college);
    if (collegeBoard != board) revert NotAllowed();

    if (!boardAuthority.canIssue(board, college, degreeId))
        revert NotAllowed();

    if (supremeAuthority.isStudentBlacklisted(student))
        revert StudentBlacklisted();

    uint256 degreeLevel = supremeAuthority.getDegreeLevel(degreeId);
    uint256 currentMaxLevel = storageContract.studentMaxLevel(student);

    uint256 expectedNextLevel = currentMaxLevel == 0 ? 1 : currentMaxLevel + 1;

    if (degreeLevel != expectedNextLevel) {
        revert MissingPrerequisite();
    }

    bytes32 digest = _getDigest(
        board,
        student,
        college,
        degreeId,
        cid,
        nonce
    );

    if (digest.recover(boardSig) != board)
        revert InvalidBoardSignature();

    if (digest.recover(collegeSig) != college)
        revert InvalidCollegeSignature();

    certId = storageContract.createCertificate(
        student,
        board,
        college,
        degreeId,
        cid
    );

    storageContract.incrementBoardNonce(board);

    if (storageContract.getActiveCertificateCount(student) == 1) {
        supremeAuthority.grantStudentRole(student);
    }
}

    /*//////////////////////////////////////////////////////////////
                    ISSUE CERTIFICATE (SINGLE)
    //////////////////////////////////////////////////////////////*/

    function issueCertificate(
        address student,
        address college,
        bytes32 degreeId,
        string calldata cid,
        bytes calldata boardSig,
        bytes calldata collegeSig
    ) external whenNotPaused nonReentrant {

        address board = msg.sender;

        if (!supremeAuthority.isApprovedBoard(board))
            revert NotApprovedBoard();

        uint256 nonce = storageContract.boardNonce(board);

        uint256 certId = _issueSingle(
            board,
            student,
            college,
            degreeId,
            cid,
            boardSig,
            collegeSig,
            nonce
        );

        emit CertificateIssued(certId, student, board, college, degreeId, cid);
    }

    /*//////////////////////////////////////////////////////////////
                    ISSUE CERTIFICATE (BATCH)
    //////////////////////////////////////////////////////////////*/

    function batchIssueCertificates(
        address[] calldata students,
        address[] calldata colleges,
        bytes32[] calldata degreeIds,
        string[] calldata cids,
        bytes[] calldata boardSigs,
        bytes[] calldata collegeSigs
    ) external whenNotPaused nonReentrant {

        uint256 len = students.length;

        if (
            len != colleges.length ||
            len != degreeIds.length ||
            len != cids.length ||
            len != boardSigs.length ||
            len != collegeSigs.length
        ) revert LengthMismatch();

        address board = msg.sender;

        if (!supremeAuthority.isApprovedBoard(board))
            revert NotApprovedBoard();

        uint256 nonce = storageContract.boardNonce(board);

        for (uint256 i = 0; i < len; ) {

            uint256 certId = _issueSingle(
                board,
                students[i],
                colleges[i],
                degreeIds[i],
                cids[i],
                boardSigs[i],
                collegeSigs[i],
                nonce
            );

            emit CertificateIssued(
                certId,
                students[i],
                board,
                colleges[i],
                degreeIds[i],
                cids[i]
            );

            unchecked {
                ++i;
                ++nonce;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        REVOKE CERTIFICATE
    //////////////////////////////////////////////////////////////*/

    function revokeCertificate(uint256 certId)
        external
        whenNotPaused
        nonReentrant
    {
        (
            ,
            address student,
            address board,
            ,
            ,
            ,
            ,
            bool revoked
        ) = storageContract.certificates(certId);

        if (revoked) revert AlreadyRevoked();
        if (msg.sender != board) revert NotIssuingBoard();

        storageContract.revokeCertificate(certId);

        if (storageContract.getActiveCertificateCount(student) == 0) {
            supremeAuthority.revokeStudentRole(student);
        }

        emit CertificateRevoked(certId, student);
    }
    /*//////////////////////////////////////////////////////////////
                        EXTERNAL HASH HELPER
    //////////////////////////////////////////////////////////////*/

    // ✅ ADD THIS FUNCTION TO THE BOTTOM OF CertificateIssuer.sol
    function getDigest(
        address board,
        address student,
        address college,
        bytes32 degreeId,
        string calldata cid,
        uint256 nonce
    ) external view returns (bytes32) {
        return _getDigest(board, student, college, degreeId, cid, nonce);
    }
}