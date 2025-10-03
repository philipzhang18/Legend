require('dotenv').config();
const redis = require('redis');

// Redis 客户端配置
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// 创建Redis客户端
const redisClient = redis.createClient(redisOptions);

// Redis事件监听
redisClient.on('connect', () => {
  console.log('Redis client connected successfully');
});

let redisErrorLogged = false;
redisClient.on('error', (err) => {
  if (!redisErrorLogged) {
    console.error('Redis client error:', err.message);
    redisErrorLogged = true;
  }
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
  redisErrorLogged = false; // Reset error flag when connection is ready
});

redisClient.on('end', () => {
  console.log('Redis client connection closed');
});

// 内存存储fallback（当Redis不可用时）
const memoryStore = new Map();
let useMemoryStore = true; // 默认使用内存存储，直到Redis连接成功

// 连接Redis
(async () => {
  try {
    await redisClient.connect();
    useMemoryStore = false; // Redis连接成功，切换到Redis
    console.log('Switched from memory storage to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('Using in-memory storage as fallback');
    useMemoryStore = true;
  }
})();

/**
 * Redis缓存服务
 */
class RedisService {
  /**
   * 设置缓存
   */
  static async set(key, value, expireSeconds = 3600) {
    if (useMemoryStore) {
      memoryStore.set(key, { value, expireAt: Date.now() + expireSeconds * 1000 });
      return true;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(key, expireSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * 获取缓存
   */
  static async get(key) {
    if (useMemoryStore) {
      const item = memoryStore.get(key);
      if (!item) return null;
      if (item.expireAt < Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return item.value;
    }

    try {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  static async del(key) {
    if (useMemoryStore) {
      memoryStore.delete(key);
      return true;
    }

    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  }

  /**
   * 检查键是否存在
   */
  static async exists(key) {
    if (useMemoryStore) {
      const item = memoryStore.get(key);
      if (!item) return false;
      if (item.expireAt < Date.now()) {
        memoryStore.delete(key);
        return false;
      }
      return true;
    }

    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * 设置键的过期时间
   */
  static async expire(key, seconds) {
    if (useMemoryStore) {
      const item = memoryStore.get(key);
      if (item) {
        item.expireAt = Date.now() + seconds * 1000;
      }
      return true;
    }

    try {
      await redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error.message);
      return false;
    }
  }

  /**
   * 获取哈希字段
   */
  static async hget(key, field) {
    if (useMemoryStore) {
      const hash = memoryStore.get(key);
      return hash && hash.value ? hash.value[field] : null;
    }

    try {
      const value = await redisClient.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis HGET error:', error.message);
      return null;
    }
  }

  /**
   * 设置哈希字段
   */
  static async hset(key, field, value) {
    if (useMemoryStore) {
      let hash = memoryStore.get(key);
      if (!hash) {
        hash = { value: {}, expireAt: Date.now() + 3600000 };
        memoryStore.set(key, hash);
      }
      hash.value[field] = value;
      return true;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.hSet(key, field, serializedValue);
      return true;
    } catch (error) {
      console.error('Redis HSET error:', error.message);
      return false;
    }
  }

  /**
   * 获取所有哈希字段
   */
  static async hgetall(key) {
    if (useMemoryStore) {
      const hash = memoryStore.get(key);
      return hash && hash.value ? hash.value : {};
    }

    try {
      const result = await redisClient.hGetAll(key);
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        parsed[field] = JSON.parse(value);
      }
      return parsed;
    } catch (error) {
      console.error('Redis HGETALL error:', error.message);
      return {};
    }
  }

  /**
   * 添加到集合
   */
  static async sadd(key, member) {
    if (useMemoryStore) {
      let set = memoryStore.get(key);
      if (!set) {
        set = { value: new Set(), expireAt: Date.now() + 3600000 };
        memoryStore.set(key, set);
      }
      set.value.add(member);
      return true;
    }

    try {
      await redisClient.sAdd(key, member);
      return true;
    } catch (error) {
      console.error('Redis SADD error:', error.message);
      return false;
    }
  }

  /**
   * 从集合中移除
   */
  static async srem(key, member) {
    if (useMemoryStore) {
      const set = memoryStore.get(key);
      if (set && set.value) {
        set.value.delete(member);
      }
      return true;
    }

    try {
      await redisClient.sRem(key, member);
      return true;
    } catch (error) {
      console.error('Redis SREM error:', error.message);
      return false;
    }
  }

  /**
   * 获取集合成员
   */
  static async smembers(key) {
    if (useMemoryStore) {
      const set = memoryStore.get(key);
      return set && set.value ? Array.from(set.value) : [];
    }

    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error.message);
      return [];
    }
  }

  /**
   * 关闭Redis连接
   */
  static async close() {
    if (useMemoryStore) {
      memoryStore.clear();
      console.log('Memory store cleared');
      return;
    }

    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
    }
  }
}

module.exports = {
  redisClient,
  RedisService,
};
