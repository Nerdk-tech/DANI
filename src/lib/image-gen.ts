const BASE_URL = "https://apis.prexzyvilla.site/ai/realistic?prompt=";

export const isImagePrompt = (text: string): boolean => {
  const triggerWords = ['generate', 'create', 'draw', 'show me', 'make an image'];
  return triggerWords.some(word => text.toLowerCase().includes(word));
};

export const formatImageApiUrl = (userPrompt: string): string => {
  // Clean the prompt by removing the "trigger" commands
  const cleanPrompt = userPrompt
    .replace(/(generate|create|draw|make|show me)\s+(an?|a)\s+(image|picture|photo|art)\s+of/i, '')
    .trim();
  
  // Return the full URL with encoded prompt
  return `${BASE_URL}${encodeURIComponent(cleanPrompt)}&negative_prompt=blur,low quality,text,watermark`;
};

export const downloadImage = async (url: string, prompt: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `DANI_${prompt.slice(0, 10).replace(/\s+/g, '_')}.jpg`;
  link.click();
  window.URL.revokeObjectURL(blobUrl);
};
