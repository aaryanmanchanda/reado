const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const allowedOrigins = [
  "https://www.reado.co.in",
  "https://reado.co.in",
  "https://d3543ik91lsun2.cloudfront.net",
  "http://localhost:3000"
];

let totalRequests = 0;
let totalErrors = 0;
let totalLatency = 0;

let activeRequests = 0;
const MAX_CONCURRENT = 20;

// Metrics measure start
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now()-start;
    totalRequests++;
    totalLatency += duration;

    if (res.statusCode >= 500){
        totalErrors++;
    }
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// CORS middleware at the very top, with explicit config for dev
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors()); // Explicitly handle preflight requests
app.use(express.json());


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Request timeout manager
app.use((req, res, next) => {
	const timeoutMs = 3000;
	let finished = false;

	const timer = setTimeout( () =>{
		if (!res.headersSent){
			finished = true;
			res.status(503).json({ error: 'request timeout' });
		}
	}, timeoutMs);
	
	res.on('finish', () => {finished=true;clearTimeout(timer);});
	req.timedout = () => finished;
	next();
});

// Concurrency control
app.use((req, res, next) => {
	if (activeRequests>= MAX_CONCURRENT) {
		return res.status(503).json({error:'server busy'});
	}
	activeRequests++;

	res.on('finish', () => {
		activeRequests--;
	});
	next();
});

// Example route
app.get('/', (req, res) => {
  res.send('API is running');
});

// CORS test route
app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const { authGoogle, authGoogleCallback } = require('./routes/authGoogle');

// OAuth routes mounted on app directly so /users/auth/google is always matched
app.get('/users/auth/google', authGoogle);
app.get('/users/auth/google/callback', authGoogleCallback);

// Route for health checks
app.get('/health', (req,res) => {
	const dbState = mongoose.connection.readyState;

	if (dbState === 1) {
		res.status(200).json({
		  status: 'ok',
		  db : 'connected'
		});
	}
	else {
		res.status(503).json({
		  status: 'degraded',
		  db: 'not connected'
		});
	}
});

// Metrics endpoint
app.get('/metrics', (req,res) => {
    const avgLatency = totalRequests === 0 ? 0 : (totalLatency / totalRequests).toFixed(2);
    const errorRate = totalRequests === 0 ? 0 : (totalErrors / totalRequests).toFixed(4);
    res.type('text/plain');
    res.send(
        `requests_total ${totalRequests}
    errors_total ${totalErrors}
    avg_latency_ms ${avgLatency}
    error_rate ${errorRate}
`
        );
});

// Temporary failure simulation
app.get('/fail', () =>{
	res.status(500).json({error:'simulated failure'});
});

// Temporary slow response simulation
app.get('/slow', async (req, res) => {
  const controller = new AbortController();
  const signal = controller.signal;

  // if request finished → cancel work
  res.on('close', () => controller.abort());

  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 10000);

      signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new Error('aborted'));
      });
    });

    if (!res.headersSent) {
      res.json({ done: true });
    }
  } catch {
    // cancelled → do nothing
  }
});


app.use('/comments', commentRoutes);
app.use('/users', userRoutes);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.maxConnections = 25;
server.headersTimeout  = 5000;
server.requestTimeout = 5000;
server.keepAliveTimeout = 3000;
