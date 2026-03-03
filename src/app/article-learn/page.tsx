"use client";

import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import ArticleSidebar from '@/components/ArticleSidebar';
import UseCaseSidebar from '@/components/UseCaseSidebar';
import ArticleChat from '@/components/chat/ArticleChat';
import IndustryLogin from '@/components/industry/IndustryLogin';
import { useAuth } from '@/context/AuthContext';

export default function ArticlePage() {
    const { isAuthenticated, user, login, isInitializing } = useAuth();
    const [selectedArticle, setSelectedArticle] = useState<{ _id: string, title: string, category: string, url: string } | null>(null);

    const handleArticleSelect = useCallback((article: any) => {
        setSelectedArticle(article);
    }, []);

    const handleLogin = (userData: any) => {
        login(userData);
    };

    if (isInitializing) {
        return <div className="min-h-screen bg-background flex items-center justify-center" />;
    }

    if (!isAuthenticated) {
        return <IndustryLogin onLogin={handleLogin} />;
    }

    const contextConfig = selectedArticle ? {
        articleTitle: selectedArticle.title,
        articleCategory: selectedArticle.category,
        articleUrl: selectedArticle.url
    } : {};

    return (
        <AppLayout
            currentMode="article"
            sidebarContent={
                <div className="h-full border-b border-border">
                    <ArticleSidebar onSelect={handleArticleSelect} activeArticleId={selectedArticle?._id} />
                </div>
            }
            rightSidebarContent={
                <div className="h-full bg-card/30">
                    <UseCaseSidebar />
                </div>
            }
        >
            <main className="flex-1 overflow-hidden relative pt-16"> {/* Add padding for header */}
                <ArticleChat
                    contextConfig={{
                        articleTitle: selectedArticle?.title,
                        articleUrl: selectedArticle?.url,
                        articleCategory: selectedArticle?.category
                    }}
                />
            </main>
        </AppLayout>
    );
}
