const BASE_URL = "https://apis.prexzyvilla.site/ai/realistic?prompt=";

export const isImagePrompt = (text: string): boolean => {
  const lower = text.toLowerCase();
  const triggerWords = ['generate', 'create', 'draw', 'show me', 'make an image'];
  return triggerWords.some(word => lower.includes(word)) || lower.includes('image of');
};

export const formatImageApiUrl = (userPrompt: string): string => {
  // Enhanced cleaning to handle variations like "Create an image of a sunset"
  const cleanPrompt = userPrompt
    .replace(/^(generate|create|draw|make|show me)\s+(an?|a)\s+(image|picture|photo|art)\s+of\s+/i, '')
    .replace(/^(generate|create|draw|image of)\s+/i, '')
    .trim();
  
  // Return the full URL with encoded prompt and fixed parameters
  return `${BASE_URL}${encodeURIComponent(cleanPrompt)}&negative_prompt=blur,low%20quality,text,watermark`;
};

export const downloadImage = async (url: string, prompt: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    // Cleans the filename for the OS
    const safeName = prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `DANI_${safeName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed", error);
    // Fallback: open in new tab if blob fails
    window.open(url, '_blank');
  }
};
