import React from 'react';
import { StoryStyle } from '../types';
import { ORNAMENTS } from '../utils/stylePresets';

interface BookLayoutProps {
  style?: StoryStyle;
  imageUrl?: string;
  title: string;
  content: string;
  children?: React.ReactNode; // For choices/buttons
  className?: string;
}

const BookLayout: React.FC<BookLayoutProps> = ({
  style,
  imageUrl,
  title,
  content,
  children,
  className = ''
}) => {
  const pageColor = style?.pageColor || '#f5f0e6';
  const textColor = style?.textColor || '#2c2416';
  const accentColor = style?.accentColor || '#8b4513';
  const ornamentStyle = style?.ornamentStyle || 'elegant';
  const ornamentSvg = ORNAMENTS[ornamentStyle];

  // Generate page edge gradient
  const pageEdgeColor = style?.pageEdgeColor || '#d4c4a8';
  const pageShadow = style?.pageShadow !== false;

  return (
    <div className={`book-layout-container ${className}`}>
      {/* Book wrapper with 3D effect */}
      <div 
        className="book-wrapper relative mx-auto"
        style={{
          perspective: '2000px',
          maxWidth: '1200px',
        }}
      >
        {/* Book spine shadow */}
        <div 
          className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 z-10"
          style={{
            background: `linear-gradient(90deg, 
              rgba(0,0,0,0.3) 0%, 
              rgba(0,0,0,0.1) 30%, 
              rgba(255,255,255,0.1) 50%, 
              rgba(0,0,0,0.1) 70%, 
              rgba(0,0,0,0.3) 100%
            )`,
          }}
        />

        {/* Open book container */}
        <div 
          className="book-pages flex relative"
          style={{
            minHeight: '70vh',
            boxShadow: pageShadow 
              ? '0 20px 60px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.2)' 
              : 'none',
          }}
        >
          {/* Left page (Image) */}
          <div 
            className="left-page relative flex-1 overflow-hidden"
            style={{
              background: pageColor,
              borderRadius: '4px 0 0 4px',
              transform: 'rotateY(2deg)',
              transformOrigin: 'right center',
              boxShadow: pageShadow ? 'inset -20px 0 40px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {/* Page edge effect */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-4"
              style={{
                background: `linear-gradient(90deg, transparent, ${pageEdgeColor})`,
              }}
            />

            {/* Image container */}
            <div className="p-8 h-full flex flex-col">
              {/* Top ornament */}
              {ornamentSvg && (
                <div 
                  className="ornament-top mb-4 opacity-40"
                  style={{ color: accentColor }}
                  dangerouslySetInnerHTML={{ __html: ornamentSvg }}
                />
              )}

              {/* Image */}
              <div className="flex-1 flex items-center justify-center p-4">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={title}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      border: `4px solid ${pageEdgeColor}`,
                    }}
                  />
                ) : (
                  <div 
                    className="w-full h-64 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${pageEdgeColor}40, ${pageEdgeColor}20)`,
                      border: `2px dashed ${pageEdgeColor}`,
                    }}
                  >
                    <span style={{ color: textColor }} className="opacity-40 text-lg">
                      No illustration
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom ornament */}
              {ornamentSvg && (
                <div 
                  className="ornament-bottom mt-4 opacity-40 rotate-180"
                  style={{ color: accentColor }}
                  dangerouslySetInnerHTML={{ __html: ornamentSvg }}
                />
              )}

              {/* Page number */}
              <div 
                className="text-center mt-2 text-sm opacity-50"
                style={{ color: textColor, fontFamily: style?.fontFamily }}
              >
                ❧
              </div>
            </div>
          </div>

          {/* Right page (Text) */}
          <div 
            className="right-page relative flex-1 overflow-hidden"
            style={{
              background: pageColor,
              borderRadius: '0 4px 4px 0',
              transform: 'rotateY(-2deg)',
              transformOrigin: 'left center',
              boxShadow: pageShadow ? 'inset 20px 0 40px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {/* Page edge effect */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-4"
              style={{
                background: `linear-gradient(270deg, transparent, ${pageEdgeColor})`,
              }}
            />

            {/* Text container */}
            <div className="p-8 h-full flex flex-col overflow-y-auto">
              {/* Top ornament */}
              {ornamentSvg && (
                <div 
                  className="ornament-top mb-6 opacity-40"
                  style={{ color: accentColor }}
                  dangerouslySetInnerHTML={{ __html: ornamentSvg }}
                />
              )}

              {/* Title */}
              <h2 
                className="text-3xl font-bold mb-6 text-center"
                style={{ 
                  color: textColor,
                  fontFamily: style?.titleFontFamily || style?.fontFamily,
                  fontSize: style?.titleFontSize || '2rem',
                  fontWeight: style?.titleFontWeight || '700',
                }}
              >
                {title}
              </h2>

              {/* Content */}
              <div 
                className="flex-1 leading-relaxed text-justify"
                style={{ 
                  color: textColor,
                  fontFamily: style?.fontFamily,
                  fontSize: style?.textFontSize || '1.1rem',
                }}
              >
                {content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4 first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Choices */}
              {children && (
                <div className="mt-6 space-y-3">
                  {children}
                </div>
              )}

              {/* Bottom ornament */}
              {ornamentSvg && (
                <div 
                  className="ornament-bottom mt-6 opacity-40 rotate-180"
                  style={{ color: accentColor }}
                  dangerouslySetInnerHTML={{ __html: ornamentSvg }}
                />
              )}

              {/* Page number */}
              <div 
                className="text-center mt-2 text-sm opacity-50"
                style={{ color: textColor, fontFamily: style?.fontFamily }}
              >
                ❧
              </div>
            </div>
          </div>
        </div>

        {/* Book cover edges (decorative) */}
        <div 
          className="absolute -left-2 top-2 bottom-2 w-2 rounded-l"
          style={{ background: accentColor }}
        />
        <div 
          className="absolute -right-2 top-2 bottom-2 w-2 rounded-r"
          style={{ background: accentColor }}
        />
      </div>

      {/* CSS for book animations */}
      <style>{`
        .book-layout-container {
          padding: 2rem;
        }
        
        .book-wrapper {
          transition: transform 0.3s ease;
        }
        
        .book-wrapper:hover {
          transform: scale(1.01);
        }
        
        .left-page, .right-page {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .ornament-top, .ornament-bottom {
          height: 30px;
        }
        
        .ornament-top svg, .ornament-bottom svg {
          width: 100%;
          height: 100%;
        }

        /* First letter drop cap styling */
        .right-page p:first-of-type::first-letter {
          color: ${accentColor};
        }
      `}</style>
    </div>
  );
};

export default BookLayout;
