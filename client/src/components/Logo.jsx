import React from 'react';
import logoImg from '../assets/carelume-logo.png';

export default function Logo({ size = 36, className = '', showText = false, textVariant = 'full' }) {
  return (
    <div className={`carelume-brand-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={logoImg}
        alt="CareLume Logo"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: '10px',
          flexShrink: 0,
          display: 'block'
        }}
      />
      {showText && (
        <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#134e48', letterSpacing: '-0.02em', lineHeight: 1 }}>
          CareLume <span style={{ color: '#d97736', fontWeight: 800 }}>AI</span>
        </span>
      )}
    </div>
  );
}

