'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import FlowCanvas from '@/components/pipeline-builder/FlowCanvas';
import OptimizationCoach from '@/components/pipeline-builder/OptimizationCoach';
import LeftSidebar from '@/components/pipeline-builder/LeftSidebar';

export default function PipelineBuilderPage() {
  return (
    <AppLayout 
      sidebarContent={<LeftSidebar />}
      rightSidebarContent={<OptimizationCoach />}
      currentMode={"builder" as any}
    >
      <div className="h-full w-full relative bg-background">
        <FlowCanvas />
      </div>
    </AppLayout>
  );
}
