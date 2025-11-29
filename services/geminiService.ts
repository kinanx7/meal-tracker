import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MealAnalysis } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    mealName: {
      type: Type.STRING,
      description: "A short, descriptive name for the overall meal (e.g., 'Grilled Chicken Salad').",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
        },
        required: ["name", "calories"],
      },
    },
    totalCalories: {
      type: Type.NUMBER,
      description: "The estimated total calories for the entire meal.",
    },
    macronutrients: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.NUMBER, description: "Estimated protein in grams" },
        carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams" },
        fat: { type: Type.NUMBER, description: "Estimated fat in grams" },
      },
      required: ["protein", "carbs", "fat"],
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "A score from 0 to 1 indicating confidence in the food identification.",
    },
  },
  required: ["mealName", "items", "totalCalories", "macronutrients", "confidenceScore"],
};

export const analyzeMealImage = async (base64Image: string): Promise<MealAnalysis> => {
  try {
    // Clean the base64 string if it contains the header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "image/jpeg", 
            },
          },
          {
            text: "Analyze this image of food. Identify the meal, break down the visible components, estimate the portion sizes and calculate the approximate nutritional content.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are an expert nutritionist. Be conservative and realistic with calorie estimates. If the image is not food, return a mealName of 'Unknown' and 0 calories.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as MealAnalysis;
    } else {
      throw new Error("No response text from Gemini");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const analyzeMealText = async (description: string): Promise<MealAnalysis> => {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `Analyze this meal description or ingredient list: "${description}". Identify the items, estimate standard portion sizes if not specified, and calculate the approximate nutritional content.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are an expert nutritionist. Provide realistic calorie estimates for the described food items.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as MealAnalysis;
    } else {
      throw new Error("No response text from Gemini");
    }
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw error;
  }
};