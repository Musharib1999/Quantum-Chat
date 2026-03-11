/**
 * Converts qubit count to human-readable state space complexity.
 * Example: 50 qubits -> "1.12 Quadrillion"
 */
export function getQuantumStateSpaceName(qubits: number): string {
    if (qubits <= 0) return "1";
    if (qubits === 1) return "2";
    
    // Log base conversion (log10(2^n) = n * 0.30103)
    const log10Value = qubits * Math.log10(2);
    const powerOfTen = Math.floor(log10Value);
    const mantissa = Math.pow(10, log10Value - powerOfTen);
    
    // Names update every 10^3 (Thousand, Million, etc.)
    const names = [
        "", "Thousand", "Million", "Billion", "Trillion", 
        "Quadrillion", "Quintillion", "Sextillion", "Septillion", 
        "Octillion", "Nonillion", "Decillion", "Undecillion",
        "Duodecillion", "Tredecillion", "Quattuordecillion", "Quindecillion",
        "Sexdecillion", "Septendecillion", "Octodecillion", "Novemdecillion",
        "Vigintillion"
    ];
    
    const finalName = "Centillion"; 
    const centillionPower = 303; // 10^303

    const index = Math.floor(powerOfTen / 3);
    
    if (index < names.length) {
        const scaleAdjustedValue = mantissa * Math.pow(10, powerOfTen % 3);
        return `${scaleAdjustedValue.toFixed(2)} ${names[index]}`.trim();
    } else if (powerOfTen < centillionPower) {
        return `${mantissa.toFixed(2)} × 10^${powerOfTen}`;
    } else {
        const overflowPower = powerOfTen - centillionPower;
        const multiplier = mantissa * Math.pow(10, overflowPower);
        
        const multiplierStr = multiplier > 1000 
            ? multiplier.toExponential(2) 
            : multiplier.toFixed(2);
            
        return `${multiplierStr} ${finalName}`;
    }
}
