/**
 * Vercel Serverless 入口
 * 把整个 Express app 导出给 Vercel 处理
 */
const app = require('../server.js');

module.exports = app;
