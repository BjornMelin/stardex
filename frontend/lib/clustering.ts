import * as tf from "@tensorflow/tfjs";
import { GitHubRepo } from "./github";

export interface ClusteredRepo {
  repo: GitHubRepo;
  clusterId: number;
  coordinates: [number, number];
}

export async function clusterRepositories(
  repos: GitHubRepo[]
): Promise<ClusteredRepo[]> {
  // Convert repos to feature vectors
  const features = tf.tensor2d(
    repos.map((repo) => [
      repo.stargazers_count,
      repo.forks_count,
      repo.open_issues_count,
      repo.size,
      repo.watchers_count,
      repo.topics.length,
      repo.language ? 1 : 0,
    ])
  );

  // Reduce dimensions and cluster
  const reduced = await reduceDimensions(features);
  const clustered = tf.tidy(() => {
    const coords = reduced.slice([0, 0], [-1, 2]) as tf.Tensor2D;
    const labels = reduced.slice([0, 2], [-1, 1]) as tf.Tensor2D;
    return { coords, labels };
  });

  // Map results to repositories
  const clusteredRepos = repos.map((repo, i) => ({
    repo,
    clusterId: clustered.labels.arraySync()[i][0],
    coordinates: clustered.coords.arraySync()[i] as [number, number],
  }));

  // Clean up tensors
  features.dispose();
  reduced.dispose();
  clustered.coords.dispose();
  clustered.labels.dispose();

  return clusteredRepos;
}

interface ClusterResult {
  labels: number[];
  corePoints: number[];
}

function dbscan(
  points: tf.Tensor2D,
  eps: number,
  minPts: number
): ClusterResult {
  const numPoints = points.shape[0];
  const labels = new Array(numPoints).fill(-1);
  const corePoints: number[] = [];
  let clusterId = 0;

  // Calculate pairwise distances
  const distances = tf.tidy(() => {
    const a = tf.sum(tf.square(points), 1, true);
    const b = tf.matMul(points, points.transpose());
    return tf.sqrt(tf.add(a, tf.transpose(a)).sub(tf.mul(b, 2))) as tf.Tensor2D;
  });

  // Find neighbors within eps distance
  const neighbors = [];
  for (let i = 0; i < numPoints; i++) {
    const pointNeighbors = [];
    for (let j = 0; j < numPoints; j++) {
      if ((distances.arraySync() as number[][])[i][j] <= eps) {
        pointNeighbors.push(j);
      }
    }
    neighbors.push(pointNeighbors);
  }

  // DBSCAN algorithm
  for (let i = 0; i < numPoints; i++) {
    if (labels[i] !== -1) continue;

    if (neighbors[i].length < minPts) {
      labels[i] = 0; // Noise
      continue;
    }

    clusterId++;
    labels[i] = clusterId;
    corePoints.push(i);

    const seedSet = new Set(neighbors[i]);
    seedSet.delete(i);

    while (seedSet.size > 0) {
      const current = seedSet.values().next().value;
      seedSet.delete(current);

      if (labels[current] === 0) {
        labels[current] = clusterId;
      }

      if (labels[current] !== -1) continue;

      labels[current] = clusterId;

      if (neighbors[current].length >= minPts) {
        neighbors[current].forEach((n) => seedSet.add(n));
      }
    }
  }

  distances.dispose();
  return { labels, corePoints };
}

async function reduceDimensions(features: tf.Tensor2D): Promise<tf.Tensor2D> {
  const numPoints = features.shape[0];

  // For very small datasets, use simpler scaling
  if (numPoints < 3) {
    return tf.tidy(() => {
      const normalized = tf
        .sub(features, tf.min(features))
        .div(tf.sub(tf.max(features), tf.min(features)).add(tf.scalar(1e-6)));
      return tf.mul(normalized, tf.scalar(2)).sub(tf.scalar(1)) as tf.Tensor2D;
    });
  }

  try {
    // Center and scale the data
    const mean = tf.mean(features, 0);
    const std = tf.sqrt(tf.mean(tf.square(tf.sub(features, mean)), 0));
    const normalized = tf.div(
      tf.sub(features, mean),
      std.add(tf.scalar(1e-6))
    ) as tf.Tensor2D;

    // Calculate pairwise distances
    const squaredDists = tf.tidy(() => {
      const a = tf.sum(tf.square(normalized), 1, true);
      const b = tf.matMul(normalized, normalized.transpose());
      return tf.add(a, tf.transpose(a)).sub(tf.mul(b, 2)) as tf.Tensor2D;
    });

    // Convert distances to probabilities (t-SNE)
    const sigma = tf.scalar(1.0);
    const probs = tf.tidy(() => {
      const negDists = tf.neg(tf.div(squaredDists, tf.mul(sigma, 2)));
      const expDists = tf.exp(negDists);
      const rowSums = tf.sum(expDists, 1, true);
      return tf.div(expDists, rowSums) as tf.Tensor2D;
    });

    // Initialize low-dimensional representation
    const outputDim = 2;
    let lowDim = tf
      .randomNormal([numPoints, outputDim])
      .mul(tf.scalar(0.0001)) as tf.Tensor2D;

    // Gradient descent
    const learningRate = tf.scalar(100);
    const numIterations = Math.min(
      100,
      Math.max(50, Math.floor(numPoints * 0.5))
    );

    for (let i = 0; i < numIterations; i++) {
      tf.tidy(() => {
        const lowDimSquaredDists = tf.tidy(() => {
          const a = tf.sum(tf.square(lowDim), 1, true);
          const b = tf.matMul(lowDim, lowDim.transpose());
          return tf.add(a, tf.transpose(a)).sub(tf.mul(b, 2)) as tf.Tensor2D;
        });

        const lowDimProbs = tf.tidy(() => {
          const negDists = tf.neg(lowDimSquaredDists);
          const expDists = tf.exp(negDists);
          const rowSums = tf.sum(expDists, 1, true);
          return tf.div(expDists, rowSums) as tf.Tensor2D;
        });

        const gradients = tf.tidy(() => {
          const diff = tf.sub(probs, lowDimProbs);
          return tf.matMul(diff, lowDim).mul(learningRate) as tf.Tensor2D;
        });

        lowDim = tf.add(lowDim, gradients) as tf.Tensor2D;
      });
    }

    // Clean up intermediate tensors
    squaredDists.dispose();
    probs.dispose();

    // Normalize final output and add cluster labels
    return tf.tidy(() => {
      const minVals = tf.min(lowDim, 0);
      const maxVals = tf.max(lowDim, 0);
      const normalized = tf.div(
        tf.sub(lowDim, minVals),
        tf.sub(maxVals, minVals).add(tf.scalar(1e-6))
      ) as tf.Tensor2D;

      // Apply DBSCAN clustering
      const { labels } = dbscan(normalized, 0.2, 5);

      // Add cluster labels as third dimension
      const labelsTensor = tf.tensor1d(labels).expandDims(1);
      const clustered = tf.concat([normalized, labelsTensor], 1) as tf.Tensor2D;

      lowDim.dispose();
      labelsTensor.dispose();
      return clustered;
    });
  } catch (error) {
    console.error("Error in dimensionality reduction:", error);
    // Fallback to simple 2D projection
    return tf.tidy(() => {
      const normalized = tf
        .sub(features, tf.min(features))
        .div(tf.sub(tf.max(features), tf.min(features)).add(tf.scalar(1e-6)));
      return tf.slice(normalized, [0, 0], [-1, 2]) as tf.Tensor2D;
    });
  }
}
