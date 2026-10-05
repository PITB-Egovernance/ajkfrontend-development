const path = require('path');

// react-scripts 5 still configures webpack-dev-server with the deprecated
// onBeforeSetupMiddleware / onAfterSetupMiddleware hooks, which prints deprecation warnings on
// every `npm start`. Run the same hooks through the supported `setupMiddlewares` option instead:
// "before" hooks register on the app first, "after" hooks are appended to the end of the chain.
const withSetupMiddlewares = (devServerConfig) => {
  const { onBeforeSetupMiddleware, onAfterSetupMiddleware, ...config } = devServerConfig;

  return {
    ...config,
    setupMiddlewares: (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) onBeforeSetupMiddleware(devServer);
      if (onAfterSetupMiddleware) {
        onAfterSetupMiddleware({ ...devServer, app: { use: (middleware) => middlewares.push(middleware) } });
      }
      return middlewares;
    },
  };
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devServer: withSetupMiddlewares,
};
