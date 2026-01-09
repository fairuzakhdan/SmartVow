import { GoogleGenAI } from "@google/genai";
import { HfInference } from "@huggingface/inference";

// Use Vite environment variables
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const hfToken = import.meta.env.VITE_HUGGINGFACE_TOKEN || '';

// Debug: Log API key status
console.log('Gemini API Key status:', geminiApiKey ? `Set (${geminiApiKey.length} chars)` : 'NOT SET');
console.log('Hugging Face Token status:', hfToken ? `Set (${hfToken.length} chars)` : 'NOT SET');

if (!geminiApiKey) {
  console.warn('VITE_GEMINI_API_KEY is not set. AI text features will not work.');
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey });
const hf = new HfInference(hfToken);

// Models
const TEXT_MODEL = 'gemini-3-flash-preview';

/**
 * Generate image using Hugging Face Inference API (Stable Diffusion XL)
 */
const generateImageWithHuggingFace = async (prompt: string): Promise<string> => {
  if (!hfToken) {
    throw new Error('Hugging Face token not configured');
  }

  console.log('Generating image with Hugging Face SDXL');
  
  const blob = await hf.textToImage({
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    inputs: prompt,
    parameters: {
      width: 1024,
      height: 1024,
    }
  });

  // Convert blob to base64 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Get legal advice from AI
 */
export const getLegalAdvice = async (message: string, history: { role: 'user' | 'model', content: string }[]) => {
  console.log('getLegalAdvice called');
  
  if (!geminiApiKey) {
    throw new Error('API key tidak dikonfigurasi');
  }

  try {
    const systemPrompt = `Anda adalah SmartVow AI Legal Advisor/Mediator. 
Anda ahli dalam mediasi kontrak pernikahan digital, perjanjian pra nikah, dan pembagian aset berbasis blockchain. 
Bantu pengguna memahami istilah hukum, sarankan kondisi yang adil untuk smart vow mereka, dan jelaskan cara kerja escrow.
Bersikaplah suportif, profesional, dan jelas. Jawab dalam Bahasa Indonesia.
Disclaimer: Anda adalah AI, bukan pengacara berlisensi.

Pertanyaan: ${message}`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: systemPrompt,
    });

    console.log('Response received');
    return response.text || 'Maaf, tidak ada respons dari AI.';
  } catch (error: any) {
    console.error('getLegalAdvice error:', error);
    throw new Error(error.message || 'Gagal mendapatkan respons dari AI');
  }
};

/**
 * Generate smart contract conditions
 */
export const generateVowTemplate = async (needs: string) => {
  if (!geminiApiKey) {
    return getDefaultConditions(needs);
  }

  try {
    const prompt = `Kamu adalah ahli hukum pernikahan dan smart contract. Buatkan 3 klausul perjanjian pranikah berdasarkan kebutuhan pasangan berikut:

"${needs}"

Setiap klausul harus:
1. Judul singkat dan jelas (dalam Bahasa Indonesia)
2. Deskripsi hukum yang spesifik dan relevan dengan kebutuhan di atas
3. Persentase penalti/kompensasi untuk korban (51-100%)

Contoh jenis klausul yang bisa dibuat:
- Perlindungan dari KDRT (kekerasan fisik/psikis)
- Larangan perselingkuhan/ketidaksetiaan
- Transparansi keuangan
- Pembagian tanggung jawab rumah tangga
- Perlindungan aset pribadi
- Hak asuh anak
- Kewajiban nafkah
- Dan lainnya sesuai kebutuhan

PENTING: 
- Sesuaikan klausul dengan kebutuhan spesifik yang disebutkan
- Jangan gunakan klausul generic jika tidak relevan
- Balas HANYA dengan JSON array, tanpa markdown atau penjelasan tambahan

Format output:
[{"title": "Judul Klausul", "description": "Deskripsi lengkap klausul...", "penalty": 70}]`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });

    const text = response.text || '[]';
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error('generateVowTemplate error:', e);
    return getDefaultConditions(needs);
  }
};

function getDefaultConditions(needs?: string) {
  const input = (needs || '').toLowerCase();
  const originalInput = needs || '';
  const conditions: { title: string; description: string; penalty: number }[] = [];
  
  // Ekstrak kata-kata penting dari input
  const extractContext = (text: string) => {
    // Ambil detail spesifik dari input user
    const words = text.split(/[\s,\.]+/).filter(w => w.length > 3);
    return words.slice(0, 5).join(', ');
  };
  
  const context = extractContext(originalInput);

  // KDRT / Kekerasan
  if (input.includes('kdrt') || input.includes('kekerasan') || input.includes('pukul') || input.includes('tampar') || input.includes('fisik') || input.includes('psikis') || input.includes('emosi')) {
    const isPhysical = input.includes('fisik') || input.includes('pukul') || input.includes('tampar');
    const isPsychological = input.includes('psikis') || input.includes('emosi') || input.includes('mental');
    
    let desc = 'Jika terbukti melakukan ';
    if (isPhysical && isPsychological) {
      desc += 'kekerasan fisik (memukul, menampar, menyakiti) maupun psikis (intimidasi, penghinaan, ancaman)';
    } else if (isPhysical) {
      desc += 'kekerasan fisik seperti memukul, menampar, atau menyakiti secara fisik';
    } else if (isPsychological) {
      desc += 'kekerasan psikis seperti intimidasi, penghinaan verbal, atau tekanan mental';
    } else {
      desc += 'kekerasan dalam rumah tangga baik fisik maupun psikis';
    }
    desc += ', pihak pelaku wajib memberikan kompensasi penuh kepada korban dan kehilangan seluruh hak atas aset bersama.';
    
    conditions.push({ 
      title: isPhysical ? 'Perlindungan dari Kekerasan Fisik' : isPsychological ? 'Perlindungan dari Kekerasan Psikis' : 'Perlindungan dari KDRT', 
      description: desc, 
      penalty: 100 
    });
  }
  
  // Selingkuh / Perselingkuhan
  if (input.includes('selingkuh') || input.includes('setia') || input.includes('affair') || input.includes('wanita lain') || input.includes('pria lain') || input.includes('pihak ketiga') || input.includes('curang')) {
    let desc = 'Jika terbukti ';
    if (input.includes('wanita lain')) {
      desc += 'menjalin hubungan romantis atau intim dengan wanita lain';
    } else if (input.includes('pria lain')) {
      desc += 'menjalin hubungan romantis atau intim dengan pria lain';
    } else {
      desc += 'melakukan perselingkuhan atau hubungan romantis dengan pihak ketiga';
    }
    desc += ', pihak yang melanggar wajib memberikan kompensasi finansial dan kehilangan sebagian hak atas aset bersama.';
    
    conditions.push({ 
      title: 'Larangan Perselingkuhan', 
      description: desc, 
      penalty: 85 
    });
  }
  
  // Keuangan / Finansial
  if (input.includes('uang') || input.includes('keuangan') || input.includes('finansial') || input.includes('gaji') || input.includes('hutang') || input.includes('tabungan') || input.includes('investasi') || input.includes('pengeluaran')) {
    let desc = 'Kedua pihak wajib transparan dalam ';
    const aspects = [];
    if (input.includes('gaji') || input.includes('penghasilan')) aspects.push('penghasilan');
    if (input.includes('hutang')) aspects.push('hutang');
    if (input.includes('tabungan')) aspects.push('tabungan');
    if (input.includes('investasi')) aspects.push('investasi');
    if (input.includes('pengeluaran')) aspects.push('pengeluaran');
    
    if (aspects.length > 0) {
      desc += aspects.join(', ');
    } else {
      desc += 'pengelolaan keuangan bersama termasuk penghasilan, pengeluaran, dan hutang';
    }
    desc += '. Penyembunyian atau manipulasi keuangan akan dikenakan kompensasi kepada pihak yang dirugikan.';
    
    conditions.push({ 
      title: 'Transparansi Keuangan', 
      description: desc, 
      penalty: 65 
    });
  }
  
  // Anak / Hak Asuh
  if (input.includes('anak') || input.includes('asuh') || input.includes('custody') || input.includes('nafkah anak')) {
    let desc = 'Dalam hal perceraian, ';
    if (input.includes('nafkah')) {
      desc += 'pihak yang tidak mendapat hak asuh wajib memberikan nafkah anak sesuai kebutuhan. ';
    }
    desc += 'Hak asuh anak akan diberikan kepada pihak yang tidak melakukan pelanggaran perjanjian, dengan mempertimbangkan kepentingan terbaik anak.';
    
    conditions.push({ 
      title: 'Perlindungan Hak Anak', 
      description: desc, 
      penalty: 75 
    });
  }
  
  // Aset / Properti / Rumah
  if (input.includes('rumah') || input.includes('properti') || input.includes('aset') || input.includes('mobil') || input.includes('tanah') || input.includes('apartemen')) {
    const assets = [];
    if (input.includes('rumah')) assets.push('rumah');
    if (input.includes('mobil')) assets.push('mobil');
    if (input.includes('tanah')) assets.push('tanah');
    if (input.includes('apartemen')) assets.push('apartemen');
    
    let desc = 'Aset bersama ';
    if (assets.length > 0) {
      desc += `(${assets.join(', ')}) `;
    }
    desc += 'yang diperoleh selama pernikahan akan dibagi sesuai kontribusi masing-masing. Pihak yang melanggar perjanjian akan mendapat bagian lebih kecil atau kehilangan hak atas aset tersebut.';
    
    conditions.push({ 
      title: 'Pembagian Aset Bersama', 
      description: desc, 
      penalty: 70 
    });
  }
  
  // Pekerjaan / Karir
  if (input.includes('kerja') || input.includes('karir') || input.includes('resign') || input.includes('berhenti kerja') || input.includes('ibu rumah tangga')) {
    conditions.push({ 
      title: 'Dukungan Karir & Pekerjaan', 
      description: 'Kedua pihak saling mendukung perkembangan karir masing-masing. Jika salah satu pihak memutuskan menjadi ibu/bapak rumah tangga, kontribusi domestik dihargai setara dengan kontribusi finansial dalam pembagian aset.', 
      penalty: 60 
    });
  }
  
  // Keluarga / Mertua
  if (input.includes('mertua') || input.includes('keluarga') || input.includes('orang tua') || input.includes('tinggal bersama')) {
    conditions.push({ 
      title: 'Batasan Intervensi Keluarga', 
      description: 'Keputusan rumah tangga diambil bersama oleh kedua pasangan tanpa intervensi berlebihan dari keluarga besar. Kedua pihak berkomitmen menjaga batasan yang sehat dengan keluarga masing-masing.', 
      penalty: 55 
    });
  }
  
  // Komunikasi
  if (input.includes('komunikasi') || input.includes('bicara') || input.includes('diskusi') || input.includes('diam')) {
    conditions.push({ 
      title: 'Komitmen Komunikasi Terbuka', 
      description: 'Kedua pihak berkomitmen menjaga komunikasi yang terbuka dan jujur. Masalah diselesaikan melalui diskusi, bukan dengan diam atau menghindar.', 
      penalty: 50 
    });
  }
  
  // Agama / Ibadah
  if (input.includes('agama') || input.includes('ibadah') || input.includes('sholat') || input.includes('gereja') || input.includes('spiritual')) {
    conditions.push({ 
      title: 'Kebebasan Beribadah', 
      description: 'Kedua pihak saling menghormati keyakinan dan praktik keagamaan masing-masing. Tidak ada paksaan dalam hal ibadah atau praktik spiritual.', 
      penalty: 55 
    });
  }
  
  // Judi / Mabuk / Narkoba
  if (input.includes('judi') || input.includes('mabuk') || input.includes('alkohol') || input.includes('narkoba') || input.includes('drugs')) {
    const vices = [];
    if (input.includes('judi')) vices.push('perjudian');
    if (input.includes('mabuk') || input.includes('alkohol')) vices.push('konsumsi alkohol berlebihan');
    if (input.includes('narkoba') || input.includes('drugs')) vices.push('penggunaan narkoba');
    
    conditions.push({ 
      title: 'Larangan Perilaku Destruktif', 
      description: `Kedua pihak berkomitmen untuk tidak terlibat dalam ${vices.join(', ') || 'perilaku destruktif seperti judi, mabuk-mabukan, atau narkoba'}. Pelanggaran akan mengakibatkan kompensasi penuh kepada pasangan.`, 
      penalty: 90 
    });
  }
  
  // Jika tidak ada yang cocok, analisis input dan buat klausul custom
  if (conditions.length === 0) {
    // Buat klausul berdasarkan kata-kata dalam input
    const inputWords = originalInput.split(/[\s,\.]+/).filter(w => w.length > 2);
    
    if (inputWords.length > 0) {
      conditions.push({ 
        title: `Komitmen: ${inputWords.slice(0, 3).join(' ')}`, 
        description: `Berdasarkan kebutuhan "${originalInput.slice(0, 100)}", kedua pihak berkomitmen untuk saling menjaga dan menghormati kesepakatan ini. Pelanggaran akan dikenakan kompensasi sesuai tingkat kerugian.`, 
        penalty: 70 
      });
    }
    
    // Tambah klausul umum yang relevan
    conditions.push(
      { title: 'Komitmen Kesetiaan', description: 'Kedua pihak berkomitmen untuk saling setia dan tidak menjalin hubungan romantis dengan pihak ketiga selama pernikahan berlangsung.', penalty: 75 },
      { title: 'Perlindungan dari Kekerasan', description: 'Kedua pihak berkomitmen untuk tidak melakukan kekerasan fisik maupun psikis. Pelanggaran akan mengakibatkan kompensasi penuh kepada korban.', penalty: 100 },
      { title: 'Transparansi Keuangan', description: 'Kedua pihak wajib transparan dalam pengelolaan keuangan rumah tangga dan pengambilan keputusan finansial besar.', penalty: 60 }
    );
  }
  
  // Pastikan minimal 3 kondisi - tambahkan yang relevan dengan konteks
  if (conditions.length < 3) {
    // Klausul tambahan yang bisa ditambahkan berdasarkan konteks
    const additionalClauses = [
      { title: 'Komitmen Kesetiaan', description: 'Kedua pihak berkomitmen untuk saling setia dan menjaga kepercayaan selama pernikahan berlangsung.', penalty: 75, keywords: ['setia', 'percaya', 'cinta'] },
      { title: 'Saling Menghormati', description: 'Kedua pihak berkomitmen untuk saling menghormati, tidak merendahkan, dan menjaga martabat pasangan di depan umum maupun privat.', penalty: 60, keywords: ['hormati', 'harga', 'martabat'] },
      { title: 'Komunikasi Sehat', description: 'Kedua pihak berkomitmen menyelesaikan konflik melalui dialog yang sehat, tanpa kekerasan verbal atau silent treatment berkepanjangan.', penalty: 55, keywords: ['bicara', 'diskusi', 'konflik'] },
      { title: 'Tanggung Jawab Bersama', description: 'Kedua pihak berbagi tanggung jawab dalam urusan rumah tangga, pengasuhan anak, dan pengambilan keputusan penting.', penalty: 50, keywords: ['tanggung', 'bersama', 'rumah tangga'] },
      { title: 'Dukungan Emosional', description: 'Kedua pihak berkomitmen untuk saling mendukung secara emosional dalam suka maupun duka, dan tidak mengabaikan kebutuhan emosional pasangan.', penalty: 55, keywords: ['dukung', 'emosi', 'perasaan'] },
    ];
    
    // Prioritaskan klausul yang relevan dengan input
    const sortedClauses = additionalClauses
      .filter(c => !conditions.find(existing => existing.title === c.title))
      .sort((a, b) => {
        const aRelevance = a.keywords.some(k => input.includes(k)) ? 1 : 0;
        const bRelevance = b.keywords.some(k => input.includes(k)) ? 1 : 0;
        return bRelevance - aRelevance;
      });
    
    for (const clause of sortedClauses) {
      if (conditions.length >= 3) break;
      conditions.push({ title: clause.title, description: clause.description, penalty: clause.penalty });
    }
  }
  
  return conditions.slice(0, 3);
}

/**
 * Generate certificate vows
 */
export const generateCertificateVows = async (summary: string) => {
  const defaultVow = "Dengan cinta yang tulus dan komitmen yang teguh, kami berdua berjanji untuk saling setia, menjaga transparansi dalam setiap aspek kehidupan, dan melindungi hak satu sama lain. Janji ini kami ukir dalam blockchain yang abadi, sebagai saksi digital atas ikatan suci kami.";
  
  if (!geminiApiKey) return defaultVow;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Ubah ringkasan ini menjadi ikrar pernikahan yang formal dan puitis (60-80 kata, Bahasa Indonesia): "${summary}"`,
    });
    return response.text || defaultVow;
  } catch (e) {
    console.error('generateCertificateVows error:', e);
    return defaultVow;
  }
};

// Placeholder SVG for when AI image generation fails
const PLACEHOLDER_SEAL = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFD700"/><stop offset="50%" style="stop-color:#FFA500"/><stop offset="100%" style="stop-color:#FFD700"/></linearGradient></defs><circle cx="100" cy="100" r="90" fill="none" stroke="url(#gold)" stroke-width="8"/><circle cx="100" cy="100" r="70" fill="none" stroke="url(#gold)" stroke-width="3"/><path d="M100 40 L106 60 L128 60 L110 74 L118 95 L100 82 L82 95 L90 74 L72 60 L94 60 Z" fill="url(#gold)"/><text x="100" y="130" text-anchor="middle" font-family="serif" font-size="12" fill="#B8860B" font-weight="bold">SMARTVOW</text><text x="100" y="148" text-anchor="middle" font-family="serif" font-size="10" fill="#B8860B">CERTIFIED</text></svg>`)}`;

const generatePlaceholderAsset = (text: string): string => {
  // Sanitize text for SVG
  const sanitizedText = text.replace(/[<>&"']/g, '').slice(0, 25);
  const displayText = sanitizedText + (text.length > 25 ? '...' : '');
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e293b"/>
        <stop offset="100%" style="stop-color:#0f172a"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6366f1"/>
        <stop offset="100%" style="stop-color:#8b5cf6"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#fbbf24"/>
        <stop offset="100%" style="stop-color:#f59e0b"/>
      </linearGradient>
    </defs>
    <rect width="400" height="500" fill="url(#bg)"/>
    <rect x="30" y="30" width="340" height="440" rx="20" fill="none" stroke="url(#accent)" stroke-width="2" opacity="0.3"/>
    <rect x="50" y="80" width="300" height="200" rx="15" fill="url(#accent)" opacity="0.15"/>
    <circle cx="200" cy="160" r="60" fill="url(#accent)" opacity="0.3"/>
    <text x="200" y="175" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">NFT</text>
    <rect x="60" y="300" width="280" height="60" rx="10" fill="url(#accent)" opacity="0.1"/>
    <text x="200" y="335" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#e2e8f0" font-weight="bold">${displayText}</text>
    <line x1="80" y1="390" x2="320" y2="390" stroke="url(#gold)" stroke-width="2" opacity="0.5"/>
    <text x="200" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#6366f1" font-weight="bold">SMARTVOW ASSET</text>
    <text x="200" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#94a3b8">Base Network • Verified</text>
    <circle cx="200" cy="470" r="8" fill="url(#gold)" opacity="0.8"/>
  </svg>`;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Generate certificate seal image using Hugging Face
 */
export const generateCertificateSeal = async (): Promise<string> => {
  if (!hfToken) {
    console.log('No Hugging Face token, using placeholder seal');
    return PLACEHOLDER_SEAL;
  }

  try {
    console.log('Generating certificate seal with Hugging Face');
    
    const prompt = 'premium golden holographic marriage certificate official seal stamp, intricate geometric blockchain circuit patterns, 3D metallic gold with iridescent rainbow shimmer, ornate victorian decorative border, centered on pure white background, ultra detailed digital art, 8k quality, professional design';
    
    return await generateImageWithHuggingFace(prompt);
  } catch (e) {
    console.error('generateCertificateSeal error:', e);
    return PLACEHOLDER_SEAL;
  }
};

/**
 * Generate beautiful marriage certificate NFT image
 */
export const generateCertificateNFTImage = async (
  partnerAName: string,
  partnerBName: string
): Promise<string> => {
  try {
    console.log('Generating certificate NFT image');
    
    const prompt = `elegant digital marriage certificate NFT artwork, romantic couple silhouette, golden ornate frame with floral decorations, blockchain holographic seal, names "${partnerAName}" and "${partnerBName}" in elegant calligraphy, soft pink and gold color palette, ethereal light rays, hearts and roses decorations, premium luxury wedding invitation style, dark elegant background with sparkles, ultra detailed 8k render, artstation quality`;
    
    return await generateImageWithHuggingFace(prompt);
  } catch (e) {
    console.error('generateCertificateNFTImage error:', e);
    // Return a nice placeholder certificate
    return generateCertificatePlaceholder(partnerAName, partnerBName);
  }
};

/**
 * Generate placeholder certificate SVG
 */
const generateCertificatePlaceholder = (partnerA: string, partnerB: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e1b4b"/>
        <stop offset="100%" style="stop-color:#312e81"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#fbbf24"/>
        <stop offset="50%" style="stop-color:#f59e0b"/>
        <stop offset="100%" style="stop-color:#fbbf24"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <rect x="40" y="40" width="720" height="520" rx="20" fill="none" stroke="url(#gold)" stroke-width="4"/>
    <rect x="60" y="60" width="680" height="480" rx="15" fill="none" stroke="url(#gold)" stroke-width="1" opacity="0.5"/>
    <text x="400" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#fbbf24" letter-spacing="8">SMARTVOW PROTOCOL</text>
    <text x="400" y="180" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="white" font-weight="bold">Marriage Certificate</text>
    <line x1="200" y1="210" x2="600" y2="210" stroke="url(#gold)" stroke-width="2"/>
    <text x="400" y="280" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="white">${partnerA}</text>
    <text x="400" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#fbbf24">&amp;</text>
    <text x="400" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="white">${partnerB}</text>
    <circle cx="400" cy="480" r="40" fill="none" stroke="url(#gold)" stroke-width="3"/>
    <text x="400" y="485" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#fbbf24">VERIFIED</text>
    <text x="400" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="#fbbf24">ON-CHAIN</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Generate asset specification (tanpa AI - langsung dari input)
 */
export const generateAssetSpec = async (prompt: string) => {
  // Generate spec langsung dari input user tanpa Gemini
  const words = prompt.split(' ').filter(w => w.length > 2);
  const name = prompt.slice(0, 50);
  const symbol = words.slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'NFT';
  
  return { 
    name: name, 
    symbol: symbol,
    assetClass: "NFT", 
    utility: `Sertifikat kepemilikan digital untuk ${prompt}. Tercatat di blockchain Base sebagai bukti kepemilikan yang sah.` 
  };
};

/**
 * Generate asset image using Hugging Face (with fallback to placeholder)
 */
export const generateAssetImage = async (prompt: string): Promise<string> => {
  // Check if HF token is available
  if (!hfToken) {
    console.log('No Hugging Face token, using placeholder');
    return generatePlaceholderAsset(prompt);
  }

  try {
    console.log('Generating asset image for:', prompt);
    
    // Create NFT-style prompt based on user input
    const imagePrompt = `3D isometric NFT digital certificate artwork of ${prompt}, futuristic blockchain holographic style, glowing neon blue and cyan colors, floating on dark hexagonal platform with ethereal light rays, NFT badge icon visible, professional crypto asset design, dark navy background, ultra detailed 8k render, artstation quality`;
    
    const result = await generateImageWithHuggingFace(imagePrompt);
    return result;
  } catch (e: any) {
    console.error('generateAssetImage error:', e?.message || e);
    // Always return placeholder on error - never null
    return generatePlaceholderAsset(prompt);
  }
};

/**
 * Verify claim document
 */
export const verifyClaimDocument = async (documentDescription: string, claimType: string) => {
  const defaultResult = { isValid: false, confidence: 0, analysis: 'Gagal memproses', recommendation: 'Hubungi mediator' };
  
  if (!geminiApiKey) return defaultResult;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Analisis dokumen klaim (${claimType}): ${documentDescription}. Balas HANYA JSON: {"isValid": true/false, "confidence": 0-100, "analysis": "...", "recommendation": "..."}`,
    });
    const text = response.text || '{}';
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    return defaultResult;
  }
};

/**
 * Generate mediation summary
 */
export const generateMediationSummary = async (chatHistory: { role: 'user' | 'model', content: string }[]) => {
  if (!geminiApiKey) throw new Error('API key tidak dikonfigurasi');

  try {
    const historyText = chatHistory.map(m => `${m.role === 'user' ? 'Pengguna' : 'Mediator'}: ${m.content}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Buatkan ringkasan mediasi dari percakapan berikut dalam Bahasa Indonesia:\n\n${historyText}`,
    });
    return response.text || 'Gagal membuat ringkasan';
  } catch (e: any) {
    throw new Error(e.message || 'Gagal membuat ringkasan');
  }
};
