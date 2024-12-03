import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const runCode = async (req, res) => {
    const { code, language } = req.body;
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

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        console.log("Starting to run the script...");
        const child = spawn('python3', ['./runners/javascript.py', tempFilePath, language], {
            shell: true,
        });

        // Stream stdout in chunks
        child.stdout.on('data', (chunk) => {
            console.log('stdout chunk:', chunk.toString()); // Debug log
            res.write(chunk.toString());
        });

        // Stream stderr in chunks
        child.stderr.on('data', (chunk) => {
            console.log('stderr chunk:', chunk.toString()); // Debug log
            res.write(`Error: ${chunk.toString()}`);
        });

        // Handle process close
        child.on('close', (code) => {
            console.log(`Process exited with code: ${code}`);
            fs.unlinkSync(tempFilePath); // Clean up
            res.end(); // End the response stream
        });

        // Handle process errors
        child.on('error', (err) => {
            console.error('Child process error:', err.message);
            fs.unlinkSync(tempFilePath); // Clean up
            res.status(500).send({ error: err.message });
        });
    } catch (err) {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        console.error('Error:', err.message);
        res.status(500).send({ error: err.message });
    }
};

export default runCode;
