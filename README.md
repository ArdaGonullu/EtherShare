📂 EtherShare v3.0
Decentralized, Encrypted, and Version-Controlled File Storage System

EtherShare is a Web3 application designed to solve the centralization and privacy issues of traditional cloud storage. By leveraging IPFS for distributed storage and Ethereum smart contracts for access control, it allows users to upload, encrypt, monetize, and version-track their files without relying on a central authority.

Built with Scaffold-ETH 2.

🚀 Key Features
🔒 Client-Side Encryption (AES): Files can be encrypted with a user-defined password before leaving the browser. Even the IPFS node providers cannot access the raw content.

♻️ File Versioning: Implements a parent-child relationship on-chain to track file history (e.g., updating a document from v1.0 to v1.1).

💰 Token-Gated Access (Paywall): Users can monetize their files. Access is granted automatically via smart contract upon payment.

📦 Batch Uploading: Supports multi-file selection and bulk uploading to IPFS.

⚡ Hybrid Architecture: Uses IPFS for heavy storage (Off-chain) and Ethereum for immutable ownership records (On-chain).

🛠 Tech Stack
Blockchain: Solidity, Hardhat

Frontend: Next.js, React, TailwindCSS

Storage: IPFS (via Pinata API)

Cryptography: Crypto-JS (AES-256 Encryption)

Libraries: wagmi, viem, rainbowkit

🏗 Architecture
The system consists of three main layers:

Storage Layer: Files are hashed and stored on the IPFS network.

Logic Layer: A Smart Contract (YourContract.sol) maps the IPFS hash to the owner's wallet address and handles permissions/payments.

Presentation Layer: A React frontend interacts with the user's wallet (MetaMask) to sign transactions and decrypt files locally.

🏃‍♂️ Getting Started
Prerequisites

Node.js (v18+)

Yarn

Git

Installation

Clone the repository:

Bash
git clone https://github.com/ArdaGonullu/EtherShare.git
cd EtherShare
Install dependencies:

Bash
yarn install
Configuration:

Open packages/nextjs/app/page.tsx.

Replace the PINATA_JWT variable with your own Pinata API Key.

Running the App

Start the local blockchain:
Bash
yarn chain

Deploy the smart contract:
Bash
yarn deploy

Start the frontend:
Bash
yarn start

Visit http://localhost:3000 to interact with the application.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

Infrastructure based on Scaffold-ETH 2.