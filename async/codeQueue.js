import Queue from 'bull';
import runCode from './../util/runCode.js';
import { io } from '../config/socket.config.js';

// Redis connection options
const redisOptions = {
    host: process.env.REDIS_URL || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
};

// Create a Bull queue for running code
const codeQueue = new Queue('code-runner', {
    redis: redisOptions,
});

// Process the queue
codeQueue.process(1, async (job) => {
    try {
        const { code, language, sessionId } = job.data;
        const result = await runCode(code, language, sessionId, io); // Your async task

        return result; // Return the result for further logging/debugging
    } catch (error) {
        console.error('Error processing job:', error);
        throw error;
    }
});

// Handling the completion of jobs and removing them
codeQueue.on('completed', async (job, result) => {
    console.log(`Job completed: ${job.id}`);
    // You can clean up jobs if necessary or log their completion
    await job.remove();  // Optional: This ensures the job is removed after completion
    console.log(`Job removed from queue: ${job.id}`);
});

codeQueue.on('failed', async (job, err) => {
    console.error(`Job failed: ${job.id}, Error: ${err}`);
    // Optionally, you can remove the failed job as well
    await job.remove();  // Optional: This removes failed jobs
    console.log(`Failed job removed from queue: ${job.id}`);
});

export default codeQueue;
