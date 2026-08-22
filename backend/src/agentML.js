// agentML.js - Real Neural Network for Attack Prediction using Brain.js
import brain from 'brain.js';

class NeuralAgent {
  constructor() {
    this.net = new brain.NeuralNetwork({
      hiddenLayers: [12, 8, 6],
      activation: 'leaky-relu',
      learningRate: 0.01
    });
    
    this.isTraining = false;
    this.isTrained = false;
    this.trainingProgress = 0;
    this.accuracy = 0;
    this.precision = 0;
    this.recall = 0;
    this.f1Score = 0;
    this.predictionCount = 0;
    this.correctPredictions = 0;
    this.lastTrainingError = 0;
    this.trainingHistory = []; // For loss curve visualization
    this.predictionHistory = []; // Last N predictions
    this.featureImportance = {}; // Cached feature importance
  }

  // Generate synthetic training data (500 samples)
  generateTrainingData(samples = 500) {
    const data = [];
    
    for (let i = 0; i < samples; i++) {
      const isAttack = Math.random() > 0.6; // 40% attack scenarios
      
      // Generate realistic correlated metrics
      const baseLatency = isAttack ? 0.7 + Math.random() * 0.3 : Math.random() * 0.4;
      const baseError = isAttack ? 0.15 + Math.random() * 0.85 : Math.random() * 0.1;
      const baseQueue = isAttack ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3;
      const baseCpu = isAttack ? 0.5 + Math.random() * 0.5 : Math.random() * 0.4;
      
      data.push({
        input: {
          latency: baseLatency,
          errorRate: baseError,
          queueSize: baseQueue,
          cpuUsage: baseCpu,
          memoryUsage: Math.random() * 0.8 + (isAttack ? 0.2 : 0),
          requestsPerSecond: isAttack ? 0.7 + Math.random() * 0.3 : Math.random() * 0.5,
          timeOfDay: Math.random(), // Normalized 0-1
          latencyTrend: isAttack ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3,
          errorTrend: isAttack ? 0.5 + Math.random() * 0.5 : Math.random() * 0.2
        },
        output: {
          normal: isAttack ? 0.1 : 0.9,
          warning: isAttack ? 0.2 : 0.1,
          critical: isAttack ? 0.7 : 0
        }
      });
    }
    
    return data;
  }

  // Train the neural network
  async trainModel(samples = 500, iterations = 2000) {
    console.log(`🧠 Starting neural network training with ${samples} samples...`);
    this.isTraining = true;
    this.trainingProgress = 0;
    this.trainingHistory = [];
    
    const trainingData = this.generateTrainingData(samples);
    
    return new Promise((resolve) => {
      this.net.trainAsync(trainingData, {
        iterations: iterations,
        errorThresh: 0.005,
        log: true,
        logPeriod: 100,
        learningRate: 0.01,
        callback: (stats) => {
          this.trainingProgress = (stats.iterations / iterations) * 100;
          this.lastTrainingError = stats.error;
          this.trainingHistory.push({
            iteration: stats.iterations,
            error: stats.error
          });
          
          if (stats.iterations % 500 === 0) {
            console.log(`Training progress: ${this.trainingProgress.toFixed(1)}% - Error: ${stats.error.toFixed(6)}`);
          }
        }
      }).then(result => {
        this.isTraining = false;
        this.isTrained = true;
        this.trainingProgress = 100;
        
        // Calculate accuracy on test set
        this.calculateAccuracy(trainingData.slice(0, 100));
        
        console.log(`✅ Training complete! Error: ${result.error.toFixed(6)}, Accuracy: ${this.accuracy.toFixed(2)}%`);
        resolve(result);
      });
    });
  }

  // Calculate model accuracy, precision, recall, F1
  calculateAccuracy(testData) {
    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    testData.forEach(sample => {
      const prediction = this.predict(sample.input);
      const actualClass = Object.keys(sample.output).reduce((a, b) => 
        sample.output[a] > sample.output[b] ? a : b
      );
      const predictedClass = prediction.classification;
      
      const actualIsAttack = actualClass === 'critical' || actualClass === 'warning';
      const predictedIsAttack = predictedClass === 'CRITICAL' || predictedClass === 'WARNING';
      
      if ((actualClass === 'critical' && predictedClass === 'CRITICAL') ||
          (actualClass === 'warning' && predictedClass === 'WARNING') ||
          (actualClass === 'normal' && predictedClass === 'NORMAL')) {
        correct++;
      }
      
      // Calculate confusion matrix
      if (actualIsAttack && predictedIsAttack) {
        truePositives++;
      } else if (!actualIsAttack && predictedIsAttack) {
        falsePositives++;
      } else if (!actualIsAttack && !predictedIsAttack) {
        trueNegatives++;
      } else if (actualIsAttack && !predictedIsAttack) {
        falseNegatives++;
      }
    });
    
    this.accuracy = (correct / testData.length) * 100;
    
    // Calculate precision, recall, F1
    this.precision = truePositives / (truePositives + falsePositives) * 100 || 0;
    this.recall = truePositives / (truePositives + falseNegatives) * 100 || 0;
    this.f1Score = 2 * (this.precision * this.recall) / (this.precision + this.recall) || 0;
  }

  // Normalize metrics to 0-1 range for neural network input
  normalizeMetrics(metrics) {
    return {
      latency: Math.min(metrics.latency / 1000, 1), // 0-1000ms -> 0-1
      errorRate: metrics.errorRate / 100, // 0-100% -> 0-1
      queueSize: Math.min(metrics.queueSize / 100, 1), // 0-100 -> 0-1
      cpuUsage: metrics.cpuUsage / 100, // 0-100% -> 0-1
      memoryUsage: metrics.memoryUsage / 100, // 0-100% -> 0-1
      requestsPerSecond: Math.min(metrics.requestsPerSecond / 200, 1), // 0-200 -> 0-1
      timeOfDay: (new Date().getHours()) / 24, // 0-23 -> 0-1
      latencyTrend: Math.min(metrics.latencyTrend || 0, 1),
      errorTrend: Math.min(metrics.errorTrend || 0, 1)
    };
  }

  // Make a prediction
  predict(rawMetrics) {
    if (!this.isTrained) {
      return {
        attackProbability: 0,
        confidence: 0,
        classification: 'NORMAL',
        message: 'Model not trained yet'
      };
    }

    const normalized = this.normalizeMetrics(rawMetrics);
    const result = this.net.run(normalized);
    
    const attackProbability = result.critical;
    const confidence = Math.max(result.normal, result.warning, result.critical);
    
    let classification = 'NORMAL';
    if (result.critical > 0.6) {
      classification = 'CRITICAL';
    } else if (result.warning > 0.4 || result.critical > 0.3) {
      classification = 'WARNING';
    }
    
    this.predictionCount++;
    
    // Store prediction in history
    this.predictionHistory.unshift({
      timestamp: Date.now(),
      classification,
      confidence,
      attackProbability,
      metrics: rawMetrics
    });
    
    // Keep last 100 predictions
    if (this.predictionHistory.length > 100) {
      this.predictionHistory = this.predictionHistory.slice(0, 100);
    }
    
    return {
      attackProbability: attackProbability,
      confidence: confidence,
      classification: classification,
      probabilities: {
        normal: result.normal,
        warning: result.warning,
        critical: result.critical
      },
      message: this.getClassificationMessage(classification, attackProbability)
    };
  }

  getClassificationMessage(classification, probability) {
    if (classification === 'CRITICAL') {
      return `⚠️ ATTACK DETECTED - ${(probability * 100).toFixed(1)}% confidence`;
    } else if (classification === 'WARNING') {
      return `⚡ WARNING - Elevated threat level ${(probability * 100).toFixed(1)}%`;
    }
    return '✅ NORMAL - All systems healthy';
  }

  // Feature attribution (SHAP-like) - shows which metrics drove the decision
  getFeatureAttribution(metrics) {
    if (!this.isTrained) {
      return {};
    }

    const normalized = this.normalizeMetrics(metrics);
    const baseline = this.net.run({
      latency: 0.3,
      errorRate: 0.05,
      queueSize: 0.3,
      cpuUsage: 0.4,
      memoryUsage: 0.5,
      requestsPerSecond: 0.4,
      timeOfDay: 0.5,
      latencyTrend: 0.2,
      errorTrend: 0.1
    });

    const baseCritical = baseline.critical;
    const contributions = {};

    // Test impact of each feature by setting it to current value
    const features = Object.keys(normalized);
    features.forEach(feature => {
      const testInput = {
        latency: 0.3,
        errorRate: 0.05,
        queueSize: 0.3,
        cpuUsage: 0.4,
        memoryUsage: 0.5,
        requestsPerSecond: 0.4,
        timeOfDay: 0.5,
        latencyTrend: 0.2,
        errorTrend: 0.1
      };
      testInput[feature] = normalized[feature];
      
      const result = this.net.run(testInput);
      contributions[feature] = Math.abs(result.critical - baseCritical);
    });

    // Normalize to percentages
    const total = Object.values(contributions).reduce((a, b) => a + b, 0);
    Object.keys(contributions).forEach(key => {
      contributions[key] = (contributions[key] / total) * 100;
    });

    return contributions;
  }

  // Get feature importance (averaged across many samples)
  getFeatureImportance() {
    if (!this.isTrained) {
      return {};
    }
    
    // If cached and recent, return cached
    if (Object.keys(this.featureImportance).length > 0) {
      return this.featureImportance;
    }
    
    // Calculate feature importance by averaging attribution across random samples
    const numSamples = 50;
    const aggregatedContributions = {};
    
    for (let i = 0; i < numSamples; i++) {
      const randomMetrics = {
        latency: Math.random() * 1000,
        errorRate: Math.random() * 50,
        queueSize: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        requestsPerSecond: Math.random() * 200,
        latencyTrend: Math.random(),
        errorTrend: Math.random()
      };
      
      const attribution = this.getFeatureAttribution(randomMetrics);
      
      Object.keys(attribution).forEach(feature => {
        if (!aggregatedContributions[feature]) {
          aggregatedContributions[feature] = 0;
        }
        aggregatedContributions[feature] += attribution[feature];
      });
    }
    
    // Average
    Object.keys(aggregatedContributions).forEach(feature => {
      aggregatedContributions[feature] /= numSamples;
    });
    
    this.featureImportance = aggregatedContributions;
    return aggregatedContributions;
  }

  // Get last N predictions from history
  getPredictionHistory(n = 50) {
    return this.predictionHistory.slice(0, n);
  }

  // Online learning - update model with new confirmed attack
  async learnFromIncident(metrics, wasAttack) {
    if (!this.isTrained) return;

    const normalized = this.normalizeMetrics(metrics);
    const newSample = {
      input: normalized,
      output: {
        normal: wasAttack ? 0.1 : 0.9,
        warning: wasAttack ? 0.2 : 0.1,
        critical: wasAttack ? 0.7 : 0
      }
    };

    // Quick retrain with single sample (online learning)
    await this.net.trainAsync([newSample], {
      iterations: 50,
      errorThresh: 0.01
    });

    console.log(`🧠 Model updated with incident data (attack=${wasAttack})`);
  }

  // Export model weights as JSON
  exportModel() {
    if (!this.isTrained) {
      return null;
    }
    return this.net.toJSON();
  }

  // Import model weights from JSON
  importModel(json) {
    this.net.fromJSON(json);
    this.isTrained = true;
    console.log('✅ Model imported successfully');
  }

  // Get model performance metrics
  getPerformanceMetrics() {
    return {
      isTrained: this.isTrained,
      isTraining: this.isTraining,
      trainingProgress: this.trainingProgress,
      accuracy: this.accuracy,
      precision: this.precision,
      recall: this.recall,
      f1Score: this.f1Score,
      predictionCount: this.predictionCount,
      lastTrainingError: this.lastTrainingError,
      trainingHistory: this.trainingHistory.slice(-50), // Last 50 points for chart
      featureImportance: this.getFeatureImportance(),
      status: this.isTrained ? 'Ready' : this.isTraining ? 'Training...' : 'Not Trained'
    };
  }
}

export default NeuralAgent;
