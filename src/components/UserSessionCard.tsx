import React from 'react';

export default function UserSessionCard() {
    return (
        <div className="p-4 border-b border-border bg-card/30">
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-secondary/50 border border-border">
                <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-foreground text-xs">GS</div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-foreground truncate">Guest Session</p>
                    <p className="text-[10px] text-muted-foreground truncate">Trial Plan Active</p>
                </div>
            </div>
        </div>
    );
}
