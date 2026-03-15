import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, techStack } = await req.json();

    if (!description || !techStack || techStack.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Description and techStack are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating website with:', { description, techStack });

    // Build prompt for AI to generate website code
    const techList = techStack.join(', ');
    const includeReact = techStack.includes('react');
    const includeTypeScript = techStack.includes('typescript');

    const prompt = `You are DANI, a website creation assistant. Create a complete, production-ready website based on this description:

${description}

TECHNOLOGIES TO USE: ${techList}

REQUIREMENTS:
${includeReact ? `- Use React with functional components and hooks
- Use modern React patterns (useState, useEffect, etc.)
- Create component-based architecture` : '- Create vanilla HTML/CSS/JavaScript website'}
${includeTypeScript ? '- Use TypeScript with proper type definitions' : '- Use JavaScript (ES6+)'}
- Use modern, responsive CSS (flexbox/grid)
- Include smooth animations and transitions
- Make it mobile-friendly
- Use a pink and purple color scheme (DANI's theme)
- Include comments in the code
- Create clean, well-structured code

STRUCTURE:
${includeReact ? `
- index.html (basic HTML shell)
- App.${includeTypeScript ? 'tsx' : 'jsx'} (main React component)
- components/ folder with reusable components
- styles.css (global styles)
- package.json (React dependencies)
` : `
- index.html (main page)
- styles.css (stylesheet)
- script.js (JavaScript functionality)
- Additional HTML pages if needed
`}

Generate COMPLETE, WORKING code for each file. Return ONLY a JSON object with this exact structure:
{
  "projectName": "website-name",
  "files": [
    {"path": "index.html", "content": "...complete file content..."},
    {"path": "styles.css", "content": "...complete file content..."},
    {"path": "script.js", "content": "...complete file content..."}
  ]
}

DO NOT include any explanatory text, only the JSON object.`;

    // Call AI API
    const response = await fetch(`https://apis.prexzyvilla.site/ai/aichat?prompt=${encodeURIComponent(prompt)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API request failed: ${errorText}`);
    }

    const data = await response.json();
    let aiResponse = data.response || data.message || data.text || '';

    console.log('AI Response received:', aiResponse.substring(0, 200));

    // Try to extract JSON from the response
    let websiteData;
    
    // Look for JSON in the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        websiteData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse AI response');
      }
    }

    // If AI didn't return proper structure, create a fallback
    if (!websiteData || !websiteData.files || websiteData.files.length === 0) {
      console.log('Creating fallback website structure');
      websiteData = createFallbackWebsite(description, techStack);
    }

    return new Response(
      JSON.stringify(websiteData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback website generator
function createFallbackWebsite(description: string, techStack: string[]) {
  const includeReact = techStack.includes('react');
  const includeTypeScript = techStack.includes('typescript');
  
  const projectName = 'dani-website';
  
  if (includeReact) {
    return {
      projectName,
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANI Created Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="App.${includeTypeScript ? 'tsx' : 'jsx'}"></script>
</body>
</html>`
        },
        {
          path: `App.${includeTypeScript ? 'tsx' : 'jsx'}`,
          content: `import React from 'react';
import './styles.css';

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Welcome to Your Website</h1>
        <p>Created by DANI 💕</p>
      </header>
      
      <main className="main">
        <section className="hero">
          <h2>Your Description:</h2>
          <p>${description}</p>
        </section>
        
        <section className="content">
          <div className="card">
            <h3>Feature 1</h3>
            <p>Add your content here</p>
          </div>
          <div className="card">
            <h3>Feature 2</h3>
            <p>Add your content here</p>
          </div>
          <div className="card">
            <h3>Feature 3</h3>
            <p>Add your content here</p>
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <p>Made with ❤️ by DANI</p>
      </footer>
    </div>
  );
}

export default App;`
        },
        {
          path: 'styles.css',
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(236, 72, 153, 0.3);
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.hero {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  border: 2px solid rgba(236, 72, 153, 0.2);
}

.hero h2 {
  color: #a855f7;
  margin-bottom: 1rem;
}

.content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  border: 2px solid rgba(168, 85, 247, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(236, 72, 153, 0.3);
}

.card h3 {
  color: #ec4899;
  margin-bottom: 1rem;
}

.footer {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2rem;
  }
  
  .content {
    grid-template-columns: 1fr;
  }
}`
        },
        {
          path: 'package.json',
          content: `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "Website created by DANI",
  "main": "index.html",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.0"${includeTypeScript ? ',\n    "typescript": "^5.0.0",\n    "@types/react": "^18.2.0",\n    "@types/react-dom": "^18.2.0"' : ''}
  }
}`
        }
      ]
    };
  } else {
    return {
      projectName,
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANI Created Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="header">
    <h1>Welcome to Your Website</h1>
    <p>Created by DANI 💕</p>
  </header>
  
  <main class="main">
    <section class="hero">
      <h2>Your Description:</h2>
      <p>${description}</p>
    </section>
    
    <section class="content">
      <div class="card">
        <h3>Feature 1</h3>
        <p>Add your content here</p>
      </div>
      <div class="card">
        <h3>Feature 2</h3>
        <p>Add your content here</p>
      </div>
      <div class="card">
        <h3>Feature 3</h3>
        <p>Add your content here</p>
      </div>
    </section>
  </main>
  
  <footer class="footer">
    <p>Made with ❤️ by DANI</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>`
        },
        {
          path: 'styles.css',
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%);
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(236, 72, 153, 0.3);
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  animation: fadeInDown 0.8s ease;
}

.main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  border: 2px solid rgba(236, 72, 153, 0.2);
  animation: fadeIn 1s ease;
}

.hero h2 {
  color: #a855f7;
  margin-bottom: 1rem;
}

.content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 20px;
  border: 2px solid rgba(168, 85, 247, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: fadeInUp 0.8s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(236, 72, 153, 0.3);
}

.card h3 {
  color: #ec4899;
  margin-bottom: 1rem;
}

.footer {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  margin-top: 4rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2rem;
  }
  
  .content {
    grid-template-columns: 1fr;
  }
}`
        },
        {
          path: 'script.js',
          content: `// DANI Created Website
// Add your JavaScript functionality here

document.addEventListener('DOMContentLoaded', () => {
  console.log('Website created by DANI is ready! 💕');
  
  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Add card animation on scroll
  const cards = document.querySelectorAll('.card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, {
    threshold: 0.1
  });
  
  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
});`
        }
      ]
    };
  }
}
