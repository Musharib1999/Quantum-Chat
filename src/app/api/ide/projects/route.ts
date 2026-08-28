import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumProject from '@/models/QuantumProject';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('email') || 'ms@qc.guru';

    const projects = await QuantumProject.find({ userEmail }).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      projects: projects || []
    });
  } catch (error: any) {
    console.error('Error fetching IDE projects:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { projectId, userEmail = 'ms@qc.guru', title, desc, templateKey, activeFile, files, runtimeMetrics, chatMessages } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const updatedProject = await QuantumProject.findOneAndUpdate(
      { projectId },
      {
        projectId,
        userEmail,
        title: title || projectId,
        desc: desc || '',
        templateKey: templateKey || 'optimization',
        activeFile: activeFile || 'main.py',
        files: files || {},
        runtimeMetrics: runtimeMetrics || {},
        chatMessages: chatMessages || []
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      project: updatedProject
    });
  } catch (error: any) {
    console.error('Error saving IDE project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save project' },
      { status: 500 }
    );
  }
}
