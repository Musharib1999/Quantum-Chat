"use client";

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ChatInterface from '@/components/ChatInterface';
import ArticleSidebar from '@/components/ArticleSidebar';

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
                <div className="h-full">
                    <ArticleSidebar onSelect={handleArticleSelect} activeArticleId={selectedArticle?._id} />
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
