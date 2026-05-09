// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


  interface ISupremeAuthority {
    function isSystemPaused() external view returns (bool);
    function getDegreeLevel(bytes32 degreeId) external view returns (uint256);
}


contract CertificateStorage {

    /*//////////////////////////////////////////////////////////////
                            STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Certificate {
        uint256 certId;
        address student;
        address board;
        address college;
        bytes32 degreeId;
        string cid;
        uint256 issuedAt;
        bool revoked;
    }
    address public supremeAuthority;

  
    /*//////////////////////////////////////////////////////////////
                        STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 private _certCounter;

    mapping(uint256 => Certificate) public certificates;
    mapping(address => mapping(bytes32 => uint256)) public studentDegreeCert;
    mapping(bytes32 => uint256) public cidToCertId;
    mapping(address => uint256) public boardNonce;

    mapping(address => uint256) private _activeCertCount;

    // Indexing
    mapping(address => uint256[]) public studentCertificates;
    mapping(address => uint256[]) public boardCertificates;
    mapping(address => uint256[]) public collegeCertificates;
    mapping(bytes32 => uint256[]) public degreeCertificates;
    mapping(address => uint256) public studentMaxLevel;

    /*//////////////////////////////////////////////////////////////
                        ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    address public issuerContract;

    modifier onlyIssuer() {
        if (msg.sender != issuerContract) revert NotAuthorized();
        _;
    }

    modifier whenNotPaused() {
    if (ISupremeAuthority(supremeAuthority).isSystemPaused())
        revert SystemPaused();
    _;
}

    /*//////////////////////////////////////////////////////////////
                            ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotAuthorized();
    error InvalidAddress();
    error CertificateExists();
    error CIDAlreadyUsed();
    error InvalidCertificate();
    error AlreadyRevoked();
    error SystemPaused();
    error InvalidAcademicProgression();

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event CertificateCreated(
        uint256 indexed certId,
        address indexed student,
        bytes32 indexed degreeId
    );

    event CertificateRevoked(uint256 indexed certId);

    event IssuerUpdated(address oldIssuer, address newIssuer);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _supremeAuthority) {
    if (_supremeAuthority == address(0)) revert InvalidAddress();

    issuerContract = msg.sender;
    supremeAuthority = _supremeAuthority;
}

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTION
    //////////////////////////////////////////////////////////////*/

   function setIssuerContract(address _issuer) external {
    if (msg.sender != issuerContract && msg.sender != supremeAuthority)
        revert NotAuthorized();

    if (_issuer == address(0)) revert InvalidAddress();

    emit IssuerUpdated(issuerContract, _issuer);
    issuerContract = _issuer;
}

    /*//////////////////////////////////////////////////////////////
                    CERTIFICATE CREATION
    //////////////////////////////////////////////////////////////*/

    function createCertificate(
        address student,
        address board,
        address college,
        bytes32 degreeId,
        string calldata cid
    ) external
onlyIssuer
whenNotPaused
returns (uint256) {

        if (
            student == address(0) ||
            board == address(0) ||
            college == address(0)
        ) revert InvalidAddress();

        if (studentDegreeCert[student][degreeId] != 0)
            revert CertificateExists();

        bytes32 cidHash = keccak256(bytes(cid));

        if (cidToCertId[cidHash] != 0)
            revert CIDAlreadyUsed();

        uint256 degreeLevel =
    ISupremeAuthority(supremeAuthority).getDegreeLevel(degreeId);

if (degreeLevel <= studentMaxLevel[student])
    revert InvalidAcademicProgression();
        unchecked {
            _certCounter++;
        }

        uint256 certId = _certCounter;

        certificates[certId] = Certificate({
            certId: certId,
            student: student,
            board: board,
            college: college,
            degreeId: degreeId,
            cid: cid,
            issuedAt: block.timestamp,
            revoked: false
        });

        // Indexing
        studentDegreeCert[student][degreeId] = certId;
        cidToCertId[cidHash] = certId;

        studentCertificates[student].push(certId);
        boardCertificates[board].push(certId);
        collegeCertificates[college].push(certId);
        degreeCertificates[degreeId].push(certId);

        _activeCertCount[student]++;

       emit CertificateCreated(certId, student, degreeId);

studentMaxLevel[student] = degreeLevel;
        return certId;
    }

    /*//////////////////////////////////////////////////////////////
                    CERTIFICATE REVOCATION
    //////////////////////////////////////////////////////////////*/

    function revokeCertificate(uint256 certId) external onlyIssuer whenNotPaused {
        Certificate storage cert = certificates[certId];

        if (cert.certId == 0) revert InvalidCertificate();
        if (cert.revoked) revert AlreadyRevoked();

        cert.revoked = true;

        // Safe decrement (future-proof)
        if (_activeCertCount[cert.student] > 0) {
            _activeCertCount[cert.student]--;
        }

        emit CertificateRevoked(certId);
    }

    /*//////////////////////////////////////////////////////////////
                        NONCE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function incrementBoardNonce(address board) external onlyIssuer whenNotPaused {
        unchecked {
            boardNonce[board]++;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getCertificate(uint256 certId)
        external
        view
        returns (Certificate memory)
    {
        if (certificates[certId].certId == 0)
            revert InvalidCertificate();

        return certificates[certId];
    }

    function getActiveCertificateCount(address student)
        external
        view
        returns (uint256)
    {
        return _activeCertCount[student];
    }

    function getStudentCertificates(address student)
        external
        view
        returns (uint256[] memory)
    {
        return studentCertificates[student];
    }

    function getBoardCertificates(address board)
        external
        view
        returns (uint256[] memory)
    {
        return boardCertificates[board];
    }

    function getCollegeCertificates(address college)
        external
        view
        returns (uint256[] memory)
    {
        return collegeCertificates[college];
    }

    function getDegreeCertificates(bytes32 degreeId)
        external
        view
        returns (uint256[] memory)
    {
        return degreeCertificates[degreeId];
    }

    function totalCertificates() external view returns (uint256) {
        return _certCounter;
    }

    function hasCertificate(
    address student,
    bytes32 degreeId
) external view returns (bool) {
    return studentDegreeCert[student][degreeId] != 0;
}
}