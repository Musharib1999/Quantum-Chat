import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuantumProject from '@/models/QuantumProject';
import { resolveSession } from '@/lib/auth';
import { canAccessIde, isDemoRole } from '@/lib/roles';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const identity = await resolveSession(req);

    // If not authenticated, return empty list (guests only see initial templates)
    if (!identity) {
      return NextResponse.json({
        success: true,
        projects: []
      });
    }

    if (!canAccessIde(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — IDE access required.' },
        { status: 403 }
      );
    }

    const projects = await QuantumProject.find({ userEmail: identity.email }).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      readOnly: isDemoRole(identity.role),
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
    const identity = await resolveSession(req);
    if (!identity) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You must be logged in to save projects.' },
        { status: 401 }
      );
    }

    if (!canAccessIde(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — IDE access required.' },
        { status: 403 }
      );
    }

    if (isDemoRole(identity.role)) {
      return NextResponse.json(
        {
          success: false,
          code: 'DEMO_READ_ONLY',
          error: 'Demo accounts are view-only and cannot modify saved projects.',
        },
        { status: 403 }
      );
    }

    const userEmail = identity.email;

    const body = await req.json();
    const { projectId, title, desc, templateKey, framework, activeFile, files, runtimeMetrics, chatMessages } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const updateDoc: any = {
      projectId,
      userEmail,
      title: title || projectId,
      desc: desc || '',
      templateKey: templateKey || 'optimization',
      framework: framework || (templateKey === 'qiskit' ? 'qiskit' : 'dwave'),
      activeFile: activeFile || 'main.py',
      files: files || {},
      runtimeMetrics: runtimeMetrics || {}
    };

    if (chatMessages !== undefined) {
      updateDoc.chatMessages = chatMessages;
    }

    const updatedProject = await QuantumProject.findOneAndUpdate(
      { projectId, userEmail },
      updateDoc,
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

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const identity = await resolveSession(req);
    if (!identity) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You must be logged in to delete projects.' },
        { status: 401 }
      );
    }

    if (!canAccessIde(identity.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — IDE access required.' },
        { status: 403 }
      );
    }

    if (isDemoRole(identity.role)) {
      return NextResponse.json(
        {
          success: false,
          code: 'DEMO_READ_ONLY',
          error: 'Demo accounts are view-only and cannot delete saved projects.',
        },
        { status: 403 }
      );
    }

    const userEmail = identity.email;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    await QuantumProject.deleteOne({ projectId, userEmail });

    return NextResponse.json({
      success: true,
      message: `Project ${projectId} deleted successfully.`
    });
  } catch (error: any) {
    console.error('Error deleting IDE project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
