# SmartVow - Perjanjian Pra Nikah Smart Contract

Smart contract untuk mengelola perjanjian pra nikah secara terdesentralisasi di Base blockchain.

## Fitur

- **SmartVow.sol**: Contract utama untuk perjanjian pra nikah
  - Pembuatan perjanjian antara dua pihak
  - Kondisi pelanggaran (Infidelity, KDRT, Financial, Custom)
  - Sistem escrow dengan ETH
  - Mediator untuk penyelesaian sengketa

- **MarriageCertificateNFT.sol**: NFT Sertifikat Pernikahan
  - ERC-721 standard
  - Menyimpan ikrar pernikahan on-chain
  - Link ke SmartVow contract

## Setup

```bash
# Install Foundry (jika belum)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
cd smartcontract
forge install foundry-rs/forge-std
forge install transmissions11/solmate

# Copy env
cp .env.example .env
# Edit .env dengan private key dan API keys
```

## Commands

```bash
# Build
forge build

# Test
forge test -vvv

# Deploy SmartVow ke Base Sepolia
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# Deploy NFT Contract (setelah SmartVow di-deploy)
SMARTVOW_ADDRESS=0x_YOUR_SMARTVOW_ADDRESS forge script script/DeployNFT.s.sol --rpc-url base_sepolia --broadcast --verify
```

## Contract Flow

### SmartVow
1. `createVow()` - Partner A membuat perjanjian
2. `addCondition()` - Tambahkan kondisi pelanggaran
3. `signVow()` - Kedua pihak menandatangani
4. `depositAndActivate()` - Deposit escrow dan aktivasi
5. `reportBreach()` - Mediator melaporkan pelanggaran
6. `resolveDispute()` - Distribusi escrow

### MarriageCertificateNFT
1. `mintCertificate()` - Mint sertifikat pernikahan NFT
2. `getCertificate()` - Lihat detail sertifikat
3. `getUserCertificates()` - Lihat semua sertifikat user
