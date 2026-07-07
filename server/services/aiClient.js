import client from "../config/aiClient.js";

export async function generateContent(prompt) {
  return client.generateContent(prompt);
}

export default {
  generateContent,
};
