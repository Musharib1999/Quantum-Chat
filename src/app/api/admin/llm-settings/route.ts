import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LLMSetting from '@/models/LLMSetting';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        let settings = await LLMSetting.find({}).sort({ isDefault: -1, createdAt: 1 });
        
        // Ensure at least one default exists
        if (settings.length === 0) {
            const defaultSetting = await LLMSetting.create({
                name: "System Default (Gemini)",
                activeProvider: 'gemini',
                activeModel: 'gemini-2.0-flash-lite',
                description: 'The primary system reasoning engine and fallback generator.',
                isDefault: true
            });
            settings = [defaultSetting];
        }
        
        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch LLM settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    try {
        const body = await req.json();
        const { _id, name, activeProvider, activeModel, description, isDefault } = body;

        let result;

        if (isDefault) {
            // Unset current default
            await LLMSetting.updateMany({}, { isDefault: false });
        }

        if (_id) {
            // Update existing
            result = await LLMSetting.findByIdAndUpdate(_id, {
                name,
                activeProvider,
                activeModel,
                description,
                isDefault,
                updatedAt: new Date()
            }, { new: true });
        } else {
            // Create new
            result = await LLMSetting.create({
                name,
                activeProvider,
                activeModel,
                description,
                isDefault: isDefault || false
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("API Update Error:", error);
        return NextResponse.json({ error: 'Failed to save LLM settings' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const setting = await LLMSetting.findById(id);
        if (!setting) return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
        
        if (setting.isDefault) {
            return NextResponse.json({ error: 'Cannot delete the default LLM setting' }, { status: 400 });
        }

        await LLMSetting.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete LLM setting' }, { status: 500 });
    }
}
