/**
 * Benchmarking utilities for CodeAnalyzerMCP performance tests
 */
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

/**
 * Performance testing metrics object
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      scanning: {},
      analysis: {},
      storage: {},
      querying: {},
      fullPipeline: {}
    };
    
    this.memorySnapshots = [];
  }
  
  /**
   * Take a memory snapshot
   * @param {string} label - Label for the snapshot
   */
  takeMemorySnapshot(label) {
    this.memorySnapshots.push({
      label,
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage()
    });
  }
  
  /**
   * Measure the execution time of a function
   * @param {Function} fn - Function to measure
   * @param {string} category - Metric category
   * @param {string} label - Metric label
   * @returns {Promise<any>} - Function result
   */
  async measure(fn, category, label) {
    // Take memory snapshot before
    this.takeMemorySnapshot(`${category}-${label}-before`);
    
    // Measure time
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Take memory snapshot after
    this.takeMemorySnapshot(`${category}-${label}-after`);
    
    // Store metric
    if (!this.metrics[category][label]) {
      this.metrics[category][label] = [];
    }
    
    this.metrics[category][label].push(duration);
    
    console.log(`${category} - ${label}: ${duration.toFixed(2)}ms`);
    
    return result;
  }
  
  /**
   * Get average execution time
   * @param {string} category - Metric category
   * @param {string} label - Metric label
   * @returns {number} - Average time
   */
  getAverage(category, label) {
    const measurements = this.metrics[category][label];
    if (!measurements || measurements.length === 0) {
      return 0;
    }
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }
  
  /**
   * Get memory usage increase between snapshots
   * @param {string} beforeLabel - Label for before snapshot
   * @param {string} afterLabel - Label for after snapshot
   * @returns {Object} - Memory increase in bytes
   */
  getMemoryIncrease(beforeLabel, afterLabel) {
    const beforeSnapshot = this.memorySnapshots.find(s => s.label === beforeLabel);
    const afterSnapshot = this.memorySnapshots.find(s => s.label === afterLabel);
    
    if (!beforeSnapshot || !afterSnapshot) {
      return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 };
    }
    
    return {
      rss: afterSnapshot.memory.rss - beforeSnapshot.memory.rss,
      heapTotal: afterSnapshot.memory.heapTotal - beforeSnapshot.memory.heapTotal,
      heapUsed: afterSnapshot.memory.heapUsed - beforeSnapshot.memory.heapUsed,
      external: afterSnapshot.memory.external - beforeSnapshot.memory.external
    };
  }
  
  /**
   * Save metrics to file
   * @param {string} filePath - Path to save metrics
   */
  saveToFile(filePath) {
    const directoryPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    
    // Format results
    const results = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      memorySnapshots: this.memorySnapshots
    };
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    console.log(`Performance metrics saved to: ${filePath}`);
  }
  
  /**
   * Generate HTML report
   * @param {string} filePath - Path to save HTML report
   */
  generateHtmlReport(filePath) {
    const directoryPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    
    // Generate HTML content
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CodeAnalyzerMCP Performance Report</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          h1, h2, h3 { color: #333; }
          .chart-container { height: 400px; margin-bottom: 40px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <h1>CodeAnalyzerMCP Performance Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        
        <h2>Performance Metrics</h2>
    `;
    
    // Add metrics tables
    for (const [category, measurements] of Object.entries(this.metrics)) {
      if (Object.keys(measurements).length === 0) continue;
      
      html += `
        <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
        <table>
          <tr>
            <th>Test Case</th>
            <th>Average Time (ms)</th>
            <th>Min Time (ms)</th>
            <th>Max Time (ms)</th>
          </tr>
      `;
      
      for (const [label, times] of Object.entries(measurements)) {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        html += `
          <tr>
            <td>${label}</td>
            <td>${avg.toFixed(2)}</td>
            <td>${min.toFixed(2)}</td>
            <td>${max.toFixed(2)}</td>
          </tr>
        `;
      }
      
      html += `</table>`;
      
      // Add chart
      html += `
        <div class="chart-container">
          <canvas id="${category}-chart"></canvas>
        </div>
        <script>
          const ${category}Ctx = document.getElementById('${category}-chart').getContext('2d');
          new Chart(${category}Ctx, {
            type: 'bar',
            data: {
              labels: [${Object.keys(measurements).map(label => `'${label}'`).join(', ')}],
              datasets: [{
                label: 'Average Time (ms)',
                data: [${Object.values(measurements).map(times => 
                  (times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(2)
                ).join(', ')}],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Time (ms)'
                  }
                }
              }
            }
          });
        </script>
      `;
    }
    
    // Add memory usage section
    html += `
      <h2>Memory Usage</h2>
      <table>
        <tr>
          <th>Snapshot</th>
          <th>RSS (MB)</th>
          <th>Heap Total (MB)</th>
          <th>Heap Used (MB)</th>
          <th>External (MB)</th>
        </tr>
    `;
    
    for (const snapshot of this.memorySnapshots) {
      html += `
        <tr>
          <td>${snapshot.label}</td>
          <td>${(snapshot.memory.rss / 1024 / 1024).toFixed(2)}</td>
          <td>${(snapshot.memory.heapTotal / 1024 / 1024).toFixed(2)}</td>
          <td>${(snapshot.memory.heapUsed / 1024 / 1024).toFixed(2)}</td>
          <td>${(snapshot.memory.external / 1024 / 1024).toFixed(2)}</td>
        </tr>
      `;
    }
    
    html += `</table>`;
    
    // Add memory chart
    html += `
      <div class="chart-container">
        <canvas id="memory-chart"></canvas>
      </div>
      <script>
        const memoryCtx = document.getElementById('memory-chart').getContext('2d');
        new Chart(memoryCtx, {
          type: 'line',
          data: {
            labels: [${this.memorySnapshots.map(s => `'${s.label}'`).join(', ')}],
            datasets: [{
              label: 'RSS (MB)',
              data: [${this.memorySnapshots.map(s => (s.memory.rss / 1024 / 1024).toFixed(2)).join(', ')}],
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderWidth: 2,
              fill: false
            }, {
              label: 'Heap Used (MB)',
              data: [${this.memorySnapshots.map(s => (s.memory.heapUsed / 1024 / 1024).toFixed(2)).join(', ')}],
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderWidth: 2,
              fill: false
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Memory (MB)'
                }
              }
            }
          }
        });
      </script>
    `;
    
    // Close HTML
    html += `
      </body>
      </html>
    `;
    
    // Write to file
    fs.writeFileSync(filePath, html);
    console.log(`HTML performance report saved to: ${filePath}`);
  }
}

module.exports = {
  PerformanceMetrics
};
