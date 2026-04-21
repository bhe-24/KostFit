import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hanya menerima method POST' });
  }

  // Menerima data waktu (Pagi/Siang/Sore/Malam) dari frontend
  const { waktu } = req.body;
  const waktuMakan = waktu || "Siang";

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // PROMPT KETAT: Memaksa AI mengembalikan Array JSON
  const prompt = `Kamu adalah ahli gizi untuk anak kost yang ingin hidup sehat dengan budget terbatas.
  Berikan rekomendasi menu makan ${waktuMakan} yang terdiri dari 3 jenis: Makanan Utama, Minuman, dan Camilan.
  
  ATURAN MUTLAK (DILARANG DILANGGAR):
  1. HANYA KELUARKAN FORMAT JSON ARRAY. 
  2. DILARANG menambahkan teks, markdown, atau tag HTML apa pun.
  3. Format JSON wajib persis seperti ini (array berisi 3 objek):
  [
    { "jenis": "🍛 Makanan Utama", "menu": "Nama Makanan", "cal": angka_kalori_bulat, "pro": "Xg", "fat": "Yg" },
    { "jenis": "🥤 Minuman", "menu": "Nama Minuman", "cal": angka_kalori_bulat, "pro": "Xg", "fat": "Yg" },
    { "jenis": "🍎 Camilan", "menu": "Nama Camilan", "cal": angka_kalori_bulat, "pro": "Xg", "fat": "Yg" }
  ]`;

  // Sistem Fallback Model
  const modelsToTry = ['gemini-2.5-flash', 'gemma-4-26b-it'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Pembersihan Ekstra
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      text = text.replace(/<[^>]*>?/gm, ''); 
      
      const data = JSON.parse(text);

      // Berhasil, langsung kirim JSON Array ke frontend
      return res.status(200).json(data);

    } catch (error) {
      console.warn(`Gagal dengan model ${modelName}`, error.message);
      lastError = error;
    }
  }

  console.error("Semua model AI gagal:", lastError);
  res.status(500).json({ error: 'Gagal menyusun menu.' });
}
