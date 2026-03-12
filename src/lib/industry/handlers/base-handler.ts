import { IIndustryResult } from '../types';

/**
 * Abstract Base Handler for Industry Problems.
 * Supports both Admin-driven (generic) and Code-driven (specialized) implementations.
 */
export abstract class BaseIndustryHandler {
    constructor(protected config: any) {}

    /**
     * Entry point for interpreting results.
     */
    abstract interpretResults(rawOutput: string, formData: any): Promise<IIndustryResult>;

    /**
     * Fallback for common result normalization.
     */
    protected normalizeCommonFields(row: any): any {
        // Handle common collisions identified in POC (pilot vs ticker)
        const asset = row.ticker || row.pilot || row.asset || 'Item';
        const label = row.sector || row.day || row.period || 'Category';
        
        return {
            ...row,
            ticker: asset,
            pilot: asset,
            asset: asset,
            sector: label,
            day: label
        };
    }
}
