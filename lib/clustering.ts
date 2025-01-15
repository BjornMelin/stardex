// Previous imports remain the same...

async function reduceDimensions(features: tf.Tensor2D): Promise<tf.Tensor2D> {
  const numPoints = features.shape[0];
  
  // For very small datasets, use simpler scaling
  if (numPoints < 3) {
    return tf.tidy(() => {
      const normalized = tf.sub(features, tf.min(features))
        .div(tf.sub(tf.max(features), tf.min(features)).add(tf.scalar(1e-6)));
      return tf.mul(normalized, tf.scalar(2)).sub(tf.scalar(1));
    });
  }

  try {
    // Center and scale the data
    const mean = tf.mean(features, 0);
    const std = tf.sqrt(tf.mean(tf.square(tf.sub(features, mean)), 0));
    const normalized = tf.div(tf.sub(features, mean), std.add(tf.scalar(1e-6)));

    // Calculate pairwise distances
    const squaredDists = tf.tidy(() => {
      const a = tf.sum(tf.square(normalized), 1, true);
      const b = tf.matMul(normalized, normalized.transpose());
      return tf.add(a, tf.transpose(a)).sub(tf.mul(b, 2));
    });

    // Convert distances to probabilities (t-SNE)
    const sigma = tf.scalar(1.0);
    const probs = tf.tidy(() => {
      const negDists = tf.neg(tf.div(squaredDists, tf.mul(sigma, 2)));
      const expDists = tf.exp(negDists);
      const rowSums = tf.sum(expDists, 1, true);
      return tf.div(expDists, rowSums);
    });

    // Initialize low-dimensional representation
    const outputDim = 2;
    let lowDim = tf.randomNormal([numPoints, outputDim]).mul(tf.scalar(0.0001));

    // Gradient descent
    const learningRate = tf.scalar(100);
    const numIterations = Math.min(100, Math.max(50, Math.floor(numPoints * 0.5)));

    for (let i = 0; i < numIterations; i++) {
      tf.tidy(() => {
        const lowDimSquaredDists = tf.tidy(() => {
          const a = tf.sum(tf.square(lowDim), 1, true);
          const b = tf.matMul(lowDim, lowDim.transpose());
          return tf.add(a, tf.transpose(a)).sub(tf.mul(b, 2));
        });

        const lowDimProbs = tf.tidy(() => {
          const negDists = tf.neg(lowDimSquaredDists);
          const expDists = tf.exp(negDists);
          const rowSums = tf.sum(expDists, 1, true);
          return tf.div(expDists, rowSums);
        });

        const gradients = tf.tidy(() => {
          const diff = tf.sub(probs, lowDimProbs);
          return tf.matMul(diff, lowDim).mul(learningRate);
        });

        lowDim = tf.add(lowDim, gradients);
      });
    }

    // Clean up intermediate tensors
    squaredDists.dispose();
    probs.dispose();

    // Normalize final output
    return tf.tidy(() => {
      const minVals = tf.min(lowDim, 0);
      const maxVals = tf.max(lowDim, 0);
      const result = tf.div(tf.sub(lowDim, minVals), tf.sub(maxVals, minVals).add(tf.scalar(1e-6)));
      lowDim.dispose();
      return result;
    });
  } catch (error) {
    console.error('Error in dimensionality reduction:', error);
    // Fallback to simple 2D projection
    return tf.tidy(() => {
      const normalized = tf.sub(features, tf.min(features))
        .div(tf.sub(tf.max(features), tf.min(features)).add(tf.scalar(1e-6)));
      return tf.slice(normalized, [0, 0], [-1, 2]);
    });
  }
}

// Rest of the file remains the same...