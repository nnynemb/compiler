import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const runCode = async (code, language, sessionId, io) => {
  io.to(sessionId).emit('command', { sessionId, command: 'start' });
  io.to(sessionId).emit('output', { sessionId, output: 'Running the code ...' });

  const languages = {
    javascript: 'js',
    python: 'py',
    java: 'java',
  };

  const extension = languages[language];

  if (!extension) {
    io.to(sessionId).emit('output', { sessionId, output: 'Language is not supported' });
    return; // Exit early if the language is unsupported
  }

  if (!code) {
    io.to(sessionId).emit('output', { sessionId, output: 'No code provided' });
    return; // Exit early if no code is provided
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

    // Wrap the child process in a Promise to track when it's finished
    return new Promise((resolve, reject) => {
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
        fs.unlinkSync(tempFilePath); // Clean up
        io.to(sessionId).emit('command', { sessionId, command: 'end' });
        resolve("done");
      });

      // Handle process errors
      child.on('error', (err) => {
        fs.unlinkSync(tempFilePath); // Clean up
        io.to(sessionId).emit('output', { sessionId, output: err.message });
        io.to(sessionId).emit('command', { sessionId, command: 'end' });
        reject(err);
      });
    });
  } catch (err) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    io.to(sessionId).emit('output', { sessionId, output: err.message });
    io.to(sessionId).emit('command', { sessionId, command: 'end' });
    return "done";
  }
};

export default runCode;
