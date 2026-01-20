import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const count = body.count || 10;
        const withFiles = body.withFiles !== false; // Default true

        const scriptPath = path.join(process.cwd(), 'scripts', 'seeder.py');

        // Prepare arguments
        const args = ['seeder.py', '--count', count.toString()];
        if (!withFiles) {
            args.push('--no-files');
        }

        // Prepare environment variables
        // Map NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to what the script expects
        const env = {
            ...process.env,
            SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
            SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
        };

        console.log('Spawning python script:', scriptPath, args);

        // Spawn python process
        // Try 'python3' first, then 'python'
        let pythonCommand = 'python3';

        const child = spawn(pythonCommand, [scriptPath, ...args.slice(1)], {
            env,
            cwd: path.dirname(scriptPath), // Run in scripts dir so it finds things if needed
        });

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            start(controller) {
                child.stdout.on('data', (data) => {
                    controller.enqueue(encoder.encode(data.toString()));
                });

                child.stderr.on('data', (data) => {
                    controller.enqueue(encoder.encode(data.toString()));
                });

                child.on('close', (code) => {
                    controller.enqueue(encoder.encode(`\nProcess exited with code ${code}`));
                    controller.close();
                });

                child.on('error', (err) => {
                    controller.enqueue(encoder.encode(`\nError spawning process: ${err.message}`));
                    controller.close();
                });
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
