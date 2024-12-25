/*
 This file is responsible for processing the code-runner queue.
    It listens for new jobs and processes them asynchronously.
    When a job is completed, it emits the result to the client through the socket.
    This file is used in conjunction with the runCode utility function.
    The runCode function is responsible for executing the code and streaming the output to the client.
    The code-runner queue is created using the Bull library, which provides a simple interface for creating and processing queues.
    by @ghoshpushpendu 
*/

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

export default codeQueue;
