import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import youtubedl from 'youtube-dl-exec';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.argv[2];

if (!url) {
  console.error("URL tidak diberikan!");
  process.exit(1);
}

// Proxy rotation
const rawProxies = [
  "31.59.20.176:6754:aqrbexpf:7xtkixw6r2t9",
  "31.56.127.193:7684:aqrbexpf:7xtkixw6r2t9",
  "45.38.107.97:6014:aqrbexpf:7xtkixw6r2t9",
  "38.154.203.95:5863:aqrbexpf:7xtkixw6r2t9",
  "198.105.121.200:6462:aqrbexpf:7xtkixw6r2t9",
  "64.137.96.74:6641:aqrbexpf:7xtkixw6r2t9",
  "198.23.243.226:6361:aqrbexpf:7xtkixw6r2t9",
  "38.154.185.97:6370:aqrbexpf:7xtkixw6r2t9",
  "142.111.67.146:5611:aqrbexpf:7xtkixw6r2t9",
  "191.96.254.138:6185:aqrbexpf:7xtkixw6r2t9"
];
const proxies = rawProxies.map(p => {
  const [host, port, user, pass] = p.split(':');
  return `http://${user}:${pass}@${host}:${port}`;
});

function getRelativeTime(uploadDate) {
  if (!uploadDate || uploadDate.length !== 8) return 'Tidak diketahui';
  const date = new Date(
    parseInt(uploadDate.substring(0, 4)),
    parseInt(uploadDate.substring(4, 6)) - 1,
    parseInt(uploadDate.substring(6, 8))
  );
  const diffDays = Math.floor(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hari ini';
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} minggu yang lalu`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} bulan yang lalu`;
  return `${Math.floor(diffDays / 365)} tahun yang lalu`;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  if (typeof seconds === 'string' && seconds.includes(':')) return seconds;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function extract() {
  try {
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const maskedProxy = randomProxy.replace(/:[^:@]+@/, ':***@');
    
    console.log(`Extracting data for: ${url}`);
    console.log(`Using Proxy: ${maskedProxy}`);
    
    // Trik Arroxy (Lapis 2): default fallback dengan memblokir jalur web sepenuhnya
    const ytOptions = {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      skipDownload: true, 
      proxy: randomProxy,
      extractorArgs: 'youtube:player_client=default,-web,-web_safari' // <- RAHASIA ARROXY
    };

    const result = await youtubedl(url, ytOptions);
    const formats = result.formats || [];
    
    const combinedFormats = formats
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const videoUrl = result.url || (combinedFormats.length > 0 ? combinedFormats[0].url : '');
    
    const audioFormats = formats
      .filter(f => f.vcodec === 'none' && f.acodec !== 'none')
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));
    const audioUrl = audioFormats.length > 0 ? audioFormats[0].url : '';

    const output = {
      success: true,
      type: 'video',
      metadata: {
        thumbnail: result.thumbnail || '',
        title: result.title || 'Unknown',
        channelName: result.uploader || result.channel || 'Unknown',
        likes: result.like_count || 0,
        duration: formatDuration(result.duration),
        profilePicture: '',
        uploadDate: getRelativeTime(result.upload_date)
      },
      links: {
        video: videoUrl,
        audio: audioUrl
      },
      lastUpdated: new Date().toISOString()
    };

    const outputFile = join(__dirname, 'result.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    
    console.log("Success! Data saved to result.json");
  } catch (error) {
    console.error("Extraction failed:", error.message);
    const errorOutput = {
      success: false,
      message: "Gagal mengekstrak data.",
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
    const outputFile = join(__dirname, 'result.json');
    fs.writeFileSync(outputFile, JSON.stringify(errorOutput, null, 2));
    process.exit(1);
  }
}

extract();
