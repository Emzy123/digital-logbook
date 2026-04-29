const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/students/profile',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' // wait I need a valid token.
  }
};
