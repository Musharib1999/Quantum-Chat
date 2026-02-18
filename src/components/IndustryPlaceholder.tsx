import React from 'react';

export default function IndustryPlaceholder() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 border border-border">
                <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
            </div>
            <p className="font-medium">Select parameters from the sidebar to begin.</p>
        </div>
    );
}
