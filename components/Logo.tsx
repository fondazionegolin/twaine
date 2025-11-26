import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { icon: 24, text: 'text-lg', gap: 'gap-1.5' },
    md: { icon: 32, text: 'text-xl', gap: 'gap-2' },
    lg: { icon: 48, text: 'text-3xl', gap: 'gap-3' },
    xl: { icon: 64, text: 'text-4xl', gap: 'gap-4' }
  };

  const { icon, text, gap } = sizes[size];

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* Book Icon */}
      <div 
        className="relative"
        style={{ width: icon, height: icon }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Book cover - back */}
          <path
            d="M8 8C8 6.89543 8.89543 6 10 6H38C39.1046 6 40 6.89543 40 8V40C40 41.1046 39.1046 42 38 42H10C8.89543 42 8 41.1046 8 40V8Z"
            fill="url(#bookGradient)"
          />
          
          {/* Book spine highlight */}
          <path
            d="M8 8C8 6.89543 8.89543 6 10 6H14V42H10C8.89543 42 8 41.1046 8 40V8Z"
            fill="url(#spineGradient)"
          />
          
          {/* Pages */}
          <path
            d="M14 10H36V38H14V10Z"
            fill="#f5f5f5"
          />
          
          {/* Page lines */}
          <path d="M18 16H32" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M18 21H32" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M18 26H28" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round"/>
          
          {/* AI sparkle */}
          <circle cx="32" cy="32" r="6" fill="url(#aiGradient)"/>
          <path
            d="M32 28V36M28 32H36M29.5 29.5L34.5 34.5M34.5 29.5L29.5 34.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          
          <defs>
            <linearGradient id="bookGradient" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1"/>
              <stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient>
            <linearGradient id="spineGradient" x1="8" y1="6" x2="14" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4f46e5"/>
              <stop offset="1" stopColor="#7c3aed"/>
            </linearGradient>
            <linearGradient id="aiGradient" x1="26" y1="26" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f59e0b"/>
              <stop offset="1" stopColor="#ef4444"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span className={`font-black tracking-tight ${text}`}>
          <span className="text-white">tw</span>
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">AI</span>
          <span className="text-white">ne</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
