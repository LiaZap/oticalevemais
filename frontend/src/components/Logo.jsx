import React from 'react';

export const Logo = ({ className = "h-10 w-auto", color = "currentColor" }) => {
    return (
        <svg 
            version="1.1" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 800 600"
            className={className}
            fill={color}
        >
            {/* Background Removed for Transparency */}
            {/* <rect width="100%" height="100%" fill="#990000" /> */}
            
            <g transform="translate(100, 200) scale(0.8)">
                <path d="M50,50 Q50,0 100,0 L200,0 Q250,0 250,50 L250,150 Q250,200 200,200 L100,200 Q50,200 50,150 Z M80,50 L80,150 Q80,170 100,170 L200,170 Q220,170 220,150 L220,50 Q220,30 200,30 L100,30 Q80,30 80,50 Z" />
                
                <rect x="250" y="80" width="40" height="20" />
                <rect x="300" y="0" width="10" height="250" /> 
                
                <text x="330" y="80" fontFamily="Futura, Century Gothic, sans-serif" fontSize="60" fontWeight="300">Óticas</text>
                
                <text x="330" y="180" fontFamily="Arial Black, Gadget, sans-serif" fontSize="90" fontWeight="900">LEVE+</text>
            </g>
        </svg>
    );
};
