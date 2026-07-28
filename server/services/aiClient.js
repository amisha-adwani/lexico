import client from "../config/aiClient.js";

export async function generateContent(prompt) {
  return client.generateContent(prompt);
}

export async function generateContentDetailed(prompt) {
  return client.generateContentDetailed(prompt);
}

export default {
  generateContent,
  generateContentDetailed,
};
