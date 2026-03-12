/**
 * Core interface for problem result rows.
 * This ensures the frontend table always has a consistent vocabulary.
 */
export interface IProblemAssignment {
    asset: string;      // The primary item (Ticker, Pilot, Route)
    label: string;      // Categorization (Sector, Day, Period)
    value: string;      // Qualitative result (Assigned, Risk Level)
    metric?: number;    // Quantitative result (Return, Probability)
    raw?: any;          // Escape hatch for custom/exotic fields
}

/**
 * The standardized payload sent from the backend to the IndustryChat UI.
 */
export interface IIndustryResult {
    text: string;
    assignmentsTable: any[]; // Kept as any[] for legacy support during migration
    portfolioMetrics?: {
        avgReturn: number;
        avgRisk: number;
        assetsCount: number;
        sectorsCount: number;
        universeSize: number;
        qubitCount: number;
    };
    chartData?: any;
    qubitCount: number;
}
