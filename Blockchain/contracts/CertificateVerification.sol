// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*//////////////////////////////////////////////////////////////
                        INTERFACE
//////////////////////////////////////////////////////////////*/

interface ICertificateStorage {
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

    function cidToCertId(bytes32 cidHash)
        external
        view
        returns (uint256);

    function getStudentCertificates(address student)
        external
        view
        returns (uint256[] memory);
}

/*//////////////////////////////////////////////////////////////
                        CONTRACT
//////////////////////////////////////////////////////////////*/

contract CertificateVerification {

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidAddress();
    error CertificateNotFound();

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    ICertificateStorage public immutable storageContract;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _storage) {
        if (_storage == address(0)) revert InvalidAddress();
        storageContract = ICertificateStorage(_storage);
    }

    /*//////////////////////////////////////////////////////////////
                        BASIC VERIFICATION
    //////////////////////////////////////////////////////////////*/

    function verifyCertificate(uint256 certId)
        external
        view
        returns (bool valid, bool revoked)
    {
        (
            uint256 id,
            ,
            ,
            ,
            ,
            ,
            ,
            bool isRevoked
        ) = storageContract.certificates(certId);

        if (id == 0) return (false, false);

        return (!isRevoked, isRevoked);
    }

    function verifyByCID(string calldata cid)
        external
        view
        returns (bool)
    {
        bytes32 cidHash = keccak256(bytes(cid));
        uint256 certId = storageContract.cidToCertId(cidHash);

        if (certId == 0) return false;

        (, , , , , , , bool revoked) =
            storageContract.certificates(certId);

        return !revoked;
    }

    /*//////////////////////////////////////////////////////////////
                    FULL CERTIFICATE DETAILS
    //////////////////////////////////////////////////////////////*/

    struct CertificateView {
        uint256 certId;
        address student;
        address board;
        address college;
        bytes32 degreeId;
        string cid;
        uint256 issuedAt;
        bool revoked;
    }

    function getCertificate(uint256 certId)
        external
        view
        returns (CertificateView memory)
    {
        (
            uint256 id,
            address student,
            address board,
            address college,
            bytes32 degreeId,
            string memory cid,
            uint256 issuedAt,
            bool revoked
        ) = storageContract.certificates(certId);

        if (id == 0) revert CertificateNotFound();

        return CertificateView({
            certId: id,
            student: student,
            board: board,
            college: college,
            degreeId: degreeId,
            cid: cid,
            issuedAt: issuedAt,
            revoked: revoked
        });
    }

    function getCertificatesByStudent(address student)
        external
        view
        returns (uint256[] memory)
    {
        return storageContract.getStudentCertificates(student);
    }
}