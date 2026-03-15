import { useState } from 'react';
import { Code, Download, Sparkles, Globe, FileCode, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import JSZip from 'jszip';

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

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();

      // Add all generated files to ZIP
      generatedFiles.forEach(file => {
        zip.file(file.path, file.content);
      });

      // Generate ZIP blob
      const blob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(blob);
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

  return (
    <div className="flex-1 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl">
        <div className="glass rounded-3xl p-8 border-2 border-white/30 mb-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Website Creator
            </h2>
            <p className="text-gray-600">
              Describe your dream website and I'll create it for you! 💕
            </p>
          </div>

          {/* Website Description Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What kind of website do you want? ✨
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="E.g., A modern portfolio website with a hero section, about me page, projects gallery, and contact form. Make it pink and purple themed with smooth animations..."
              className="w-full h-32 px-4 py-3 glass rounded-2xl border-2 border-white/30 focus:border-pink-400 focus:outline-none resize-none text-gray-800 placeholder-gray-400"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: Press Ctrl+Enter to generate
            </p>
          </div>

          {/* Technology Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Technologies 🛠️
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {technologies.map(tech => (
                <button
                  key={tech.id}
                  onClick={() => toggleTech(tech.id)}
                  className={`p-4 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                    techStack.includes(tech.id)
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 border-pink-400 text-white shadow-lg'
                      : 'glass border-white/30 text-gray-700 hover:border-pink-300'
                  }`}
                >
                  <tech.icon className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">{tech.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim() || techStack.length === 0}
            className="w-full px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Creating Your Website...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Generate Website
              </>
            )}
          </button>

          {/* Coming Soon Notice */}
          <div className="mt-4 p-3 glass rounded-2xl border border-purple-300 text-center">
            <p className="text-sm font-medium text-purple-700">
              🚀 Coming Soon: DANI will host your website and send you a live link!
            </p>
          </div>
        </div>

        {/* Generated Files Display */}
        {generatedFiles.length > 0 && (
          <div className="glass rounded-3xl p-8 border-2 border-white/30 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Website Created! 🎉
                  </h3>
                  <p className="text-sm text-gray-600">
                    {generatedFiles.length} files generated
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadZip}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download ZIP
              </button>
            </div>

            {/* File List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {generatedFiles.map((file, index) => (
                <div
                  key={index}
                  className="bg-white/60 rounded-2xl p-4 border border-pink-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="w-5 h-5 text-purple-600" />
                    <p className="font-semibold text-gray-800">{file.path}</p>
                  </div>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto max-h-40">
                    <code>{file.content}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
