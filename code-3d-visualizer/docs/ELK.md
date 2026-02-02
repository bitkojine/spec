# ELK Stack Production Log Aggregation

This document describes the ELK (Elasticsearch, Logstash, Kibana) stack integration for Code 3D Visualizer production log aggregation.

## Overview

The ELK stack provides enterprise-grade log aggregation, search, and visualization capabilities:

- **Elasticsearch**: Distributed search and analytics engine for log storage
- **Logstash**: Data processing pipeline that ingests logs from multiple sources
- **Kibana**: Web interface for searching, analyzing, and visualizing log data

## Architecture

```
Code 3D Visualizer → ELK Transport → Logstash → Elasticsearch → Kibana
                      (UDP/5000)      (Process)    (Store)    (Visualize)
```

### Components

1. **ELK Transport** (`scripts/elk-transport.mjs`)
   - Sends structured logs to Logstash via UDP
   - Provides fallback to local files
   - Enriches logs with transport metadata

2. **Logstash Configuration** (`elk/logstash/config/logstash.conf`)
   - Receives logs on port 5000 (UDP/TCP)
   - Parses and enriches Code 3D Visualizer logs
   - Routes to Elasticsearch with proper indexing

3. **Docker Compose** (`docker-compose.elk.yml`)
   - Complete ELK stack deployment
   - Proper networking and volume configuration
   - Development-optimized resource settings

## Quick Start

### 1. Start ELK Stack

```bash
# Start all ELK services
npm run elk:start

# Check status
npm run elk:status

# Setup Kibana dashboards
npm run elk:setup
```

### 2. Send Logs to ELK

```bash
# Run tests with ELK transport
npm run test:elk

# Or pipe any command output
your-command 2>&1 | node scripts/elk-transport.mjs
```

### 3. Access Kibana

Open **http://localhost:5601** in your browser:

1. Go to **Discover** tab
2. Create index pattern: `code-visualizer-logs-*`
3. Select time field: `@timestamp`
4. Start exploring your logs!

## ELK Stack Services

### Elasticsearch (http://localhost:9200)
- **Purpose**: Log storage and full-text search
- **API**: RESTful JSON API
- **Indices**: `code-visualizer-logs-YYYY.MM.dd`

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# Search logs
curl -X GET "localhost:9200/code-visualizer-logs-*/_search?pretty"
```

### Logstash (localhost:5000)
- **Purpose**: Log processing and transformation
- **Input**: UDP/TCP on port 5000
- **Filters**: Parses Code 3D Visualizer log format
- **Output**: Elasticsearch with proper indexing

### Kibana (http://localhost:5601)
- **Purpose**: Log visualization and analysis
- **Features**: Dashboards, visualizations, alerts
- **Access**: Web interface with authentication disabled (dev)

## Log Processing Pipeline

### Input Format
```json
{
  "timestamp": "2026-02-02T18:30:45.123Z",
  "level": "INFO",
  "service": "ExtensionHost",
  "message": "Workspace scan completed",
  "context": {
    "fileCount": 150,
    "duration": 2500
  }
}
```

### Enriched Output
```json
{
  "@timestamp": "2026-02-02T18:30:45.123Z",
  "level": "INFO",
  "service": "ExtensionHost",
  "message": "Workspace scan completed",
  "application": "code-3d-visualizer",
  "context": {
    "fileCount": 150,
    "duration": 2500
  },
  "performance_duration": 2500,
  "tags": ["performance"],
  "transport": {
    "timestamp": "2026-02-02T18:30:45.124Z",
    "source": "code-3d-visualizer-elk-transport",
    "version": "1.0.0"
  }
}
```

## Kibana Dashboards

### Recommended Visualizations

1. **Log Levels Over Time**
   - Visualization: Bar chart
   - X-axis: @timestamp (histogram)
   - Y-axis: Count
   - Split series: level.keyword

2. **Service Performance**
   - Visualization: Line chart
   - X-axis: @timestamp
   - Y-axis: Average of performance_duration
   - Filter: tags: "performance"

3. **Error Rate**
   - Visualization: Metric
   - Value: Count
   - Filter: level: "ERROR" OR level: "FATAL"

4. **Top Error Messages**
   - Visualization: Data table
   - Columns: message, count
   - Filter: level: "ERROR"

### Dashboard Queries

```json
// Find all errors in the last hour
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"terms": {"level": ["ERROR", "FATAL"]}}
      ]
    }
  }
}

// Performance analysis
{
  "query": {
    "bool": {
      "must": [
        {"term": {"tags": "performance"}},
        {"range": {"performance_duration": {"gte": 1000}}}
      ]
    }
  }
}
```

## Production Configuration

### Security (Production Only)
```yaml
# docker-compose.prod.yml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true
```

### Scaling
```yaml
# Multi-node Elasticsearch
elasticsearch:
  replicas: 3
  
# Logstash scaling
logstash:
  replicas: 2
  
# Kibana load balancing
kibana:
  replicas: 2
```

### Monitoring
```bash
# Elasticsearch metrics
curl http://localhost:9200/_nodes/stats

# Logstash pipeline stats
curl http://localhost:9600/_node/stats/pipelines

# Kibana status
curl http://localhost:5601/api/status
```

## Troubleshooting

### Common Issues

1. **Logs not appearing in Kibana**
   - Check ELK stack status: `npm run elk:status`
   - Verify Logstash is receiving: `npm run elk:logs`
   - Check index pattern: `code-visualizer-logs-*`

2. **High memory usage**
   - Reduce JVM heap size in docker-compose.yml
   - Add more Elasticsearch nodes
   - Implement index lifecycle management

3. **Slow queries**
   - Add index mappings for frequently searched fields
   - Use time-based indices
   - Implement index templates

### Debug Commands

```bash
# Check what's being sent to Logstash
echo '{"test": "message"}' | node scripts/elk-transport.mjs

# Verify Elasticsearch indices
curl http://localhost:9200/_cat/indices

# Check Logstash pipeline
curl http://localhost:9600/_node/stats/pipelines?pretty
```

## Scripts Reference

| Script | Purpose | Example |
|--------|---------|---------|
| `npm run elk:start` | Start ELK stack | `npm run elk:start` |
| `npm run elk:stop` | Stop ELK stack | `npm run elk:stop` |
| `npm run elk:status` | Check services | `npm run elk:status` |
| `npm run elk:setup` | Setup Kibana | `npm run elk:setup` |
| `npm run test:elk` | Test with ELK | `npm run test:elk` |

## Integration with CI/CD

```yaml
# .github/workflows/elk.yml
- name: Start ELK Stack
  run: npm run elk:start
  
- name: Run Tests with ELK
  run: npm run test:elk
  
- name: Analyze Logs
  run: |
    curl -s "http://localhost:9200/code-visualizer-logs-*/_search" \
      -H "Content-Type: application/json" \
      -d '{"query":{"term":{"level":"ERROR"}}}'
```

This ELK stack integration provides enterprise-grade log aggregation, search, and visualization capabilities for production environments, making it easy to monitor, debug, and analyze Code 3D Visualizer behavior at scale.
