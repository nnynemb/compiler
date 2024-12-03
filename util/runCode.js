import { spawn } from 'child_process'; 
import fs from 'fs'; 
import path from 'path'; 
import { v4 as uuidv4 } from 'uuid'; 

const runCode = async (req, res) => {
    const { code, language } = req.body;
    const languages = {
        javascript: 'js',
        python: 'py',
        java: 'java'
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

        // Run the Python script
        const command = 'python3';
        const runnerScript = path.resolve('./runners/javascript.py');

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.flushHeaders();

        console.log("Starting to run the script...");
        const child = spawn(command, [runnerScript, tempFilePath, language], { shell: true });

        // Stream stdout
        child.stdout.on('data', (chunk) => {
            console.log('stdout chunk:', chunk.toString()); // Debug log
            res.write(chunk.toString()); // Send chunks to the client
        });

        // Stream stderr (error stream)
        child.stderr.on('data', (chunk) => {
            console.log('stderr chunk:', chunk.toString()); // Debug log
            res.write(`Error: ${chunk.toString()}`); // Send errors as chunks
        });

        child.on('close', (code) => {
            fs.unlinkSync(tempFilePath); // Clean up
            res.end(); // End the stream
        });

        child.on('error', (err) => {
            fs.unlinkSync(tempFilePath); // Clean up on error
            res.status(500).send({ error: err.message });
        });
    } catch (err) {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        res.status(500).send({ error: err.message });
    }
};

export default runCode;
