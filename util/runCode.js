import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const runCode = async (req, res, io) => { // IO stands for soicket IO
    const { code, language, sessionId } = req.body;
    io.to(sessionId).emit('command', { sessionId, command: 'start' });
    res.status(200).send("");
    const languages = {
        javascript: 'js',
        python: 'py',
        java: 'java',
    };

    const extension = languages[language];

    if (!extension) {
        return res.status(400).send({ error: "Language not supported" });
    }

    if (!code) {
        return res.status(400).send({ error: "No code provided" });
    }

    const uniqueId = uuidv4();
    const fileName = `temp-code-${uniqueId}.${extension}`;
    const tempFilePath = path.resolve('./codes', fileName);

    try {
        // Ensure the directory exists
        if (!fs.existsSync('./codes')) {
            fs.mkdirSync('./codes');
        }

        fs.writeFileSync(tempFilePath, code);

        const child = spawn('python3', ['./runners/javascript.py', tempFilePath, language], {
            shell: true,
        });

        // Stream stdout in chunks
        child.stdout.on('data', (chunk) => {
            io.to(sessionId).emit('output', { sessionId, output: chunk.toString() });
        });

        // Stream stderr in chunks
        child.stderr.on('data', (chunk) => {
            io.to(sessionId).emit('output', { sessionId, output: chunk.toString() });
        });

        // Handle process close
        child.on('close', (code) => {
            console.log(`Process exited with code: ${code}`);
            fs.unlinkSync(tempFilePath); // Clean up
            io.to(sessionId).emit('command', { sessionId, command: 'end' });
        });

        // Handle process errors
        child.on('error', (err) => {
            console.error('Child process error:', err.message);
            fs.unlinkSync(tempFilePath); // Clean up
            io.to(sessionId).emit('output', { sessionId, output: err.message });
            io.to(sessionId).emit('command', { sessionId, command: 'end' });
        });
    } catch (err) {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        console.error('Error:', err.message);
        io.to(sessionId).emit('output', { sessionId, output: err.message });
        io.to(sessionId).emit('command', { sessionId, command: 'end' });
    }
};

export default runCode;
