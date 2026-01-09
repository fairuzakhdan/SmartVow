
export enum VowStatus {
  DRAFT = 'Draft',
  PENDING_SIGNATURE = 'Pending Signatures',
  ACTIVE = 'Active on Chain',
  BREACHED = 'Breach Detected',
  RESOLVED = 'Resolved',
  TERMINATED = 'Terminated'
}

// Mapping dari contract status (number) ke VowStatus
export const contractStatusToVowStatus = (status: number): VowStatus => {
  const mapping: Record<number, VowStatus> = {
    0: VowStatus.DRAFT,
    1: VowStatus.PENDING_SIGNATURE,
    2: VowStatus.ACTIVE,
    3: VowStatus.BREACHED,
    4: VowStatus.RESOLVED,
    5: VowStatus.TERMINATED
  };
  return mapping[status] || VowStatus.DRAFT;
};

export interface VowCondition {
  id: string;
  type: 'Infidelity' | 'KDRT' | 'Financial' | 'Custom';
  description: string;
  penaltyPercentage: number;
}

export interface SmartVow {
  id: string;
  partnerA: string;
  partnerB: string;
  escrowBalance: number;
  conditions: VowCondition[];
  status: VowStatus;
  createdAt: string;
  txHash?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Interface representing a digital asset in the marriage vault.
 */
export interface VaultAsset {
  id: number;
  name: string;
  amount?: string;
  type: string;
  icon: string;
  isUserGenerated: boolean;
  symbol?: string;
  date?: string;
  category?: string;
  ownership?: string;
  txHash?: string;
  tokenId?: number;
  onChain?: boolean;
}
