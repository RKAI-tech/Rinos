import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class FriendlyReporter implements Reporter {
    private currentStepTitle: string | null = null;
    
    onStepBegin(test, result, step) {
        if (step.category === 'test.step') {
            this.currentStepTitle = step.title;
        }
    }
    
    onStepEnd(test, result, step) {
        if (step.category === 'test.step') {
            console.log(`${step.title}: ${step.error ? '❌ Failed' : '✅ Passed'}`);
            this.currentStepTitle = null;
            if (step.error) {
                console.error(`**Reason:** ${step.error.message}`);
            }
        }
    }
    
    // onStdOut(chunk: string | Buffer, test?: TestCase, result?: TestResult) {
    //     const message = chunk.toString('utf-8').trim();
    //     if (message) {
    //         // Format log với step context nếu có
    //         if (this.currentStepTitle) {
    //             console.log(`- ${this.currentStepTitle}: Passed`);
    //         } else {
    //             console.log(`- ${message}`);
    //         }
    //     }
    // }
    
    onStdErr(chunk: string | Buffer, test?: TestCase, result?: TestResult) {
        const message = chunk.toString('utf-8').trim();
        if (message) {
            // Format error log với step context nếu có
            if (this.currentStepTitle) {
                console.error(`   ⚠️ [${this.currentStepTitle}] ${message}`);
            } else {
                console.error(`   ⚠️ ${message}`);
            }
        }
    }
    
    onTestEnd(test: TestCase, result: TestResult) {
        switch (result.status) {
            case 'passed':
                console.log(` **✅ All steps passed**`)
                console.log(` **Execution time:** ${result.duration}ms\n`);
                break;
            case 'timedOut':
                console.log(` **⏰ Timed Out**`);
                console.log(` **Execution time:** ${result.duration}ms\n`);
                break;
            case 'skipped':
                console.log(` **⏭️ Skipped**\n`);
                break;
            case 'interrupted':
                console.log(` **⚠️ Interrupted**\n`);
                break;
        }
    }
}

export default FriendlyReporter;
