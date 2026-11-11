import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import '../../src/models/User.js';
import '../../src/models/Category.js';
import '../../src/models/Product.js';
import '../../src/models/Order.js';
import '../../src/models/RefreshToken.js';
import '../../src/models/WebhookEvent.js';

export async function startDatabase() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri('nook_test'));
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return {
    async clear(...names) {
      const models = names.length ? names.map((name) => mongoose.models[name]) : Object.values(mongoose.models);
      await Promise.all(models.map((model) => model.deleteMany({})));
    },
    async stop() {
      await mongoose.disconnect();
      await replSet.stop();
    }
  };
}
