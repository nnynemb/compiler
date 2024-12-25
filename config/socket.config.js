// socket.js
import { Server as SocketIoServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

// Redis connection options
const redisHost = process.env.REDIS_URL || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || '';

const pubClient = new Redis({ host: redisHost, port: redisPort, password: redisPassword });
const subClient = pubClient.duplicate();

// Handle Redis errors
pubClient.on('error', (err) => console.error('Redis Publisher Error:', err));
subClient.on('error', (err) => console.error('Redis Subscriber Error:', err));

let io; // Declare the Socket.IO instance

export const initializeSocket = (server) => {
    io = new SocketIoServer(server, {
        cors: {
            origin: '*', // Allow all origins
            methods: ['GET', 'POST'], // Allowed HTTP methods
            allowedHeaders: ['Content-Type'], // Optional: allowed headers
            credentials: false, // Set to true if authentication (cookies, etc.) is needed
        },
    });

    // Attach Redis Adapter to Socket.IO
    io.adapter(createAdapter(pubClient, subClient));

    // Handle Socket.IO connections
    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);

        // Listen for any event from the client
        socket.onAny((event, ...args) => {
            if (event === 'joinRoom') {
                const room = args[0];
                socket.join(room); // Join the room
            } else {
                const { language, code, ...others } = args[0];
                const data = { id: event, channel: event, language, content: code, senderSocketId: socket.id, ...others };
                sendSocketMessage(event, event, data);
            }
        });

        socket.on('disconnect', () => {
            socket.leaveAll(); // Leave all rooms
            console.log('Socket disconnected:', socket.id);
        });
    });

    function sendSocketMessage(room, channel, data) {
        io.to(room).emit(channel, data);
    }

    return io;
};

export { io }; // Export the Socket.IO instance for use in other files
