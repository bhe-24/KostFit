import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Hanya menerima metode POST dari chat.html
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hanya menerima method POST' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  try {
    // Mengambil API Key dari Environment Variables Vercel
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Kita pakai model gemini-pro atau gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); 

    // Prompt khusus agar AI menjadi JSON generator
    const prompt = `Kamu adalah asisten pencatat diet dan keuangan untuk anak kost.
    Tugasmu mengekstrak informasi dari kalimat berikut: "${message}"
    
    Keluarkan balasannya HANYA dalam format JSON dengan struktur yang persis seperti ini:
    {
      "kategori": "makanan" atau "pengeluaran_lain",
      "item": "nama makanan atau barang",
      "harga": angka bulat (tanpa Rp atau titik, isi 0 jika tidak ada),
      "kalori_estimasi": angka bulat (estimasi kalori, isi 0 jika bukan makanan)
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Membersihkan teks barangkali AI membalas dengan format markdown ```json ... ```
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    // Kirim data JSON kembali ke frontend
    res.status(200).json(data);

  } catch (error) {
    console.error("Error AI:", error);
    res.status(500).json({ error: 'Waduh, AI-nya lagi pusing nih. Gagal memproses.' });
  }
}
