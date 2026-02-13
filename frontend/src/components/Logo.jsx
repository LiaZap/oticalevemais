import React from 'react';

export const Logo = ({ className = "h-10 w-auto", color = "currentColor" }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 300 100" // Adjusted viewBox for the glasses + text layout
            className={className}
            fill={color}
        >
            {/* Glasses Icon */}
            {/* Left Lens */}
            <path d="M40 30 C 20 30, 20 70, 40 70 C 55 70, 60 50, 60 40 C 60 35, 50 30, 40 30 Z M 40 35 C 48 35, 52 40, 52 45 C 52 60, 30 60, 28 45 C 28 40, 32 35, 40 35 Z" />
            {/* Right Lens */}
            <path d="M100 30 C 80 30, 80 70, 100 70 C 115 70, 120 50, 120 40 C 120 35, 110 30, 100 30 Z M 100 35 C 108 35, 112 40, 112 45 C 112 60, 90 60, 88 45 C 88 40, 92 35, 100 35 Z" />
            {/* Bridge */}
            <path d="M60 40 Q 70 30, 80 40" stroke={color} strokeWidth="4" fill="none" />
            {/* Temples (approximate) */}
            <path d="M20 40 L 10 40" stroke={color} strokeWidth="4" />
            <path d="M120 40 L 130 40" stroke={color} strokeWidth="4" />

            {/* Text "Ótica" */}
            <text x="140" y="60" fontFamily="sans-serif" fontWeight="bold" fontSize="35" fill={color}>Ótica</text>
            
            {/* Text "Leve" */}
            <text x="235" y="60" fontFamily="sans-serif" fontWeight="normal" fontSize="35" fill={color}>Leve</text>
            
            {/* Text "+" */}
            <text x="320" y="60" fontFamily="sans-serif" fontWeight="bold" fontSize="35" fill={color}>+</text>

            {/* Swoosh Underline */}
            <path d="M140 70 Q 230 60, 340 75" stroke={color} strokeWidth="3" fill="none" />
        </svg>
    );
};
