const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'VectorCodeLens',
  description: 'Semantic codebase analysis platform using vector embeddings and LLMs',
  script: path.join(__dirname, 'dist', 'index.js'),
  nodeOptions: [],
  workingDirectory: __dirname,
  allowServiceLogon: true
});

// Listen for the "install" event
svc.on('install', function() {
  svc.start();
  console.log('Service installed and started');
});

// Listen for the "error" event
svc.on('error', function(err) {
  console.error('Service error:', err);
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', function() {
  console.log('Service is already installed. Restarting...');
  svc.start();
});

// Install the service
svc.install();
