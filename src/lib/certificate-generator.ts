import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateCertificate = async (data: {
    userName: string;
    courseName: string;
    date: string;
}) => {
    // Create a hidden div for the certificate design
    const certElement = document.createElement('div');
    certElement.style.width = '1200px';
    certElement.style.height = '840px';
    certElement.style.position = 'fixed';
    certElement.style.left = '-9999px';
    certElement.style.top = '0';
    certElement.style.backgroundColor = '#ffffff';
    certElement.style.fontFamily = "'Inter', sans-serif";
    certElement.style.padding = '60px';
    certElement.style.boxSizing = 'border-box';
    certElement.style.overflow = 'hidden';

    certElement.innerHTML = `
        <div style="width: 100%; height: 100%; border: 20px solid #f8fafc; position: relative; padding: 40px; box-sizing: border-box; background: radial-gradient(circle at 50% 50%, #fff 0%, #f1f5f9 100%);">
            <!-- Decorative Corners -->
            <div style="position: absolute; top: 0; left: 0; width: 100px; height: 100px; border-top: 10px solid #3066bb; border-left: 10px solid #3066bb;"></div>
            <div style="position: absolute; top: 0; right: 0; width: 100px; height: 100px; border-top: 10px solid #3066bb; border-right: 10px solid #3066bb;"></div>
            <div style="position: absolute; bottom: 0; left: 0; width: 100px; height: 100px; border-bottom: 10px solid #3066bb; border-left: 10px solid #3066bb;"></div>
            <div style="position: absolute; bottom: 0; right: 0; width: 100px; height: 100px; border-bottom: 10px solid #3066bb; border-right: 10px solid #3066bb;"></div>

            <!-- Content -->
            <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div style="margin-bottom: 30px;">
                    <div style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px;">
                        <span style="color: #3066bb;">QUANTUM</span>GURU
                    </div>
                </div>
                
                <h3 style="text-transform: uppercase; letter-spacing: 5px; color: #64748b; font-size: 16px; font-weight: 800; margin-bottom: 10px;">Certificate of Completion</h3>
                <div style="width: 100px; height: 2px; background: #3066bb; margin-bottom: 40px;"></div>
                
                <p style="font-size: 24px; color: #334155; margin-bottom: 10px;">This is to certify that</p>
                <h1 style="font-size: 64px; font-weight: 900; color: #0f172a; margin: 20px 0; font-family: 'Times New Roman', serif;">${data.userName}</h1>
                <p style="font-size: 24px; color: #334155; margin-bottom: 10px;">has successfully completed the course</p>
                <h2 style="font-size: 42px; font-weight: 800; color: #3066bb; margin: 20px 0;">${data.courseName}</h2>
                
                <div style="margin-top: 60px; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 100px;">
                    <div style="text-align: center;">
                        <div style="width: 200px; border-bottom: 1px solid #cbd5e1; margin-bottom: 10px;"></div>
                        <p style="font-size: 14px; font-weight: bold; color: #0f172a;">ISSUED ON</p>
                        <p style="font-size: 12px; color: #64748b;">${data.date}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-family: 'Dancing Script', cursive; font-size: 24px; color: #0f172a; margin-bottom: -5px;">Alan Turing</div>
                        <div style="width: 200px; border-bottom: 1px solid #cbd5e1; margin-bottom: 10px;"></div>
                        <p style="font-size: 14px; font-weight: bold; color: #0f172a;">DR. ALAN TURING</p>
                        <p style="font-size: 12px; color: #64748b;">Director, Quantum Academy</p>
                    </div>
                </div>

                <!-- Seal -->
                <div style="position: absolute; bottom: 40px; right: 40px; width: 120px; height: 120px; border-radius: 50%; border: 4px double #3066bb; display: flex; items-center; justify-content: center; text-align: center; color: #3066bb; transform: rotate(-15deg); font-weight: 900; font-size: 10px; flex-direction: column; background: white;">
                    <span style="font-size: 12px;">OFFICIAL</span>
                    <span style="font-size: 14px;">CERTIFIED</span>
                    <span style="font-size: 10px;">QUANTUM GURU</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(certElement);

    try {
        const canvas = await html2canvas(certElement, {
            scale: 2, // High resolution
            useCORS: true,
            backgroundColor: null
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1200, 840]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, 1200, 840);
        pdf.save(`Certificate_${data.courseName.replace(/\s+/g, '_')}_${data.userName.replace(/\s+/g, '_')}.pdf`);
    } finally {
        document.body.removeChild(certElement);
    }
};
