const mongoose = require('mongoose');

const companyData = `Technology	Apple	AAPL	28	42	12	24
Technology	Microsoft	MSFT	26	38	11	22
Technology	NVIDIA	NVDA	41	239	18	40
Technology	Alphabet	GOOGL	22	58	13	23
Technology	Meta Platforms	META	27	194	15	34
Technology	Adobe	ADBE	24	77	12	26
Technology	Salesforce	CRM	21	98	11	27
Technology	Intel	INTC	9	-16	7	29
Technology	AMD	AMD	36	127	17	38
Technology	Oracle	ORCL	15	51	10	21
Healthcare	Johnson & Johnson	JNJ	9	7	6	14
Healthcare	Pfizer	PFE	8	-41	8	19
Healthcare	AbbVie	ABBV	17	16	9	20
Healthcare	Merck	MRK	14	23	10	18
Healthcare	UnitedHealth	UNH	20	9	11	17
Healthcare	Eli Lilly	LLY	31	59	15	25
Healthcare	Bristol Myers	BMY	10	-8	8	18
Healthcare	Amgen	AMGN	12	5	9	16
Healthcare	Gilead	GILD	11	14	8	18
Healthcare	Regeneron	REGN	19	18	12	22
Finance	JPMorgan Chase	JPM	17	31	9	20
Finance	Bank of America	BAC	15	28	10	23
Finance	Goldman Sachs	GS	14	21	11	24
Finance	Morgan Stanley	MS	16	18	9	21
Finance	Citigroup	C	8	14	8	25
Finance	BlackRock	BLK	18	25	11	22
Finance	Charles Schwab	SCHW	17	16	10	20
Finance	American Express	AXP	20	26	11	23
Finance	Wells Fargo	WFC	10	23	8	24
Finance	U.S. Bancorp	USB	11	12	8	19
Energy	ExxonMobil	XOM	12	16	8	26
Energy	Chevron	CVX	11	14	7	25
Energy	ConocoPhillips	COP	15	24	10	28
Energy	Schlumberger	SLB	13	33	12	31
Energy	Occidental Petroleum	OXY	19	34	11	35
Energy	Marathon Petroleum	MPC	18	29	10	33
Energy	Valero Energy	VLO	16	27	9	30
Energy	Phillips 66	PSX	14	22	8	29
Energy	Kinder Morgan	KMI	9	12	7	21
Energy	EOG Resources	EOG	17	20	9	28
Consumer Discretionary	Amazon	AMZN	21	81	15	30
Consumer Discretionary	Tesla	TSLA	47	102	17	45
Consumer Discretionary	Nike	NKE	15	9	10	23
Consumer Discretionary	Starbucks	SBUX	18	-4	9	24
Consumer Discretionary	McDonald's	MCD	13	10	8	18
Consumer Discretionary	Home Depot	HD	19	12	10	21
Consumer Discretionary	Lowe's	LOW	20	15	11	22
Consumer Discretionary	Booking Holdings	BKNG	22	33	12	27
Consumer Discretionary	Target	TGT	12	-5	8	24
Consumer Discretionary	eBay	EBAY	11	7	8	22
Consumer Staples	Walmart	WMT	14	20	8	18
Consumer Staples	Coca-Cola	KO	10	6	6	15
Consumer Staples	PepsiCo	PEP	11	8	7	16
Consumer Staples	Procter & Gamble	PG	12	9	7	15
Consumer Staples	Costco	COST	18	27	11	20
Consumer Staples	Colgate Palmolive	CL	10	6	7	15
Consumer Staples	Mondelez	MDLZ	11	7	8	17
Consumer Staples	Kimberly Clark	KMB	9	5	6	14
Consumer Staples	General Mills	GIS	8	3	6	14
Consumer Staples	Kraft Heinz	KHC	6	-3	5	18
Industrials	Boeing	BA	7	17	9	34
Industrials	Caterpillar	CAT	18	38	11	24
Industrials	General Electric	GE	14	74	12	29
Industrials	Honeywell	HON	15	12	9	20
Industrials	Lockheed Martin	LMT	13	6	8	18
Industrials	UPS	UPS	12	-9	8	21
Industrials	FedEx	FDX	11	23	9	22
Industrials	Deere	DE	20	28	12	23
Industrials	3M	MMM	7	-10	6	19
Industrials	Northrop Grumman	NOC	15	18	10	21
Telecommunications	AT&T	T	6	2	5	16
Telecommunications	Verizon	VZ	7	-2	6	15
Telecommunications	T-Mobile	TMUS	17	32	11	21
Telecommunications	Comcast	CMCSA	11	8	8	18
Telecommunications	Charter	CHTR	12	-7	8	22
Telecommunications	Vodafone	VOD	5	-4	6	17
Telecommunications	Deutsche Telekom	DTEGY	12	19	9	18
Telecommunications	Orange	ORAN	6	3	6	16
Telecommunications	Telefonica	TEF	5	2	6	17
Telecommunications	BCE	BCE	8	-3	7	16
Utilities	NextEra Energy	NEE	16	-27	10	20
Utilities	Duke Energy	DUK	10	3	7	15
Utilities	Southern Company	SO	9	4	7	15
Utilities	Dominion Energy	D	8	-6	6	16
Utilities	American Electric Power	AEP	10	2	7	15
Utilities	Exelon	EXC	9	5	7	15
Utilities	Xcel Energy	XEL	11	-3	8	16
Utilities	Public Service Enterprise	PEG	10	4	7	15
Utilities	Edison International	EIX	9	-5	7	17
Utilities	Entergy	ETR	8	-1	6	16
Materials	Dow	DOW	9	-12	7	22
Materials	DuPont	DD	10	6	8	23
Materials	Freeport McMoRan	FCX	17	41	11	34
Materials	Newmont	NEM	11	-7	8	28
Materials	Sherwin Williams	SHW	19	12	11	21
Materials	Nucor	NUE	20	35	12	27
Materials	Linde	LIN	16	23	10	20
Materials	Air Products	APD	14	-4	9	21
Materials	Vulcan Materials	VMC	15	8	10	22
Materials	Steel Dynamics	STLD	21	32	12	29`;

async function ingest() {
    const uri = "mongodb+srv://musharibsubhani_db_user:Zq8jSgF42sl88Jcl@cluster0.auezwk2.mongodb.net/?appName=Cluster0";
    try {
        await mongoose.connect(uri);
        const Schema = mongoose.Schema;
        const PortfolioCompany = mongoose.models.PortfolioCompany || mongoose.model('PortfolioCompany', new Schema({
            sector: String,
            company: String,
            ticker: String,
            avgReturn10Y: Number,
            lastYearReturn: Number,
            nextYearReturn: Number,
            risk: Number
        }, { strict: false }));

        const lines = companyData.split('\n');
        const docs = lines.map(line => {
            const [sector, company, ticker, avgReturn10Y, lastYearReturn, nextYearReturn, risk] = line.split('\t');
            return {
                sector,
                company,
                ticker,
                avgReturn10Y: parseFloat(avgReturn10Y),
                lastYearReturn: parseFloat(lastYearReturn),
                nextYearReturn: parseFloat(nextYearReturn),
                risk: parseFloat(risk)
            };
        });

        // Clear existing data
        await PortfolioCompany.deleteMany({});
        const result = await PortfolioCompany.insertMany(docs);
        console.log(`Inserted ${result.length} companies.`);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
}

ingest();
