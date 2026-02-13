import React from 'react';
import { Sidebar } from '../../components/Sidebar';

export default function PlaceholderPage({ title }) {
    return (
        <div className="flex bg-zinc-50 dark:bg-zinc-950">
            <Sidebar />
            <div className="flex-1 p-8 h-screen overflow-y-auto">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">{title}</h1>
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
                    <p className="text-zinc-500 text-lg">Esta página está em construção.</p>
                </div>
            </div>
        </div>
    );
}
