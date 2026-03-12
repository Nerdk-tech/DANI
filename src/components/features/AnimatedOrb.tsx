import { useEffect, useRef } from 'react';

interface AnimatedOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

export default function AnimatedOrb({ isListening, isSpeaking, isProcessing }: AnimatedOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Array<{
    angle: number;
    radius: number;
    speed: number;
    size: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;

    // Initialize particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 40; i++) {
        particlesRef.current.push({
          angle: (Math.PI * 2 * i) / 40,
          radius: 60 + Math.random() * 20,
          speed: 0.02 + Math.random() * 0.03,
          size: 2 + Math.random() * 3
        });
      }
    }

    let frame = 0;
    const baseRadius = 70;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      frame++;

      // Determine state
      const isActive = isListening || isSpeaking || isProcessing;
      
      // Draw outer glow rings
      if (isActive) {
        for (let i = 0; i < 3; i++) {
          const pulseRadius = baseRadius + 30 + i * 25 + Math.sin(frame * 0.05 + i) * 10;
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
          
          if (isListening) {
            gradient.addColorStop(0, 'rgba(236, 72, 153, 0)');
            gradient.addColorStop(0.7, `rgba(236, 72, 153, ${0.15 - i * 0.05})`);
            gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
          } else if (isSpeaking) {
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0)');
            gradient.addColorStop(0.7, `rgba(168, 85, 247, ${0.15 - i * 0.05})`);
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
          } else {
            gradient.addColorStop(0, 'rgba(147, 51, 234, 0)');
            gradient.addColorStop(0.7, `rgba(147, 51, 234, ${0.1 - i * 0.03})`);
            gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
          }
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw dynamic particles for active states
      if (isActive) {
        particlesRef.current.forEach((particle) => {
          particle.angle += particle.speed;
          
          const waveAmplitude = isSpeaking ? 20 : isListening ? 15 : 8;
          const waveFrequency = isSpeaking ? 4 : 3;
          const currentRadius = particle.radius + Math.sin(frame * 0.1 + particle.angle * waveFrequency) * waveAmplitude;
          
          const x = centerX + Math.cos(particle.angle) * currentRadius;
          const y = centerY + Math.sin(particle.angle) * currentRadius;
          
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size);
          
          if (isListening) {
            gradient.addColorStop(0, 'rgba(236, 72, 153, 0.9)');
            gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
          } else if (isSpeaking) {
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
          } else {
            gradient.addColorStop(0, 'rgba(147, 51, 234, 0.7)');
            gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
          }
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw main orb with gradient
      const mainGradient = ctx.createRadialGradient(
        centerX - 20,
        centerY - 20,
        0,
        centerX,
        centerY,
        baseRadius
      );

      if (isListening) {
        mainGradient.addColorStop(0, '#fdf2f8');
        mainGradient.addColorStop(0.3, '#fce7f3');
        mainGradient.addColorStop(0.7, '#ec4899');
        mainGradient.addColorStop(1, '#be185d');
      } else if (isSpeaking) {
        mainGradient.addColorStop(0, '#faf5ff');
        mainGradient.addColorStop(0.3, '#f3e8ff');
        mainGradient.addColorStop(0.7, '#a855f7');
        mainGradient.addColorStop(1, '#7e22ce');
      } else if (isProcessing) {
        mainGradient.addColorStop(0, '#f5f3ff');
        mainGradient.addColorStop(0.3, '#ede9fe');
        mainGradient.addColorStop(0.7, '#9333ea');
        mainGradient.addColorStop(1, '#6b21a8');
      } else {
        mainGradient.addColorStop(0, '#f9fafb');
        mainGradient.addColorStop(0.5, '#e5e7eb');
        mainGradient.addColorStop(1, '#9ca3af');
      }

      const orbRadius = isActive 
        ? baseRadius + Math.sin(frame * 0.08) * (isSpeaking ? 8 : 5)
        : baseRadius;

      ctx.fillStyle = mainGradient;
      ctx.shadowColor = isListening ? '#ec4899' : isSpeaking ? '#a855f7' : isProcessing ? '#9333ea' : '#6b7280';
      ctx.shadowBlur = isActive ? 30 : 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw waveform for speaking
      if (isSpeaking) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < 360; i += 5) {
          const angle = (i * Math.PI) / 180;
          const waveOffset = Math.sin(frame * 0.2 + i * 0.1) * 15;
          const radius = orbRadius - 25 + waveOffset;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.stroke();
      }

      // Draw energy ring for listening
      if (isListening) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        
        const ringRadius = orbRadius + 15;
        const segments = 60;
        const gapSize = 0.3;
        
        for (let i = 0; i < segments; i++) {
          const startAngle = (i / segments) * Math.PI * 2 + frame * 0.05;
          const endAngle = startAngle + (Math.PI * 2 / segments) - gapSize;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, startAngle, endAngle);
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, isSpeaking, isProcessing]);

  return (
    <div className="relative w-[300px] h-[300px] flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
    </div>
  );
}
