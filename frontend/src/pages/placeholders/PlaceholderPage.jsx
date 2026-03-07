import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }) {
    return (
        <Sidebar>
            <div className="space-y-6">
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">{title}</h1>
                <div className="bg-white p-12 rounded-xl shadow-sm border border-zinc-200 text-center">
                    <Construction className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                    <p className="text-zinc-500 text-lg">Esta pagina esta em construcao.</p>
                    <p className="text-zinc-400 text-sm mt-2">Em breve estara disponivel.</p>
                </div>
            </div>
        </Sidebar>
    );
}
