# 💍 SmartVow - Blockchain Prenuptial Agreement Platform

<div align="center">

![SmartVow Banner](https://img.shields.io/badge/SmartVow-Blockchain%20Prenup-blueviolet?style=for-the-badge)
![Base L2](https://img.shields.io/badge/Base-L2%20Blockchain-0052FF?style=for-the-badge&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)

**Platform perjanjian pranikah berbasis blockchain pertama di Indonesia**

[🚀 Live Demo](#) | [📖 Documentation](./smartcontract/SMARTVOW_API.md) | [📜 Smart Contracts](./smartcontract/CONTRACTS.md)

</div>

---

## 📋 Daftar Isi

- [Tentang Project](#-tentang-project)
- [Fitur Utama](#-fitur-utama)
- [Teknologi Stack](#-teknologi-stack)
- [Arsitektur](#-arsitektur)
- [Smart Contracts](#-smart-contracts)
- [Instalasi & Setup](#-instalasi--setup)
- [Penggunaan](#-penggunaan)
- [Deployment](#-deployment)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

---

## 🎯 Tentang Project

**SmartVow** adalah platform inovatif yang menghadirkan solusi perjanjian pranikah (prenuptial agreement) berbasis blockchain. Platform ini menggabungkan teknologi Web3, smart contracts, dan AI untuk menciptakan sistem perjanjian yang:

- ✅ **Transparan** - Semua transaksi tercatat on-chain
- ✅ **Tidak dapat dimanipulasi** - Immutable blockchain records
- ✅ **Aman** - Smart contract yang telah diaudit
- ✅ **Adil** - Sistem distribusi otomatis berdasarkan kondisi yang disepakati
- ✅ **Modern** - Integrasi AI untuk konsultasi dan pembuatan perjanjian

### 🎓 Project Scope

Repository ini mencakup **2 komponen utama**:

1. **Frontend Web Application** (Root directory)
   - React + TypeScript + Vite
   - Web3 integration dengan ethers.js
   - UI/UX modern dengan Tailwind CSS
   - AI integration (Gemini AI)

2. **Smart Contracts** (`/smartcontract` directory)
   - Solidity smart contracts
   - Foundry development framework
   - Deployment scripts
   - Contract testing

---

## ✨ Fitur Utama

### 🔐 1. Perjanjian Digital On-Chain
- Buat perjanjian pranikah yang tercatat permanen di blockchain
- Sistem tanda tangan digital dengan wallet crypto
- Tidak dapat diubah atau dihapus setelah diaktifkan

### 💰 2. Dual Vault System
- **Brankas Pribadi**: Dana personal masing-masing pasangan
- **Brankas Bersama**: Dana bersama yang terkait dengan sertifikat pernikahan
- Escrow mechanism untuk mengunci dana sesuai perjanjian

### 🎨 3. NFT Sertifikat Pernikahan
- Sertifikat pernikahan dalam bentuk NFT (ERC-721)
- Desain unik yang di-generate dengan AI
- Metadata tersimpan di IPFS (terdesentralisasi)

### 🏦 4. Asset Virtualization
- Virtualisasi aset digital dalam bentuk NFT
- Kategori: Harta Pribadi & Harta Bersama
- Tracking dan manajemen aset on-chain

### 🤖 5. AI Advisor
- Konsultasi dengan Gemini AI untuk menyusun perjanjian
- Rekomendasi kondisi dan klausul yang adil
- Generate dokumen perjanjian otomatis

### ⚖️ 6. Claim System
- Klaim berdasarkan kondisi: Infidelity, KDRT, Financial, Custom
- Sistem mediator untuk penyelesaian sengketa
- Auto-distribution ke brankas pribadi masing-masing

---

## 🛠 Teknologi Stack

### Frontend
```
React 18.3          - UI Framework
TypeScript 5.5      - Type Safety
Vite 5.4            - Build Tool
Tailwind CSS 3.4    - Styling
ethers.js 6.13      - Web3 Library
React Router 6.26   - Routing
Recharts 2.12       - Data Visualization
```

### Smart Contracts
```
Solidity 0.8.20     - Smart Contract Language
Foundry             - Development Framework
OpenZeppelin 5.0    - Contract Libraries
Base Sepolia        - Testnet Deployment
```

### AI & Storage
```
Gemini AI           - AI Consultation & Content Generation
HuggingFace         - Image Generation (Stable Diffusion XL)
Pinata IPFS         - Decentralized Storage
```

### Blockchain
```
Base L2             - Layer 2 Ethereum (Optimistic Rollup)
Chain ID: 84532     - Base Sepolia Testnet
RPC: sepolia.base.org
```

---

## 🏗 Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Web3)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Generator │  │AI Advisor│  │  Vault   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│                   ┌──────▼──────┐                           │
│                   │ Web3Context │                           │
│                   └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  ethers.js  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│   SmartVow     │ │ Certificate │ │   AssetNFT      │
│   Contract     │ │     NFT     │ │   Contract      │
└───────┬────────┘ └──────┬──────┘ └────────┬────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Base L2    │
                    │  Blockchain │
                    └─────────────┘
```

---

## 📜 Smart Contracts

### 1. SmartVow.sol
**Address**: `0x00A263B85F7212BaBF0C1B1A542098D936bD14de`

Contract utama untuk:
- Manajemen perjanjian pranikah (vows)
- Dual vault system (personal & shared)
- Escrow mechanism
- Claim processing
- Mediator system

**Key Functions**:
```solidity
createVow()           // Buat perjanjian baru
signVow()             // Tanda tangan perjanjian
activateVow()         // Aktivasi dengan escrow
submitClaim()         // Submit klaim
resolveClaim()        // Resolve klaim (mediator)
depositPersonal()     // Deposit ke brankas pribadi
transferToShared()    // Transfer ke brankas bersama
```

### 2. MarriageCertificateNFT.sol
**Address**: `0x0B14D68b22A0fF8502E8e3eDeAD9f9DDE7212693`

NFT sertifikat pernikahan (ERC-721):
- Mint sertifikat untuk pasangan
- Auto-register ke SmartVow contract
- Metadata di IPFS
- Soulbound (tidak dapat ditransfer)

### 3. AssetNFT.sol
**Address**: `0x6c2F06bE4c384E5502319049b30Ab40467494368`

NFT untuk virtualisasi aset:
- Harta Pribadi (Personal)
- Harta Bersama (Joint)
- Partner linking on-chain
- Shared asset visibility

📖 **Dokumentasi Lengkap**: [SMARTVOW_API.md](./smartcontract/SMARTVOW_API.md)

---

## 🚀 Instalasi & Setup

### Prerequisites

- Node.js 18+ dan npm
- Git
- MetaMask atau wallet Web3 lainnya
- Foundry (untuk smart contract development)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/smartvow.git
cd smartvow
```

### 2. Install Dependencies

#### Frontend
```bash
npm install
```

#### Smart Contracts
```bash
cd smartcontract
forge install
cd ..
```

### 3. Environment Setup

Buat file `.env.local` di root directory:

```env
# Gemini AI (untuk AI Advisor)
VITE_GEMINI_API_KEY=your_gemini_api_key

# HuggingFace (untuk generate gambar NFT)
VITE_HUGGINGFACE_TOKEN=your_huggingface_token

# Pinata IPFS (untuk storage NFT)
VITE_PINATA_JWT=your_pinata_jwt

# Smart Contract Addresses (Base Sepolia)
VITE_SMARTVOW_ADDRESS=0x00A263B85F7212BaBF0C1B1A542098D936bD14de
VITE_CERTIFICATE_NFT_ADDRESS=0x0B14D68b22A0fF8502E8e3eDeAD9f9DDE7212693
VITE_ASSET_NFT_ADDRESS=0x6c2F06bE4c384E5502319049b30Ab40467494368
```

#### Cara Mendapatkan API Keys:

**Gemini AI**:
1. Kunjungi [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Buat API key baru
3. Copy dan paste ke `.env.local`

**HuggingFace**:
1. Daftar di [HuggingFace](https://huggingface.co/)
2. Buka Settings → Access Tokens
3. Create new token dengan role `read`

**Pinata IPFS**:
1. Daftar di [Pinata](https://app.pinata.cloud/)
2. API Keys → New Key
3. Copy JWT token

### 4. Run Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### 5. Setup Wallet

1. Install [MetaMask](https://metamask.io/)
2. Tambahkan Base Sepolia Testnet:
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency: `ETH`
   - Block Explorer: `https://sepolia.basescan.org`

3. Dapatkan testnet ETH dari [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

---

## 📖 Penggunaan

### 1. Hubungkan Wallet
- Klik tombol "Connect Wallet" di dashboard
- Approve koneksi di MetaMask
- Pastikan terhubung ke Base Sepolia network

### 2. Mint Marriage Certificate NFT
- Buka menu "Marriage Certificate"
- Isi data pasangan (nama, alamat wallet)
- Generate desain sertifikat dengan AI
- Mint NFT (bayar gas fee ~$0.50)

### 3. Buat Perjanjian Pranikah
- Buka menu "Smart Prenup"
- Gunakan AI Advisor untuk konsultasi
- Isi kondisi dan klausul perjanjian
- Set escrow amount
- Submit perjanjian

### 4. Tanda Tangan & Aktivasi
- Partner A: Sign perjanjian
- Partner B: Sign dan aktivasi (escrow dikunci dari shared vault)
- Perjanjian aktif dan tercatat on-chain

### 5. Kelola Vault
- Deposit ETH ke brankas pribadi
- Transfer ke brankas bersama
- Monitor saldo dan kontribusi masing-masing

### 6. Virtualisasi Aset
- Buka "Asset Virtualizer"
- Buat NFT untuk aset digital
- Pilih kategori: Harta Pribadi / Bersama
- Mint NFT aset

### 7. Klaim (jika diperlukan)
- Submit klaim dengan alasan dan bukti
- Mediator review dan putuskan
- Auto-distribution ke brankas pribadi

---

## 🌐 Deployment

### Frontend Deployment

#### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

#### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Smart Contract Deployment

```bash
cd smartcontract

# Set environment variables
cp .env.example .env
# Edit .env dengan private key dan RPC URL

# Deploy ke Base Sepolia
forge script script/Deploy.s.sol:DeployScript --rpc-url base-sepolia --broadcast --verify

# Verify contracts
forge verify-contract <CONTRACT_ADDRESS> src/SmartVow.sol:SmartVow --chain base-sepolia
```

---

## 🧪 Testing

### Frontend Tests
```bash
npm run test
```

### Smart Contract Tests
```bash
cd smartcontract
forge test
forge test -vvv  # Verbose output
forge coverage   # Coverage report
```

---

## 📁 Struktur Project

```
smartvow/
├── src/
│   ├── components/          # React components
│   │   ├── Logo.tsx
│   │   └── WalletButton.tsx
│   ├── contexts/            # React contexts
│   │   └── Web3Context.tsx
│   ├── services/            # Service layers
│   │   ├── web3Service.ts
│   │   ├── geminiService.ts
│   │   └── ipfsService.ts
│   ├── views/               # Page components
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Generator.tsx
│   │   ├── AIAdvisor.tsx
│   │   ├── AssetCreator.tsx
│   │   ├── Vault.tsx
│   │   ├── History.tsx
│   │   └── CertificateView.tsx
│   ├── App.tsx
│   ├── index.tsx
│   └── types.ts
├── smartcontract/           # Smart contracts
│   ├── src/
│   │   ├── SmartVow.sol
│   │   ├── MarriageCertificateNFT.sol
│   │   └── AssetNFT.sol
│   ├── script/              # Deployment scripts
│   ├── test/                # Contract tests
│   ├── CONTRACTS.md         # Contract documentation
│   └── SMARTVOW_API.md      # API documentation
├── public/
├── .env.local
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

### Development Guidelines

- Ikuti code style yang ada
- Tulis test untuk fitur baru
- Update dokumentasi jika diperlukan
- Pastikan semua test passing sebelum PR

---

## 🔒 Security

- Smart contracts telah diaudit secara internal
- Gunakan testnet untuk testing
- Jangan share private keys
- Report security issues ke: security@smartvow.xyz

---

## 📄 Lisensi

Project ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

## 👥 Tim

- **Developer**: [Your Name]
- **Smart Contract**: [Your Name]
- **UI/UX**: [Your Name]

---

## 🙏 Acknowledgments

- [Base](https://base.org/) - Layer 2 blockchain
- [OpenZeppelin](https://openzeppelin.com/) - Smart contract libraries
- [Gemini AI](https://ai.google.dev/) - AI integration
- [Pinata](https://pinata.cloud/) - IPFS storage
- [HuggingFace](https://huggingface.co/) - AI image generation

---

## 📞 Kontak & Support

- Website: [smartvow.xyz](#)
- Email: support@smartvow.xyz
- Twitter: [@SmartVow](#)
- Discord: [Join our community](#)

---

<div align="center">

**Built with ❤️ on Base L2**

[⬆ Back to Top](#-smartvow---blockchain-prenuptial-agreement-platform)

</div>
