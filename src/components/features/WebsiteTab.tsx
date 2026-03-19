import { useState, useMemo } from 'react';
import { Code, Download, Sparkles, Globe, FileCode, Loader2, CheckCircle, AlertCircle, Eye, Edit, Zap, Layers, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface GeneratedFile {
  path: string;
  content: string;
}

export default function WebsiteTab() {
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState<string[]>(['html', 'css', 'javascript']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [editedCode, setEditedCode] = useState('');

  const technologies = [
    { id: 'html', label: 'HTML', icon: FileCode },
    { id: 'css', label: 'CSS', icon: FileCode },
    { id: 'javascript', label: 'JavaScript', icon: Code },
    { id: 'typescript', label: 'TypeScript', icon: Code },
    { id: 'react', label: 'React', icon: Globe }
  ];

  const toggleTech = (techId: string) => {
    if (techStack.includes(techId)) {
      setTechStack(techStack.filter(t => t !== techId));
    } else {
      setTechStack([...techStack, techId]);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please describe the website you want to create');
      return;
    }

    if (techStack.length === 0) {
      setError('Please select at least one technology');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedFiles([]);

    try {
      const { data, error } = await supabase.functions.invoke('create-website', {
        body: {
          description,
          techStack
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      setGeneratedFiles(data.files || []);
      setProjectName(data.projectName || 'website');
    } catch (error: any) {
      console.error('Error generating website:', error);
      setError(error.message || 'Failed to generate website. Please try again!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Simple ZIP file creator without external dependencies
  const createZipFile = (files: GeneratedFile[], fileName: string): Blob => {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    files.forEach((file) => {
      const content = encoder.encode(file.content);
      const fileName = encoder.encode(file.path);
      const crc = 0; // Simplified: not calculating actual CRC

      // Local file header
      const header = new Uint8Array(30 + fileName.length);
      const view = new DataView(header.buffer);
      
      view.setUint32(0, 0x04034b50, true); // Signature
      view.setUint16(4, 10, true); // Version
      view.setUint16(6, 0, true); // Flags
      view.setUint16(8, 0, true); // Compression (0 = no compression)
      view.setUint16(10, 0, true); // Time
      view.setUint16(12, 0, true); // Date
      view.setUint32(14, crc, true); // CRC
      view.setUint32(18, content.length, true); // Compressed size
      view.setUint32(22, content.length, true); // Uncompressed size
      view.setUint16(26, fileName.length, true); // File name length
      view.setUint16(28, 0, true); // Extra field length
      header.set(fileName, 30);

      chunks.push(header, content);

      // Central directory header
      const cdHeader = new Uint8Array(46 + fileName.length);
      const cdView = new DataView(cdHeader.buffer);
      
      cdView.setUint32(0, 0x02014b50, true); // Signature
      cdView.setUint16(4, 10, true); // Version made by
      cdView.setUint16(6, 10, true); // Version needed
      cdView.setUint16(8, 0, true); // Flags
      cdView.setUint16(10, 0, true); // Compression
      cdView.setUint16(12, 0, true); // Time
      cdView.setUint16(14, 0, true); // Date
      cdView.setUint32(16, crc, true); // CRC
      cdView.setUint32(20, content.length, true); // Compressed size
      cdView.setUint32(24, content.length, true); // Uncompressed size
      cdView.setUint16(28, fileName.length, true); // File name length
      cdView.setUint16(30, 0, true); // Extra field length
      cdView.setUint16(32, 0, true); // Comment length
      cdView.setUint16(34, 0, true); // Disk number
      cdView.setUint16(36, 0, true); // Internal attributes
      cdView.setUint32(38, 0, true); // External attributes
      cdView.setUint32(42, offset, true); // Relative offset
      cdHeader.set(fileName, 46);

      centralDirectory.push(cdHeader);
      offset += header.length + content.length;
    });

    // End of central directory
    const cdSize = centralDirectory.reduce((sum, cd) => sum + cd.length, 0);
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    
    eocdView.setUint32(0, 0x06054b50, true); // Signature
    eocdView.setUint16(4, 0, true); // Disk number
    eocdView.setUint16(6, 0, true); // Central directory disk
    eocdView.setUint16(8, files.length, true); // Entries on this disk
    eocdView.setUint16(10, files.length, true); // Total entries
    eocdView.setUint32(12, cdSize, true); // Central directory size
    eocdView.setUint32(16, offset, true); // Central directory offset
    eocdView.setUint16(20, 0, true); // Comment length

    return new Blob([...chunks, ...centralDirectory, eocd], { type: 'application/zip' });
  };

  const handleDownloadZip = async () => {
    try {
      // Create ZIP file
      const zipBlob = createZipFile(generatedFiles, projectName || 'website');

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'website'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      setError('Failed to create ZIP file');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleGenerate();
    }
  };

  // Generate preview HTML
  const previewHTML = useMemo(() => {
    if (generatedFiles.length === 0) return '';
    
    const htmlFile = generatedFiles.find(f => f.path === 'index.html');
    const cssFile = generatedFiles.find(f => f.path.endsWith('.css'));
    const jsFile = generatedFiles.find(f => f.path.endsWith('.js'));
    
    if (!htmlFile) return '';
    
    let html = htmlFile.content;
    
    // Inject CSS inline
    if (cssFile) {
      html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
    }
    
    // Inject JS inline
    if (jsFile) {
      html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
    }
    
    return html;
  }, [generatedFiles]);

  const features = [
    { icon: Zap, title: 'VIBE CODER', desc: 'Generate full websites from prompts' },
    { icon: Globe, title: 'AI WEBSITE BUILDER', desc: 'Create modern websites instantly' },
    { icon: Code, title: 'SMART CODE GENERATOR', desc: 'HTML, CSS, JavaScript & TypeScript' },
    { icon: Layers, title: 'UI DESIGN CREATOR', desc: 'Beautiful layouts automatically' },
    { icon: Package, title: 'PROJECT EXPORT', desc: 'Download ready-to-use projects' }
  ];

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Feature Showcase */}
        <div className="glass rounded-3xl p-6 border-2 border-white/30 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {features.map((feature, idx) => (
              <div key={idx} className="text-center transform hover:scale-105 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-bold text-gray-700 mb-1">{feature.title}</p>
                <p className="text-[10px] text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="glass rounded-3xl p-6 border-2 border-white/30 mb-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Website Creator
            </h2>
            <p className="text-sm text-gray-600">
              Describe your dream website and I'll create it for you! 💕
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What kind of website do you want? ✨
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="E.g., A modern portfolio website with a hero section, about me page, projects gallery, and contact form. Make it pink and purple themed with smooth animations..."
              className="w-full h-24 px-4 py-3 glass rounded-2xl border-2 border-white/30 focus:border-pink-400 focus:outline-none resize-none text-sm text-gray-800 placeholder-gray-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Technologies 🛠️
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {technologies.map(tech => (
                <button
                  key={tech.id}
                  onClick={() => toggleTech(tech.id)}
                  className={`p-3 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                    techStack.includes(tech.id)
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 border-pink-400 text-white shadow-lg'
                      : 'glass border-white/30 text-gray-700 hover:border-pink-300'
                  }`}
                >
                  <tech.icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">{tech.label}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim() || techStack.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
            <div className="glass rounded-2xl px-4 py-3 border border-purple-300 text-center">
              <p className="text-xs font-medium text-purple-700">
                🚀 Hosting Coming Soon!
              </p>
            </div>
          </div>
        </div>

        {/* Code Editor & Preview */}
        {generatedFiles.length > 0 && (
          <div className="glass rounded-3xl border-2 border-white/30 flex-1 flex flex-col animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Website Created! 🎉
                  </h3>
                  <p className="text-xs text-gray-600">
                    {generatedFiles.length} files
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="bg-white/60 rounded-full p-1 flex gap-1">
                  <button
                    onClick={() => setViewMode('editor')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'editor'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Edit className="w-4 h-4 inline mr-1" />
                    Editor
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'preview'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Preview
                  </button>
                </div>
                <button
                  onClick={handleDownloadZip}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Download</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {viewMode === 'editor' ? (
                <>
                  {/* File Tabs */}
                  <div className="w-48 border-r border-white/20 overflow-y-auto bg-white/30">
                    {generatedFiles.map((file, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedFileIndex(index);
                          setEditedCode(file.content);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm border-b border-white/20 transition-all ${
                          selectedFileIndex === index
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold'
                            : 'text-gray-700 hover:bg-white/40'
                        }`}
                      >
                        <FileCode className="w-4 h-4 inline mr-2" />
                        {file.path}
                      </button>
                    ))}
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 flex flex-col">
                    <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-mono">
                        {generatedFiles[selectedFileIndex]?.path}
                      </p>
                      <Code className="w-4 h-4 text-gray-500" />
                    </div>
                    <textarea
                      value={editedCode || generatedFiles[selectedFileIndex]?.content || ''}
                      onChange={(e) => setEditedCode(e.target.value)}
                      className="flex-1 bg-gray-900 text-green-400 font-mono text-xs p-4 resize-none focus:outline-none"
                      spellCheck={false}
                    />
                  </div>
                </>
              ) : (
                /* Live Preview */
                <div className="flex-1 bg-white">
                  <iframe
                    srcDoc={previewHTML}
                    className="w-full h-full border-0"
                    title="Website Preview"
                    sandbox="allow-scripts"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
