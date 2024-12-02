import { spawn } from 'child_process';  // To run the code in a child process
import fs from 'fs';  // To write code to a temporary file
import { v4 as uuidv4 } from 'uuid';  // To create unique file names

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

    // Create a unique file name and save the code to it
    const uniqueId = uuidv4();
    const fileName = `temp-code-${uniqueId}.${extension}`;
    const tempFilePath = `./codes/${fileName}`;

    try {
        // Save the code to the temporary file
        fs.writeFileSync(tempFilePath, code);

        // Choose the correct command to run based on language
        const command = 'python3';
        if (!command) {
            return res.status(400).send({ error: 'Unsupported language' });
        }

        // Set response headers for chunked transfer encoding
        res.setHeader('Content-Type', 'text/plain');
        res.flushHeaders();  // Flush headers immediately

        const runnerScript = "./runners/javascript.py";

        // Run the code using spawn
        const child = spawn(command, [runnerScript, tempFilePath, language], {shell:true});

        // Stream stdout chunks to the client
        child.stdout.on('data', (data) => {
            res.write(data.toString());  // Send output in chunks
        });

        // Stream stderr chunks to the client
        child.stderr.on('data', (data) => {
            res.write(data.toString());  // Send error output in chunks
        });

        // Handle process close
        child.on('close', (code) => {
            // Cleanup the temporary file after execution
            fs.unlinkSync(tempFilePath);

            // Close the response stream
            res.end();
        });

        // Handle errors in spawning the child process
        child.on('error', (err) => {
            fs.unlinkSync(tempFilePath);
            res.status(500).send({ error: err.message });
        });

    } catch (err) {
        console.log(err);

        // Handle errors during file write or other unexpected errors
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        res.status(500).send({ error: err.message });
    }
};

export default runCode;
