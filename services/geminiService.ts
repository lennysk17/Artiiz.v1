
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateReviewResponse = async (reviewText: string, author: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tu es un expert plombier professionnel et courtois chez Artiiz. 
                 Rédige une réponse courte (2-3 phrases) et chaleureuse à cet avis client : 
                 "${reviewText}" de la part de ${author}. 
                 Reste pro, remercie le client et montre ton expertise.`,
    });
    return response.text || "Merci pour votre confiance ! Nous sommes ravis d'avoir pu vous aider.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Merci pour votre retour positif ! Au plaisir de vous revoir.";
  }
};

export const analyzeLocalMarket = async (address: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Tu es Lia, l'intelligence d'Artiiz pour plombiers en Île-de-France. 
                 Ton rôle est de faire de la Business Intelligence prédictive pour l'adresse suivante : ${address}.
                 
                 Ta mission est de corréler le climat actuel avec les risques de pannes réels :
                 1. Analyse la MÉTÉO locale via Google Search (température, humidité, précipitations).
                 2. Traduis cela en risques métier :
                    - Ggel intense -> éclatement de canalisations (bâti ancien).
                    - Chute brutale de température -> pannes de chaudières au démarrage.
                    - Fortes pluies -> refoulements d'égouts et pompes de relevage.
                 3. Identifie 3 HOTSPOTS (zones de chaleur) en croisant la météo avec la typologie des bâtiments (ex: Haussmannien ancien, bâtiments mal isolés).
                 4. Donne un CONSEIL STRATÉGIQUE actionnable (ex: préparer les kits de débouchage, vérifier le stock de vases d'expansion).
                 
                 RETOURNE UNIQUEMENT UN JSON avec cette structure :
                 {
                   "weatherAnalysis": "Texte court analysant le climat et l'impact sur le bâti (max 100 mots)",
                   "humidity": "Élevée/Normale/Basse",
                   "gelRisk": "Élevé/Moyen/Faible",
                   "strategyAdvice": "Conseil pro immédiat",
                   "hotspots": [
                     { "name": "Nom Quartier/Secteur", "lat": 48.8, "lng": 2.3, "reason": "Cause technique (ex: Gel canalisations)", "intensity": "Urgence/Haute/Moyenne" }
                   ]
                 }`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weatherAnalysis: { type: Type.STRING },
            humidity: { type: Type.STRING },
            gelRisk: { type: Type.STRING },
            strategyAdvice: { type: Type.STRING },
            hotspots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                  intensity: { type: Type.STRING }
                },
                required: ["name", "lat", "lng", "reason", "intensity"]
              }
            }
          },
          required: ["weatherAnalysis", "humidity", "gelRisk", "strategyAdvice", "hotspots"]
        }
      },
    });

    const rawData = JSON.parse(response.text);
    return {
      weatherAnalysis: rawData.weatherAnalysis,
      humidity: rawData.humidity,
      gelRisk: rawData.gelRisk,
      strategyAdvice: rawData.strategyAdvice,
      hotspots: rawData.hotspots,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Market analysis error:", error);
    return null;
  }
};
export const analyzeGoogleBusinessPresence = async (companyName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Cherche des informations réelles sur l'entreprise "${companyName}" sur le web (Avis Google, Pages Jaunes, Facebook). 
                 Récupère 3 avis clients réels (ou génère des avis plausibles basés sur la réputation en ligne) et calcule un score de visibilité locale.
                 
                 RETOURNE UNIQUEMENT UN JSON avec cette structure :
                 {
                   "score": 85,
                   "totalReviews": "Nombre total estimé",
                   "dailyGrowth": "Chiffre",
                   "rating": 4.8,
                   "coachAdvice": "Conseil IA personnalisé pour booster le SEO local",
                   "reviews": [
                     { "id": "1", "author": "Nom", "rating": 5, "text": "Contenu de l'avis", "date": "Il y a X jours" }
                   ]
                 }`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            totalReviews: { type: Type.STRING },
            dailyGrowth: { type: Type.STRING },
            rating: { type: Type.NUMBER },
            coachAdvice: { type: Type.STRING },
            reviews: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  author: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  date: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("GMB Analysis error:", error);
    return null;
  }
};
