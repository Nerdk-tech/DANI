import { useEffect, useRef } from 'react';

interface AnimatedOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

interface EnergyRibbon {
  points: Array<{ x: number; y: number; vx: number; vy: number }>;
  color: string;
  alpha: number;
  width: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
}

interface WaveformBar {
  height: number;
  targetHeight: number;
  velocity: number;
}

export default function AnimatedOrb({ isListening, isSpeaking, isProcessing }: AnimatedOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const ribbonsRef = useRef<EnergyRibbon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const waveformBarsRef = useRef<WaveformBar[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const waveformCanvas = waveformCanvasRef.current;
    if (!canvas || !waveformCanvas) return;

    const ctx = canvas.getContext('2d');
    const waveCtx = waveformCanvas.getContext('2d');
    if (!ctx || !waveCtx) return;

    // Set canvas size - circular orb
    const size = 280;
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;

    // Set waveform canvas
    waveformCanvas.width = 300;
    waveformCanvas.height = 80;

    // Initialize waveform bars
    if (waveformBarsRef.current.length === 0) {
      for (let i = 0; i < 40; i++) {
        waveformBarsRef.current.push({
          height: 2,
          targetHeight: 2,
          velocity: 0
        });
      }
    }

    // Initialize energy ribbons
    if (ribbonsRef.current.length === 0) {
      const numRibbons = 6;
      for (let i = 0; i < numRibbons; i++) {
        const points = [];
        const baseAngle = (Math.PI * 2 * i) / numRibbons;
        for (let j = 0; j < 25; j++) {
          const angle = baseAngle + (j / 25) * Math.PI * 2;
          const radius = 55 + Math.random() * 15;
          points.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
          });
        }
        const pinkShades = ['#ec4899', '#f472b6', '#fb7185', '#f9a8d4', '#fda4af'];
        ribbonsRef.current.push({
          points,
          color: pinkShades[i % pinkShades.length],
          alpha: 0.5 + Math.random() * 0.4,
          width: 1.5 + Math.random() * 2.5
        });
      }
    }

    let frame = 0;
    const baseRadius = 60;

    // Particle spawning function
    const spawnParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = baseRadius + Math.random() * 30;
      const pinkColors = ['#ec4899', '#f472b6', '#fb7185', '#f9a8d4', '#fda4af', '#c084fc'];
      
      particlesRef.current.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 2 + Math.random() * 4,
        alpha: 0.8,
        color: pinkColors[Math.floor(Math.random() * pinkColors.length)],
        life: 1.0
      });
    };

    const animate = () => {
      // Clear with transparent black for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, size, size);
      frame++;

      // Determine state
      const isActive = isListening || isSpeaking || isProcessing;
      const intensity = isSpeaking ? 2.2 : isListening ? 1.4 : isProcessing ? 1.2 : 0.6;
      
      // Spawn particles when active
      if (isActive && Math.random() < (isSpeaking ? 0.3 : 0.15)) {
        spawnParticle();
      }
      
      // Draw outer glow aura - vibrant pink
      for (let i = 0; i < 5; i++) {
        const glowRadius = baseRadius + 30 + i * 18 + Math.sin(frame * 0.05 + i) * 10;
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, glowRadius);
        
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0)');
        gradient.addColorStop(0.4, `rgba(236, 72, 153, ${(0.15 - i * 0.03) * intensity})`);
        gradient.addColorStop(0.7, `rgba(251, 113, 133, ${(0.1 - i * 0.02) * intensity})`);
        gradient.addColorStop(1, 'rgba(249, 168, 212, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update particle
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;
        particle.alpha = particle.life * 0.8;
        
        // Add slight attraction to center when speaking
        if (isSpeaking) {
          const dx = centerX - particle.x;
          const dy = centerY - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > baseRadius * 1.5) {
            particle.vx += (dx / dist) * 0.05;
            particle.vy += (dy / dist) * 0.05;
          }
        }
        
        // Draw particle with glow
        if (particle.life > 0) {
          ctx.save();
          ctx.globalAlpha = particle.alpha;
          
          const particleGlow = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
          );
          particleGlow.addColorStop(0, particle.color);
          particleGlow.addColorStop(0.5, particle.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
          particleGlow.addColorStop(1, 'rgba(236, 72, 153, 0)');
          
          ctx.fillStyle = particleGlow;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
          return true;
        }
        return false;
      });

      // Update and draw energy ribbons
      if (isActive) {
        ribbonsRef.current.forEach((ribbon, ribbonIndex) => {
          const movementSpeed = isSpeaking ? 1.0 : isListening ? 0.6 : 0.4;
          
          // Update ribbon points with fluid motion
          ribbon.points.forEach((point, i) => {
            const angle = Math.atan2(point.y - centerY, point.x - centerX);
            const currentRadius = Math.sqrt(
              Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
            );
            
            // Orbital movement with wave - more dynamic when speaking
            const waveAmount = isSpeaking ? 20 : 12;
            const targetRadius = baseRadius + 10 + Math.sin(frame * 0.09 + i * 0.3 + ribbonIndex) * waveAmount * intensity;
            const radiusDiff = targetRadius - currentRadius;
            
            point.vx = Math.cos(angle) * radiusDiff * 0.02;
            point.vy = Math.sin(angle) * radiusDiff * 0.02;
            
            // Add tangential velocity for rotation
            const tangentAngle = angle + Math.PI / 2;
            point.vx += Math.cos(tangentAngle) * movementSpeed * 0.015;
            point.vy += Math.sin(tangentAngle) * movementSpeed * 0.015;
            
            // Add noise
            point.vx += (Math.random() - 0.5) * 0.2 * intensity;
            point.vy += (Math.random() - 0.5) * 0.2 * intensity;
            
            // Apply velocity with damping
            point.x += point.vx;
            point.y += point.vy;
            point.vx *= 0.95;
            point.vy *= 0.95;
          });
          
          // Draw smooth ribbon with glow
          ctx.save();
          ctx.globalAlpha = ribbon.alpha * intensity;
          ctx.strokeStyle = ribbon.color;
          ctx.lineWidth = ribbon.width * intensity;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Add glow effect
          ctx.shadowColor = ribbon.color;
          ctx.shadowBlur = 15 * intensity;
          
          ctx.beginPath();
          ctx.moveTo(ribbon.points[0].x, ribbon.points[0].y);
          
          // Draw smooth curves through points
          for (let i = 1; i < ribbon.points.length - 2; i++) {
            const xc = (ribbon.points[i].x + ribbon.points[i + 1].x) / 2;
            const yc = (ribbon.points[i].y + ribbon.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(ribbon.points[i].x, ribbon.points[i].y, xc, yc);
          }
          
          // Connect back to start for closed loop
          const lastPoint = ribbon.points[ribbon.points.length - 1];
          const firstPoint = ribbon.points[0];
          ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, firstPoint.x, firstPoint.y);
          
          ctx.stroke();
          ctx.restore();
        });
      }

      // Draw central glow sphere with hollow center - perfectly circular
      const innerRadius = baseRadius * 0.35;
      const pulseAmount = isSpeaking ? 8 : isActive ? 5 : 2;
      const outerRadius = baseRadius + Math.sin(frame * 0.12) * pulseAmount;
      
      // Outer glow - vibrant pink
      const glowGradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
      glowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      glowGradient.addColorStop(0.25, `rgba(236, 72, 153, ${0.5 * intensity})`);
      glowGradient.addColorStop(0.5, `rgba(251, 113, 133, ${0.7 * intensity})`);
      glowGradient.addColorStop(0.75, `rgba(244, 114, 182, ${0.4 * intensity})`);
      glowGradient.addColorStop(1, 'rgba(249, 168, 212, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add shimmer highlights when speaking
      if (isSpeaking || isListening) {
        for (let i = 0; i < 10; i++) {
          const angle = (frame * 0.06 + i * Math.PI / 5);
          const highlightRadius = baseRadius * 0.65;
          const x = centerX + Math.cos(angle) * highlightRadius;
          const y = centerY + Math.sin(angle) * highlightRadius;
          
          const highlightGradient = ctx.createRadialGradient(x, y, 0, x, y, 18);
          highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${isSpeaking ? 0.7 : 0.4})`);
          highlightGradient.addColorStop(0.4, 'rgba(251, 113, 133, 0.4)');
          highlightGradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
          
          ctx.fillStyle = highlightGradient;
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Animate waveform
      waveCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
      
      if (isActive) {
        const barWidth = waveformCanvas.width / waveformBarsRef.current.length;
        
        waveformBarsRef.current.forEach((bar, i) => {
          // Update bar heights with physics
          if (isSpeaking) {
            bar.targetHeight = 5 + Math.random() * 35 + Math.sin(frame * 0.1 + i * 0.5) * 15;
          } else if (isListening) {
            bar.targetHeight = 3 + Math.random() * 20 + Math.sin(frame * 0.08 + i * 0.4) * 10;
          } else {
            bar.targetHeight = 2 + Math.random() * 8;
          }
          
          // Spring physics
          const diff = bar.targetHeight - bar.height;
          bar.velocity += diff * 0.15;
          bar.velocity *= 0.85;
          bar.height += bar.velocity;
          
          // Draw bar with gradient
          const x = i * barWidth;
          const barHeight = Math.max(2, bar.height);
          const y = (waveformCanvas.height - barHeight) / 2;
          
          const gradient = waveCtx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, '#f9a8d4');
          gradient.addColorStop(0.5, '#ec4899');
          gradient.addColorStop(1, '#f472b6');
          
          waveCtx.fillStyle = gradient;
          waveCtx.fillRect(x + 1, y, barWidth - 2, barHeight);
          
          // Add glow
          waveCtx.shadowColor = '#ec4899';
          waveCtx.shadowBlur = isSpeaking ? 8 : 4;
          waveCtx.fillRect(x + 1, y, barWidth - 2, barHeight);
          waveCtx.shadowBlur = 0;
        });
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
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Circular Orb */}
      <div className="relative w-[280px] h-[280px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 rounded-full"
          style={{ background: '#000' }}
        />
      </div>
      
      {/* Voice Waveform */}
      <div className="w-[300px] h-[80px] glass rounded-2xl border border-white/20 overflow-hidden">
        <canvas
          ref={waveformCanvasRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
