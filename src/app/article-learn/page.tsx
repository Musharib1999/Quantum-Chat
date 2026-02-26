"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import ArticleSidebar from '@/components/ArticleSidebar';
import UseCaseSidebar from '@/components/UseCaseSidebar';
import ArticleChat from '@/components/chat/ArticleChat';

export default function ArticlePage() {
    const [selectedArticle, setSelectedArticle] = useState<{ _id: string, title: string, category: string, url: string } | null>(null);

    const handleArticleSelect = (article: any) => {
        setSelectedArticle(article);
    };

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
