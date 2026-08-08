# 🔐 Blockchain-Based Certificate Verification System

A decentralized certificate management and verification platform that uses **Blockchain, Smart Contracts, and IPFS** to securely issue, store, and verify digital certificates.

The system helps organizations issue tamper-resistant certificates while allowing anyone to verify their authenticity without relying entirely on a centralized database.

---

## 📖 Overview

Traditional digital certificates can be modified, duplicated, or difficult to verify.

This project addresses these problems by combining:

- ⛓️ Blockchain for tamper-resistant verification
- 📜 Solidity smart contracts for certificate records
- 📦 IPFS/Pinata for decentralized certificate storage
- ⚛️ React for the user interface
- 🟢 Node.js for backend APIs

Each certificate can be associated with blockchain data and a digital file stored through decentralized storage, making unauthorized modification easier to detect.

---

## 🎯 Problem Statement

Traditional certificate verification systems can suffer from:

- ❌ Certificate forgery
- ❌ Unauthorized modifications
- ❌ Centralized storage dependency
- ❌ Manual verification processes
- ❌ Difficulty validating certificates issued by different organizations

---

## 💡 Solution

The application provides a blockchain-based workflow for certificate issuance and verification.

```text
Certificate Issuer
        │
        ▼
 React Frontend
        │
        ▼
 Node.js Backend
        │
        ├───────────────┐
        ▼               ▼
   IPFS / Pinata    Smart Contract
        │               │
        │               ▼
        │          Blockchain
        │
        └───────┬───────┘
                ▼
        Certificate Record
                │
                ▼
       Certificate Verification
                │
          ┌─────┴─────┐
          ▼           ▼
       ✅ Valid     ❌ Invalid
```

---

# ✨ Features

### 🎓 Certificate Issuance

Organizations can create and issue digital certificates through the application.

### 🔐 Blockchain Verification

Certificate information can be verified against blockchain records to help detect tampering.

### 📦 Decentralized Storage

Certificate files can be stored using **IPFS/Pinata** rather than relying only on centralized storage.

### 🔍 Certificate Verification

Users can verify certificates using the information provided by the system.

### ⛓️ Smart Contracts

Solidity smart contracts manage certificate-related blockchain records.

### 🌐 Web Application

A React-based frontend provides an easy-to-use interface for certificate management and verification.

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │        User         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │                     │
                         │ • Issue Certificate│
                         │ • Verify Certificate│
                         └──────────┬──────────┘
                                    │
                              HTTP / API
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Node.js Backend   │
                         │                     │
                         │ • API Handling      │
                         │ • Validation        │
                         │ • File Processing   │
                         └──────┬────────┬─────┘
                                │        │
                    ┌───────────┘        └────────────┐
                    ▼                                 ▼
          ┌──────────────────┐              ┌──────────────────┐
          │  IPFS / Pinata   │              │ Smart Contract   │
          │                  │              │    Solidity      │
          │ Certificate File │              │                  │
          └────────┬─────────┘              └────────┬─────────┘
                   │                                 │
                   │                                 ▼
                   │                         ┌───────────────┐
                   │                         │  Blockchain   │
                   │                         │   Network     │
                   │                         └───────┬───────┘
                   │                                 │
                   └────────────────┬────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Certificate Record  │
                         │    & Verification   │
                         └─────────────────────┘
```

---

# 🔄 Certificate Workflow

## 1️⃣ Certificate Issuance

```text
Issuer
  │
  ▼
Enter Certificate Details
  │
  ▼
Upload Certificate
  │
  ▼
Store File on IPFS
  │
  ▼
Generate Certificate Reference
  │
  ▼
Store Verification Data
on Blockchain
```

## 2️⃣ Certificate Verification

```text
User
  │
  ▼
Enter Certificate Details
  │
  ▼
Retrieve Certificate Data
  │
  ▼
Check Blockchain Record
  │
  ▼
Compare Certificate Information
  │
  ├───────────────┐
  ▼               ▼
VALID           INVALID
  │               │
  ▼               ▼
✅ Verified     ❌ Rejected
```

---

# 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React.js, Vite |
| Backend | Node.js, Express.js |
| Blockchain | Ethereum |
| Smart Contracts | Solidity |
| Blockchain Development | Hardhat |
| Storage | IPFS / Pinata |
| Web3 | Ethers.js / Web3 |
| API | REST API |
| Language | JavaScript |

---

# 📂 Project Structure

```text
Blockchain-Based-Certificate-Verification-System/
│
├── Backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── utils/
│   └── ...
│
├── Blockchain/
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# ⚙️ Installation

## 📋 Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git
- MetaMask
- A blockchain development network or supported Ethereum network

---

# 1. Clone the Repository

```bash
git clone https://github.com/S-Shivaprasad/Blockchain-Based-Certificate-Verification-System.git

cd Blockchain-Based-Certificate-Verification-System
```

---

# 2. Install Backend Dependencies

```bash
cd Backend
npm install
```

Start the backend using the project's configured start command.

For example:

```bash
npm start
```

> If your project uses a different command, check `Backend/package.json`.

---

# 3. Install Blockchain Dependencies

Open another terminal:

```bash
cd Blockchain
npm install
```

Compile the smart contracts:

```bash
npx hardhat compile
```

Run the blockchain development network if required:

```bash
npx hardhat node
```

Deploy the smart contract using the project's deployment script.

```bash
npx hardhat run scripts/deploy.js --network localhost
```

> The deployment command may differ depending on the project's Hardhat configuration.

---

# 4. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

Start the React development server:

```bash
npm run dev
```

Open the URL shown by Vite in your browser.

Usually:

```text
http://localhost:5173
```

---

# 🔑 Environment Variables

Create the required `.env` files based on the configuration used by the application.

Example:

```env
PORT=5000
MONGODB_URI=your_database_connection
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_deployed_contract_address
```

> ⚠️ Never commit private keys, API secrets, wallet credentials, or `.env` files to GitHub.

Add `.env` to `.gitignore`:

```text
.env
.env.local
.env.*.local
```

---

# 🔗 Smart Contract

The blockchain component is developed using **Solidity** and **Hardhat**.

The smart contract is responsible for maintaining certificate-related verification data on the blockchain.

Typical workflow:

```text
Certificate
     │
     ▼
Generate Verification Data
     │
     ▼
Smart Contract
     │
     ▼
Blockchain Transaction
     │
     ▼
Immutable Record
```

---

# 📦 IPFS Storage

Certificate files can be stored using **IPFS through Pinata**.

The application can use the resulting IPFS reference to retrieve the certificate when required.

```text
Certificate File
      │
      ▼
   Pinata
      │
      ▼
    IPFS
      │
      ▼
   IPFS CID
      │
      ▼
Certificate Reference
```

---

# 📸 Screenshots

Add screenshots of the working application here.

### 🏠 Home Page

![Home Page](docs/home-page.png)

### 🎓 Certificate Issuance

![Certificate Issuance](docs/certificate-issuance.png)

### 🔍 Certificate Verification

![Certificate Verification](docs/certificate-verification.png)

### ⛓️ Blockchain Transaction

![Blockchain Transaction](docs/blockchain-transaction.png)

> Create a `docs/` folder and place your screenshots inside it using the filenames above.

---

# 🔐 Security Considerations

This project demonstrates blockchain-based certificate verification.

For a production deployment, additional security measures should be considered:

- Smart contract auditing
- Secure private-key management
- API authentication and authorization
- Input validation
- File-type validation
- Rate limiting
- Secure IPFS access
- HTTPS
- Protection against replay and duplicate submissions

---

# 🚀 Future Improvements

- [ ] QR-code based certificate verification
- [ ] Mobile-friendly verification interface
- [ ] Role-based access control
- [ ] Organization authentication
- [ ] NFT-based certificates
- [ ] Multi-chain support
- [ ] Certificate expiration and revocation
- [ ] Automated certificate generation
- [ ] Improved blockchain transaction tracking
- [ ] Production deployment

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/your-feature
```

3. Commit your changes.

```bash
git commit -m "Add your feature"
```

4. Push the branch.

```bash
git push origin feature/your-feature
```

5. Open a Pull Request.

---

# 📄 License

This project is open-source.

Add an appropriate license file if you intend to distribute the project under a specific open-source license.

---

# 👨‍💻 Author

## Shivaprasad S

GitHub:  
https://github.com/S-Shivaprasad

---

⭐ If you found this project useful, consider giving the repository a star!
