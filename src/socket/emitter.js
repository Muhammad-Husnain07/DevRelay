const { getIO } = require('./socketServer');

let emitter = null;

const getEmitter = () => {
  if (emitter) return emitter;

  emitter = {
    emitToWorkspace: (workspaceId, event, data) => {
      const io = getIO();
      if (io) {
        io.to(`ws:${workspaceId}`).emit(event, data);
      }
    },

    emitToUser: (userId, event, data) => {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit(event, data);
      }
    },

    emitSystemAlert: (workspaceId, type, message) => {
      const io = getIO();
      if (io) {
        io.to(`ws:${workspaceId}`).emit('system:alert', { type, message, timestamp: new Date().toISOString() });
      }
    },

    emitToAll: (event, data) => {
      const io = getIO();
      if (io) {
        io.emit(event, data);
      }
    }
  };

  return emitter;
};

module.exports = { getEmitter };