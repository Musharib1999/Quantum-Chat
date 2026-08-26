import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Quantum Circuit Simulation';
    const qubits = searchParams.get('qubits') || '3';
    const depth = searchParams.get('depth') || '12';
    const author = searchParams.get('author') || 'Quantum Analyst';
    const pipeline = searchParams.get('pipeline') || 'Quantum Studio';

    const formattedPipeline = pipeline.charAt(0).toUpperCase() + pipeline.slice(1).toLowerCase();

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #e2e8f0 2px, transparent 0)',
            backgroundSize: '40px 40px',
            color: '#0f172a',
            padding: '48px',
            fontFamily: 'sans-serif',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                QG
              </div>
              <div style={{ display: 'flex', fontSize: '22px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0px' }}>
                QuantumGuru Benchmark
              </div>
            </div>
            <div style={{ display: 'flex', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 16px', borderRadius: '20px' }}>
              Verified Simulation
            </div>
          </div>

          {/* Center Card Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', fontSize: '13px', fontWeight: 'bold', color: '#6366f1', letterSpacing: '0.5px' }}>
              {`${formattedPipeline} Pipeline`}
            </div>
            <div style={{ display: 'flex', fontSize: '38px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, maxWidth: '900px' }}>
              {title}
            </div>
            <div style={{ display: 'flex', fontSize: '17px', color: '#475569', gap: '16px', marginTop: '2px' }}>
              <div style={{ display: 'flex' }}>{`Author: ${author}`}</div>
              <div style={{ display: 'flex', color: '#cbd5e1' }}>•</div>
              <div style={{ display: 'flex', color: '#2563eb', fontWeight: '600' }}>{`${qubits} Qubits`}</div>
              <div style={{ display: 'flex', color: '#cbd5e1' }}>•</div>
              <div style={{ display: 'flex', color: '#059669', fontWeight: '600' }}>{`Depth: ${depth} Gates`}</div>
            </div>
          </div>

          {/* Circuit Visual Schematic Box */}
          <div style={{ display: 'flex', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 24px', width: '100%', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontFamily: 'monospace', fontSize: '19px', color: '#0f172a' }}>
              <div style={{ display: 'flex', color: '#64748b', fontWeight: 'bold' }}>q[0]:</div>
              <div style={{ display: 'flex', backgroundColor: '#dbeafe', border: '1px solid #93c5fd', padding: '6px 14px', borderRadius: '8px', color: '#1e40af', fontWeight: 'bold' }}>H</div>
              <div style={{ display: 'flex', color: '#94a3b8' }}>───</div>
              <div style={{ display: 'flex', backgroundColor: '#ffe4e6', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '8px', color: '#991b1b', fontWeight: 'bold' }}>CX</div>
              <div style={{ display: 'flex', color: '#94a3b8' }}>───</div>
              <div style={{ display: 'flex', backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', padding: '6px 14px', borderRadius: '8px', color: '#6b21a8', fontWeight: 'bold' }}>RZ(π/4)</div>
              <div style={{ display: 'flex', color: '#94a3b8' }}>───</div>
              <div style={{ display: 'flex', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', padding: '6px 14px', borderRadius: '8px', color: '#065f46', fontWeight: 'bold' }}>Measure</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ display: 'flex', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Fidelity Score</div>
              <div style={{ display: 'flex', fontSize: '24px', color: '#059669', fontWeight: 'bold' }}>99.4%</div>
            </div>
          </div>

          {/* Bottom Call-To-Action Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', color: '#0f172a', fontWeight: '600' }}>
              <div style={{ display: 'flex' }}>⚡ Click to Remix & Simulate Live in Browser</div>
            </div>
            <div style={{ display: 'flex', fontSize: '15px', color: '#2563eb', fontWeight: 'bold' }}>
              No Signup Required → qc.guru
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate OpenGraph image: ${e.message}`, { status: 500 });
  }
}
