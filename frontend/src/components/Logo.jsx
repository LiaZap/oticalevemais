import React from 'react';
import logo from '../assets/logo_transparent.png'; // Usando a versão transparente por padrão

export const Logo = ({ className = "h-10 w-auto", color = "currentColor" }) => {
    // Se a className tiver w-auto, o browser vai respeitar a proporção da imagem
    return (
        <img 
            src={logo} 
            alt="Ótica Leve Mais" 
            className={className}
            style={{ 
                // Permite tinting da imagem se necessário via filter, mas por enquanto vamos exibir a original 
                // Se precisar de cor dinâmica (branco/vermelho), teríamos que ter duas imagens ou usar CSS filter
                objectFit: 'contain'
            }}
        />
    );
};
