import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hanya menerima method POST' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // PROMPT KETAT: Memaksa AI menjadi asisten gaul dan melarang keras HTML
  const prompt = `Kamu adalah asisten pengatur diet dan keuangan yang ramah dan asik untuk anak kost.
  Tugasmu mengekstrak informasi dari input user: "${message}"

  ATURAN MUTLAK (DILARANG DILANGGAR):
  1. HANYA KELUARKAN FORMAT JSON. 
  2. DILARANG KERAS menambahkan teks pembuka/penutup, markdown, atau tag HTML apa pun.
  3. Format JSON wajib seperti ini:
  {
    "kategori": "makanan" atau "lain-lain",
    "item": "Nama makanan/barang singkat",
    "harga": angka bulat (isi 0 jika tidak ada harga),
    "kalori_estimasi": angka bulat (isi 0 jika bukan makanan),
    "pesan_balasan": "Sapa user dengan ramah. Konfirmasi apa yang dicatat dan harganya. Jika itu makanan, beritahu estimasi kalorinya dan berikan sedikit saran diet ringan atau pujian hemat ala anak kost."
  }`;

  // Daftar model yang akan dicoba berurutan (Fallback System)
  // Catatan: gemma-2-9b-it adalah versi Gemma terbaru yang tersedia di API Google saat ini
  const modelsToTry = ['gemini-2.5-flash', 'gemma-4-26b-it'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Pembersihan Ekstra: Membuang semua halusinasi HTML/Markdown jika AI bandel
      text = text.replace(/```json/g, '').replace(/```/g, ''); // Buang bungkus markdown
      text = text.replace(/<[^>]*>?/gm, ''); // Buang semua tag HTML jika ada
      
      const data = JSON.parse(text.trim());

      // Jika berhasil di-parse jadi JSON, langsung kirim dan hentikan loop
      return res.status(200).json(data);

    } catch (error) {
      console.warn(`Gagal menggunakan model ${modelName}, mencoba model selanjutnya...`, error.message);
      lastError = error;
    }
  }

  // Jika semua model gagal
  console.error("Semua model AI gagal:", lastError);
  res.status(500).json({ error: 'AI sedang kebingungan nih. Coba lagi ya!' });
}
