#!/bin/bash

# ELK Stack Management Script for Code 3D Visualizer
# Usage: ./scripts/elk.sh [start|stop|status|logs|setup]

set -e

ELK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ELK_DIR/docker-compose.elk.yml"

case "$1" in
    start)
        echo "🚀 Starting ELK Stack..."
        docker-compose -f "$COMPOSE_FILE" up -d
        
        echo "⏳ Waiting for services to be ready..."
        sleep 30
        
        echo "🔍 Checking service health..."
        if curl -s http://localhost:9200/_cluster/health > /dev/null; then
            echo "✅ Elasticsearch is healthy"
        else
            echo "❌ Elasticsearch is not ready"
            exit 1
        fi
        
        if curl -s http://localhost:5601/api/status > /dev/null; then
            echo "✅ Kibana is ready"
        else
            echo "⏳ Kibana is still starting..."
        fi
        
        echo ""
        echo "🎯 ELK Stack is running!"
        echo "📊 Kibana Dashboard: http://localhost:5601"
        echo "🔍 Elasticsearch API: http://localhost:9200"
        echo "📡 Logstash Receiver: localhost:5000"
        ;;
        
    stop)
        echo "🛑 Stopping ELK Stack..."
        docker-compose -f "$COMPOSE_FILE" down
        echo "✅ ELK Stack stopped"
        ;;
        
    status)
        echo "📊 ELK Stack Status:"
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
        
    logs)
        echo "📋 ELK Stack Logs:"
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
        
    setup)
        echo "🔧 Setting up ELK Stack indices and patterns..."
        
        # Wait for Elasticsearch to be ready
        echo "⏳ Waiting for Elasticsearch..."
        until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
            echo "Waiting for Elasticsearch..."
            sleep 5
        done
        
        # Create index patterns for Kibana
        echo "📈 Creating Kibana index patterns..."
        
        # Logs pattern
        curl -X POST "localhost:5601/api/saved_objects/index-pattern/logs-pattern" \
            -H "kbn-xsrf: true" \
            -H "Content-Type: application/json" \
            -d '{
                "attributes": {
                    "title": "code-visualizer-logs-*",
                    "timeFieldName": "@timestamp"
                }
            }' || echo "⚠️  Logs index pattern creation failed"

        # Perf pattern
        curl -X POST "localhost:5601/api/saved_objects/index-pattern/perf-pattern" \
            -H "kbn-xsrf: true" \
            -H "Content-Type: application/json" \
            -d '{
                "attributes": {
                    "title": "code-visualizer-perf-*",
                    "timeFieldName": "@timestamp"
                }
            }' || echo "⚠️  Perf index pattern creation failed"
        
        # Dashboard Import
        if [ -f "$ELK_DIR/elk/kibana/dashboards/performance.ndjson" ]; then
            echo "📊 Importing Performance Dashboard..."
            curl -X POST "localhost:5601/api/saved_objects/_import?overwrite=true" \
                -H "kbn-xsrf: true" \
                --form "file=@$ELK_DIR/elk/kibana/dashboards/performance.ndjson" || echo "⚠️  Dashboard import failed"
        fi
        
        echo "✅ ELK Stack setup complete!"
        echo "📊 Open Kibana: http://localhost:5601"
        echo "🔍 Go to Discover -> Create index pattern: code-visualizer-logs-* and code-visualizer-perf-*"
        ;;
        
    *)
        echo "Usage: $0 {start|stop|status|logs|setup}"
        echo ""
        echo "Commands:"
        echo "  start  - Start ELK stack services"
        echo "  stop   - Stop ELK stack services"
        echo "  status - Show service status"
        echo "  logs   - Follow service logs"
        echo "  setup  - Setup Kibana dashboards and patterns"
        exit 1
        ;;
esac
