const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/candidate-api',
    createProxyMiddleware({
      target: 'https://api-candidate-ajkpsc.punjab.gov.pk',
      changeOrigin: true,
      pathRewrite: { '^/candidate-api': '' },
      secure: false,
      timeout: 30000,
      proxyTimeout: 30000,
    })
  );
};
