import React from 'react';

export const AmbientBackground: React.FC<{ className?: string }> = React.memo(({ className = '' }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}>
      {/* Layer 1: Ambient Floating Liquid Color Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-500/12 dark:bg-blue-600/14 blur-[80px] pointer-events-none ambient-orb-1 transform-gpu" />
      <div className="absolute top-[35%] right-[-10%] w-[42vw] h-[42vw] rounded-full bg-indigo-500/10 dark:bg-cyan-500/12 blur-[80px] pointer-events-none ambient-orb-2 transform-gpu" />
      <div className="absolute bottom-[-15%] left-[20%] w-[38vw] h-[38vw] rounded-full bg-sky-400/10 dark:bg-blue-400/10 blur-[70px] pointer-events-none ambient-orb-3 transform-gpu" />
      <div className="absolute top-[10%] right-[30%] w-[30vw] h-[30vw] rounded-full bg-purple-400/8 dark:bg-purple-600/8 blur-[70px] pointer-events-none ambient-orb-1 transform-gpu" />

      {/* Layer 2: Subtle Grid Lines */}
      <div className="absolute inset-0 ambient-animated-lines opacity-75 dark:opacity-60 pointer-events-none" />

      {/* Layer 3: Subtle Dotted Matrix */}
      <div className="absolute inset-0 ambient-animated-dots opacity-80 dark:opacity-70 pointer-events-none" />

      {/* Layer 4: Vignette / Ambient Depth Overlay */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-30 dark:opacity-50" />
    </div>
  );
});

export default AmbientBackground;
