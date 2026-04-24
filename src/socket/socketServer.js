const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Workspace = require('../models/Workspace');
const { getSystemStats } = require('../services/systemHealthService');

let io = null;
let adminStatsInterval = null;

const socketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      socket.userId = decoded.userId || decoded.sub;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`[Socket] Connected: ${socket.userId}`);

    socket.join(`user:${socket.userId}`);

    socket.on('join-workspace', async ({ workspaceSlug }) => {
      try {
        const workspace = await Workspace.findOne({ slug: workspaceSlug, 'members.userId': socket.userId });
        if (!workspace) {
          socket.emit('error', { message: 'Not a member of this workspace' });
          return;
        }
        socket.join(`ws:${workspace._id}`);
        socket.emit('workspace:joined', { workspaceId: workspace._id, slug: workspaceSlug });
        console.log(`[Socket] ${socket.userId} joined workspace ${workspaceSlug}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to join workspace' });
      }
    });

    socket.on('leave-workspace', ({ workspaceId }) => {
      socket.leave(`ws:${workspaceId}`);
    });

    socket.on('join-admin', async () => {
      if (socket.user.role === 'admin') {
        socket.join('admin');
        console.log(`[Socket] Admin ${socket.userId} joined admin room`);
      } else {
        socket.emit('error', { message: 'Admin access required' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.userId}`);
    });
  });

  adminStatsInterval = setInterval(async () => {
    if (io) {
      try {
        const stats = await getSystemStats();
        io.to('admin').emit('system:stats', stats);
      } catch (err) {
        console.error('[Socket] Stats emit error:', err.message);
      }
    }
  }, 10000);

  return io;
};

const getIO = () => io;

const emitToAdmin = (event, data) => {
  if (io) {
    io.to('admin').emit(event, data);
  }
};

module.exports = { socketServer, getIO, emitToAdmin };