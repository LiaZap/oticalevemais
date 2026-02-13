import React from 'react';
import { cn } from '../lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export function KPICard({ 
    title, 
    value, 
    icon: Icon, 
    className, 
    description,
    trend, // 'up', 'down', 'neutral'
    trendValue, 
    loading = false,
    variant = 'default', // 'default', 'danger', 'warning', 'success'
    onClick
}) {
    
    if (loading) {
        return (
            <div className={cn("bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse", className)}>
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
                <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
        );
    }

    const variants = {
        default: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
        danger: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30",
        warning: "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30",
        success: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30",
    };

    const trendColors = {
        up: "text-emerald-600 dark:text-emerald-400",
        down: "text-red-600 dark:text-red-400",
        neutral: "text-zinc-500",
    };

    return (
        <div 
            onClick={onClick}
            className={cn(
                "rounded-xl p-4 md:p-6 shadow-sm border transition-all duration-200", 
                variants[variant] || variants.default,
                onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
                className
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
                {Icon && <Icon className={cn("h-5 w-5 text-zinc-400", variant === 'danger' && "text-red-400")} />}
            </div>
            
            <div className="flex items-end gap-2">
                <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
                {trend && trendValue && (
                    <div className={cn("flex items-center text-xs font-medium mb-1", trendColors[trend])}>
                        {trend === 'up' && <ArrowUp className="h-3 w-3 mr-0.5" />}
                        {trend === 'down' && <ArrowDown className="h-3 w-3 mr-0.5" />}
                        {trend === 'neutral' && <Minus className="h-3 w-3 mr-0.5" />}
                        {trendValue}
                    </div>
                )}
            </div>

            {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{description}</p>
            )}
        </div>
    );
}
