import express from 'express';
import yts from 'yt-search';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getFallbackRoutes(carType: string, fuelType: string, departure: any, destination: any) {
  const depLat = parseFloat(departure.lat);
  const depLon = parseFloat(departure.lon);
  const destLat = parseFloat(destination.lat);
  const destLon = parseFloat(destination.lon);

  let distanceKm = 100;
  let durationSec = 7200;
  let durationStr = "2 giờ 15 phút";
  const hasValidCoordinates = !isNaN(depLat) && !isNaN(depLon) && !isNaN(destLat) && !isNaN(destLon);

  if (hasValidCoordinates) {
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${depLon},${depLat};${destLon},${destLat}?overview=false`;
      const response = await fetch(url, { headers: { 'User-Agent': 'aistudio-build' } });
      const data = await response.json();
      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        durationSec = route.duration;
        const hrs = Math.floor(durationSec / 3600);
        const mins = Math.round((durationSec % 3600) / 60);
        durationStr = hrs > 0 ? `${hrs} giờ ${mins} phút` : `${mins} phút`;
      } else {
        throw new Error("No route found in OSRM response");
      }
    } catch (e) {
      const R = 6371;
      const dLat = (destLat - depLat) * Math.PI / 180;
      const dLon = (destLon - depLon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(depLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceDirect = R * c;
      distanceKm = Math.round(distanceDirect * 1.35 * 10) / 10;
      
      const speedKmh = 55;
      const hrs = Math.floor(distanceKm / speedKmh);
      const mins = Math.round((distanceKm % speedKmh) / speedKmh * 60);
      durationStr = hrs > 0 ? `${hrs} giờ ${mins} phút` : `${mins} phút`;
    }
  }

  let proposedRate = 14000;
  let lowestRate = 11000;
  if (carType.includes('7')) {
    proposedRate = 16500;
    lowestRate = 13000;
  } else if (carType.includes('16')) {
    proposedRate = 22500;
    lowestRate = 18000;
  }

  if (fuelType === 'Điện') {
    proposedRate = Math.round(proposedRate * 0.93 / 100) * 100;
    lowestRate = Math.round(lowestRate * 0.93 / 100) * 100;
  }

  let tollFeeA = 0;
  let tollBoothsA: Array<{name: string, fee: number}> = [];
  
  const depName = departure.display_name.split(',')[0].trim();
  const destName = destination.display_name.split(',')[0].trim();

  if (distanceKm > 30) {
    if (distanceKm < 100) {
      tollFeeA = 35000;
      tollBoothsA.push({ name: `Trạm BOT ${depName} - ${destName}`, fee: 35000 });
    } else if (distanceKm < 200) {
      tollFeeA = 80000;
      tollBoothsA.push({ name: `Trạm Pháp Vân - Cầu Giẽ (qua ${depName})`, fee: 45000 });
      tollBoothsA.push({ name: `Trạm BOT Quốc Lộ dọc tuyến`, fee: 35000 });
    } else {
      tollFeeA = 160000;
      tollBoothsA.push({ name: `Trạm BOT Cao Tốc Liên Tỉnh`, fee: 90000 });
      tollBoothsA.push({ name: `Trạm Thu Phí BOT Cửa Ngõ`, fee: 35000 });
      tollBoothsA.push({ name: `Trạm kiểm soát quốc lộ (BOT)`, fee: 35000 });
    }
  }

  const baseCostProposedA = distanceKm * proposedRate;
  const baseCostLowestA = distanceKm * lowestRate;
  
  const proposedPriceA = Math.round((baseCostProposedA + tollFeeA) / 1000) * 1000;
  const lowestPriceA = Math.round((baseCostLowestA + tollFeeA) / 1000) * 1000;

  const kmsB = Math.round(distanceKm * 1.12 * 10) / 10;
  const rawDurationB = Math.round((distanceKm / 40) * 60);
  const hrsB = Math.floor(rawDurationB / 60);
  const minsB = Math.round(rawDurationB % 60);
  const durationStrB = hrsB > 0 ? `${hrsB} giờ ${minsB} phút` : `${minsB} phút`;

  const baseCostProposedB = kmsB * proposedRate;
  const baseCostLowestB = kmsB * lowestRate;
  
  const proposedPriceB = Math.round(baseCostProposedB / 1000) * 1000;
  const lowestPriceB = Math.round(baseCostLowestB / 1000) * 1000;

  const notesA = fuelType === 'Điện'
    ? `Tuyến đường cao tốc thông thoáng giúp xe điện ${carType} tối ưu hóa tiêu chuẩn sạc dòng tái sinh, duy trì hiệu năng pin ổn định và tiết kiệm thời gian nhất.`
    : `Tuyến đường đi nhanh, có đi qua cao tốc chất lượng tốt, giúp tiết kiệm thời gian hành trình lý tưởng cho loại xe xăng ${carType}.`;

  const notesB = fuelType === 'Điện'
    ? `Tuyến quốc lộ nội đô/ngoại thành tránh hoàn toàn trạm thu phí cao tốc. Xe điện ${carType} di chuyển tốc độ trung bình sẽ tiết kiệm điện cực tốt nhờ cơ chế phanh tái sinh trong đô thị.`
    : `Lộ trình quốc lộ miễn phí cầu đường, giúp tiết kiệm phí trạm tối đa. Tuy nhiên chất lượng mặt đường ở mức khá và tốc độ trung bình thấp hơn tuyến cao tốc.`;

  return [
    {
      name: `Tuyến Cao Tốc chất lượng cao (Tối ưu nhất)`,
      distance: distanceKm,
      duration: durationStr,
      tollBooths: tollBoothsA,
      totalTollFee: tollFeeA,
      proposedPrice: proposedPriceA,
      lowestPrice: lowestPriceA,
      note: notesA
    },
    {
      name: `Tuyến Quốc Lộ Tránh Trạm BOT (Cực kỳ tiết kiệm)`,
      distance: kmsB,
      duration: durationStrB,
      tollBooths: [],
      totalTollFee: 0,
      proposedPrice: proposedPriceB,
      lowestPrice: lowestPriceB,
      note: notesB
    }
  ];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/search', async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      const results = await yts(q);
      res.json(results.videos.slice(0, 40));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

  app.get('/api/trending', async (req, res) => {
    try {
      const results = await yts('trending');
      res.json(results.videos.slice(0, 40));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load explore data' });
    }
  });

  app.post('/api/calculate-fare', async (req, res) => {
    try {
      const { carType, fuelType, departureLocation, destinationLocation } = req.body;
      
      if (!departureLocation || !destinationLocation) {
        return res.status(400).json({ error: 'Điểm xuất phát và điểm đến là bắt buộc.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not defined. Switch to OSRM smart logic directly.");
        const fallbackData = await getFallbackRoutes(carType, fuelType, departureLocation, destinationLocation);
        return res.json(fallbackData);
      }

      try {
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const responseSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              distance: { type: Type.NUMBER },
              duration: { type: Type.STRING },
              tollBooths: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    fee: { type: Type.INTEGER }
                  },
                  required: ["name", "fee"]
                }
              },
              totalTollFee: { type: Type.INTEGER },
              proposedPrice: { type: Type.INTEGER },
              lowestPrice: { type: Type.INTEGER },
              note: { type: Type.STRING }
            },
            required: ["name", "distance", "duration", "tollBooths", "totalTollFee", "proposedPrice", "lowestPrice", "note"]
          }
        };

        const prompt = `Bạn là chuyên gia tính cước vận tải tại Việt Nam. Hãy tính toán chính xác cước phí vận chuyển thực tế dựa trên thông tin sau:
- Loại xe: ${carType}, Hệ thống động lực: ${fuelType}
- Điểm xuất phát: ${departureLocation.display_name}
- Điểm đến: ${destinationLocation.display_name}

Yêu cầu ước lượng 2-3 tuyến đường (Cao tốc tối ưu nhanh nhất, Quốc lộ tránh trạm). Phí cầu đường theo biểu giá thực tế xe ${carType} tại VN. Giá proposedPrice là giá thu khách, lowestPrice là giá bảo hòa vốn/lãi mỏng để tài xế hoạt động ổn định.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1,
          }
        });

        const text = response.text;
        if (text) {
          return res.json(JSON.parse(text));
        } else {
          throw new Error("Không thể trích xuất kết quả từ Gemini.");
        }
      } catch (geminiError: any) {
        console.error("Gemini calculate-fare error:", geminiError.message || geminiError);
        const fallbackData = await getFallbackRoutes(carType, fuelType, departureLocation, destinationLocation);
        return res.json(fallbackData);
      }
    } catch (error: any) {
      console.error("General calculate-fare endpoint error:", error);
      res.status(500).json({ error: error.message || 'Lỗi hệ thống khi dự toán.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
