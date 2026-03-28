const BASE_URL = "https://apis.prexzyvilla.site/ai/realistic?prompt=";

export const isImagePrompt = (text: string): boolean => {
  const lower = text.toLowerCase();
  
  // 🛑 STOP: If the user mentions these words, they want TEXT/TABLES, not an image
  const textPriorityWords = ['table', 'markdown', 'code', 'script', 'text', 'list'];
  if (textPriorityWords.some(word => lower.includes(word))) return false;

  const triggerWords = ['generate', 'create', 'draw', 'show me', 'make an image', 'paint'];
  return triggerWords.some(word => lower.includes(word)) || lower.includes('image of');
};

export const formatImageApiUrl = (userPrompt: string): string => {
  // Improved regex to strip out the "command" part of the prompt
  const cleanPrompt = userPrompt
    .replace(/^(generate|create|draw|make|show me|paint)\s+(an?|a|some)?\s+(image|picture|photo|art|drawing)\s+(of|about)\s+/i, '')
    .replace(/^(generate|create|draw|image of|paint)\s+/i, '')
    .trim();
  
  // Added standard quality parameters to the end
  return `${BASE_URL}${encodeURIComponent(cleanPrompt)}&negative_prompt=blur,low%20quality,text,watermark,gibberish,deformed`;
};

export const downloadImage = async (url: string, prompt: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const safeName = (prompt || 'art').slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `DANI_${safeName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    window.open(url, '_blank');
  }
};
