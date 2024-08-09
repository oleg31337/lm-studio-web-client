// Import required modules using ES6 import syntax
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import session from 'express-session';
import sharedsession from 'express-socket.io-session';
import OpenAI from 'openai';

// Initialize the Express app and HTTP server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

//express session file store init
const FileStore = (await import('session-file-store')).default(session);
const fileStoreOptions = {
    path: path.join(__dirname, 'sessions'),
    ttl: 3600*24*30 // 30 days
};
const fileStore = new FileStore(fileStoreOptions);

// read options from file
const optionsFilePath = process.env.OPTIONS_FILE || path.join(process.env.DATA_PATH || '', 'options.json');
const options = JSON.parse(fs.readFileSync(optionsFilePath));
const historyLength=process.env.HISTORYLEN || options.historyLength || 200;
const baseURL=process.env.BASEURL || options.baseURL || "http://localhost:11434/v1";
const apiKey=process.env.APIKEY || options.apiKey || "not-needed";
const aiModel=process.env.AIMODEL || options.aiModel || "llama3.1:latest";
const temperature=process.env.TEMPERATURE || options.temperature || 0.5;
const maxtokens=process.env.MAXTOKENS || options.maxTokens || 2000;
const systemContentText=process.env.SYSTEMCONTENT || options.systemContent || "You are an intelligent assistant. You always provide well-reasoned answers that are both correct and helpful. You always use Markdown when text needs to be formatted or it is a code snippet. Do not mention that you use Markdown formatting but always use it silently for text output. Be brief, informative and reasonably polite when asked a specific question. Do not repeat yourself if possible.";
const httpPort=process.env.PORT || options.httpPort || 5000;

// Configure session middleware for Express
const sessionMiddleware = session({
    store: fileStore,
    secret: 'my-very-secure-crypto-shrypto-key',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using https
    maxAge: 3600 * 24 * 30 * 1000 // 30 days
});

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({extended: false}));
// Use session middleware for Express
app.use(sessionMiddleware);

// Initialize the OpenAI client
const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    timeout: 60 * 5 * 1000 // 5 min timeout for api reply
});

// System content
const systemContent = {
    role: "system",
    content: systemContentText
};

// Middleware for serving static files (e.g., HTML, CSS, JS)
app.use('/', express.static(path.join(__dirname, 'public'))); // supply local public content (html,css, scripts, etc.)
app.use((err, req, res, next) => {
  //Global endpoint error handler
  //logger.error(err.stack);
  console.error(err);
  return res.status(500).type('text/plain').send('Internal server error!').end;
});

// Route for the chat interface
app.get('/', (req, res) => {
    if (!req.session.history) {
        req.session.history = [systemContent];
        req.session.abort_flag=0
    }
    res.sendFile(path.join(__dirname, 'public/chat.html'));
});

app.get('/get-session-data', (req, res) => {
    const history = req.session.history;
    res.send(history);
});

// Share session middleware with socket.io
io.use(sharedsession(sessionMiddleware, {
    autoSave: true
}));

// Socket.io connection event
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle incoming chat messages
    socket.on('message', async (data) => {
        try {
            if (data.message==null || data.message=='' || data.message=='\n') return socket.emit('response', { message: 'Empty message' });
            let history = socket.handshake.session.history || [systemContent];
            history.push({ role: "user", content: data.message });
            socket.handshake.session.history = history;
            socket.handshake.session.abort_flag=0
            socket.handshake.session.save();
            //console.log(history);
            // Generate response using OpenAI
            const response = await openai.chat.completions.create({
                model: aiModel,
                messages: history,
                stream: true,
                temperature: temperature,
                max_tokens: maxtokens
            });
            var reply_message = {"role": "assistant", "content": ""};
            socket.emit('started_generation');
            for await (const chunk of response) {
                let abortflag = socket.handshake.session.abort_flag
                let message=chunk.choices[0]?.delta?.content;
                socket.emit('response', { message: message });
                reply_message.content += message || '';
                if (abortflag) {
                    response.controller.abort();
                    reply_message.content +="...\nUser aborted completion.";
                    socket.emit('response', { message: "...\nUser aborted completion." });
                    message = null;
                }
                if (message == null){
                    break;
                }
            }
            if (reply_message.content.length >1) history.push(reply_message);
            if (history.length > historyLength) {
                history = history.slice(-1*historyLength);
            }
            socket.handshake.session.history = history;
            socket.handshake.session.save();
            //console.log(history);
            socket.emit('stopped_generation');
        } catch (e) {
            console.error(e);
            socket.emit('response', { message: 'An error occurred' });
        }
    });

    // Handle stop generation event
    socket.on('stop_generation', () => {
        socket.handshake.session.abort_flag=1
        socket.handshake.session.save();
        socket.emit('stopped_generation');
    });

    // Handle clear history event
    socket.on('clear_history', () => {
        socket.handshake.session.history = [systemContent];
        socket.handshake.session.save();
        socket.emit('stopped_generation');
        socket.emit('history_cleared');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(httpPort, () => {
    console.log(`Server running on port ${httpPort}`);
});