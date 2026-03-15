import { BaseIndustryHandler } from './handlers/base-handler';
import { PortfolioOptimizationHandler } from './handlers/finance/portfolio-opt';
import { SchedulingHandler } from './handlers/logistics/scheduling-handler';
import { GenericIndustryHandler } from './handlers/generic-handler';

export class ProblemRegistry {
    private static handlers: Record<string, any> = {
        'portfolio optimization': PortfolioOptimizationHandler,
        'workforce scheduling': SchedulingHandler,
        'transport for london': SchedulingHandler,
        // Add more mappings here as handlers are implemented
    };

    static getHandler(problem: string, config: any): BaseIndustryHandler {
        const HandlerClass = this.handlers[problem.toLowerCase()];
        if (HandlerClass) {
            return new HandlerClass(config);
        }
        return new GenericIndustryHandler(config);
    }
}
