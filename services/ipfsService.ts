/**
 * IPFS Service - Upload files to IPFS via Pinata
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';

/**
 * Convert base64 data URL to Blob
 */
const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Upload image to IPFS via Pinata
 */
export const uploadToIPFS = async (imageDataURL: string): Promise<string> => {
  // If no API key, use mock IPFS URI (for testing)
  if (!PINATA_JWT) {
    console.warn('Pinata JWT not set, using mock IPFS URI');
    const mockCID = `bafkreig${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    return `ipfs://${mockCID}`;
  }

  try {
    const blob = dataURLtoBlob(imageDataURL);
    const formData = new FormData();
    formData.append('file', blob, `certificate-${Date.now()}.png`);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('IPFS upload success:', data);
    
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
};

/**
 * Upload NFT metadata to IPFS via Pinata
 */
export const uploadMetadataToIPFS = async (metadata: {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}): Promise<string> => {
  if (!PINATA_JWT) {
    console.warn('Pinata JWT not set, using mock IPFS URI');
    const mockCID = `bafkreim${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    return `ipfs://${mockCID}`;
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}.json`
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Metadata IPFS upload success:', data);
    
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error('Metadata IPFS upload error:', error);
    throw error;
  }
};

/**
 * Create and upload complete NFT metadata for marriage certificate
 */
export const createCertificateMetadata = async (
  imageDataURL: string,
  partnerAName: string,
  partnerBName: string,
  partnerAAddress: string,
  partnerBAddress: string,
  vows: string,
  date: Date
): Promise<string> => {
  // Upload image first
  console.log('Uploading certificate image to IPFS...');
  const imageURI = await uploadToIPFS(imageDataURL);
  console.log('Image uploaded:', imageURI);

  // Create metadata
  const metadata = {
    name: `SmartVow Marriage Certificate - ${partnerAName} & ${partnerBName}`,
    description: `Official on-chain marriage certificate between ${partnerAName} and ${partnerBName}. Minted on Base blockchain via SmartVow Protocol.`,
    image: imageURI,
    external_url: 'https://smartvow.xyz',
    attributes: [
      { trait_type: 'Partner A', value: partnerAName },
      { trait_type: 'Partner B', value: partnerBName },
      { trait_type: 'Partner A Address', value: partnerAAddress },
      { trait_type: 'Partner B Address', value: partnerBAddress },
      { trait_type: 'Marriage Date', value: date.toISOString().split('T')[0] },
      { trait_type: 'Network', value: 'Base Sepolia' },
      { trait_type: 'Protocol', value: 'SmartVow' },
      { trait_type: 'Certificate Type', value: 'Marriage' },
    ],
  };

  // Upload metadata
  console.log('Uploading metadata to IPFS...');
  const metadataURI = await uploadMetadataToIPFS(metadata);
  console.log('Metadata uploaded:', metadataURI);

  return metadataURI;
};

/**
 * Create and upload complete NFT metadata for digital asset
 * Returns both metadata URI and image URI
 */
export const createAssetMetadata = async (
  imageDataURL: string,
  name: string,
  symbol: string,
  assetClass: string,
  utility: string,
  creatorAddress: string,
  ownership?: string,
  category?: string
): Promise<{ metadataURI: string; imageURI: string }> => {
  // Upload image first
  console.log('Uploading asset image to IPFS...');
  const imageURI = await uploadToIPFS(imageDataURL);
  console.log('Image uploaded:', imageURI);

  // Create metadata with ownership info
  const metadata = {
    name: name,
    description: utility,
    image: imageURI,
    external_url: 'https://smartvow.xyz',
    attributes: [
      { trait_type: 'Symbol', value: symbol },
      { trait_type: 'Asset Class', value: assetClass },
      { trait_type: 'Creator', value: creatorAddress },
      { trait_type: 'Network', value: 'Base Sepolia' },
      { trait_type: 'Protocol', value: 'SmartVow' },
      { trait_type: 'Created At', value: new Date().toISOString().split('T')[0] },
      // Store ownership info in metadata so it persists even if localStorage is cleared
      { trait_type: 'Ownership', value: ownership || 'Harta Bersama' },
      { trait_type: 'Category', value: category || assetClass },
    ],
  };

  // Upload metadata
  console.log('Uploading asset metadata to IPFS...');
  const metadataURI = await uploadMetadataToIPFS(metadata);
  console.log('Metadata uploaded:', metadataURI);

  return { metadataURI, imageURI };
};
