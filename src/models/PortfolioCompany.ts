import mongoose, { Schema, Document } from 'mongoose';

export interface IPortfolioCompany extends Document {
    sector: string;
    company: string;
    ticker: string;
    avgReturn10Y: number;
    lastYearReturn: number;
    nextYearReturn: number;
    risk: number;
    createdAt: Date;
}

const PortfolioCompanySchema = new Schema<IPortfolioCompany>({
    sector: { type: String, required: true },
    company: { type: String, required: true },
    ticker: { type: String, required: true, unique: true },
    avgReturn10Y: { type: Number, required: true },
    lastYearReturn: { type: Number, required: true },
    nextYearReturn: { type: Number, required: true },
    risk: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PortfolioCompany || mongoose.model<IPortfolioCompany>('PortfolioCompany', PortfolioCompanySchema);
