import swaggerJSDoc from 'swagger-jsdoc';

const spec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BikeSafe Vancouver API',
      version: '1.0.0',
      description: 'CMPT 372 Final Project - API for routes, hazards, reviews, user data, and bike sharing data.'
    },
    servers: [{url: '/', description: 'Current server'}],
  },

  apis: ['./routes/*.ts', './dist/routes/*.js'],
});

export default spec;